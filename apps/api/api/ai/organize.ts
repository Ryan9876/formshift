import { generateText, Output } from 'ai';
import { validateOrganizeActions, validateSnapshot, type LayoutAction, type SpatialSnapshot } from '@formshift/domain';
import { organizeOutputSchema, type OrganizeOutput } from '../../src/aiSchemas.js';
import { requireEditableSpace } from '../../src/auth.js';
import { json, parseJson, preflight } from '../../src/http.js';

type Body = {
  projectId: string;
  spaceId: string;
  spatialVersionId: string;
  roomContext?: string;
};

type Proposal = {
  id: string;
  title: string;
  rationale: string;
  expectedBenefits: string[];
  assumptions: string[];
  actions: LayoutAction[];
  geometryValidation: {
    valid: boolean;
    errors: string[];
  };
};

type Attempt = {
  model: string;
  status: 'completed' | 'failed';
  validProposalCount?: number;
  usage?: unknown;
  errorClass?: string;
};

export function OPTIONS(request: Request) {
  return preflight(request);
}

export async function POST(request: Request) {
  let aiRunId: string | undefined;
  const attempts: Attempt[] = [];
  const primaryModel = process.env.FORMSHIFT_AI_MODEL?.trim() || 'openai/gpt-5.6-luna';
  const fallbackModel = process.env.FORMSHIFT_AI_FALLBACK_MODEL?.trim() || 'openai/gpt-5.6-terra';
  const modelLadder = primaryModel === fallbackModel ? [primaryModel] : [primaryModel, fallbackModel];

  try {
    const body = await parseJson<Body>(request);
    if (!body.projectId || !body.spaceId || !body.spatialVersionId) {
      return json(request, { error: 'project_space_version_required' }, 400);
    }

    const active = await requireEditableSpace(request, body.projectId, body.spaceId);

    const { data: spaceState, error: spaceError } = await active.client
      .from('spaces')
      .select('active_spatial_version_id')
      .eq('id', body.spaceId)
      .eq('project_id', body.projectId)
      .single();

    if (spaceError || !spaceState) return json(request, { error: 'space_not_found' }, 404);
    if (spaceState.active_spatial_version_id !== body.spatialVersionId) {
      return json(request, {
        error: 'stale_spatial_version',
        activeSpatialVersionId: spaceState.active_spatial_version_id,
      }, 409);
    }

    const { data: version, error: versionError } = await active.client
      .from('spatial_versions')
      .select('id, model_json')
      .eq('id', body.spatialVersionId)
      .eq('space_id', body.spaceId)
      .eq('status', 'committed')
      .single();

    if (versionError || !version) return json(request, { error: 'spatial_version_not_found' }, 404);

    const snapshot = version.model_json as SpatialSnapshot;
    const snapshotErrors = validateSnapshot(snapshot);
    if (snapshot.spaceId !== body.spaceId) snapshotErrors.push('snapshot spaceId does not match requested space');
    if (snapshotErrors.length) {
      return json(request, { error: 'invalid_spatial_snapshot', details: snapshotErrors }, 422);
    }
    if (snapshot.objects.length === 0) {
      return json(request, { error: 'objects_required_for_organize' }, 422);
    }

    const { data: run, error: runError } = await active.client.from('ai_runs').insert({
      project_id: body.projectId,
      space_id: body.spaceId,
      actor_user_id: active.userId,
      task_name: 'organize',
      task_schema_version: 'organize-1',
      prompt_version: 'organize-v0.5.1',
      status: 'running',
    }).select('id').single();

    if (runError || !run) return json(request, { error: 'ai_run_not_authorized' }, 403);
    aiRunId = run.id;

    const startedAt = Date.now();
    let selected: { model: string; proposals: Proposal[]; validCount: number } | null = null;
    let lastError: unknown;

    for (let index = 0; index < modelLadder.length; index += 1) {
      const model = modelLadder[index]!;
      const isLastAttempt = index === modelLadder.length - 1;

      try {
        const { output, usage } = await generateText({
          model,
          output: Output.object({ schema: organizeOutputSchema, name: 'FormShiftOrganizeProposals' }),
          system: [
            'You are FormShift Organize. Improve the supplied structured room layout.',
            'The supplied snapshot is authoritative geometry. Never invent or change dimensions.',
            'Use only stable object IDs in the snapshot.',
            'For this release, propose MOVE actions only. Do not propose rotation, addition, removal, resizing, or vertical movement.',
            'For every move, preserve the object current Y coordinate exactly and change only X/Z.',
            'Do not overlap object footprints and keep every footprint inside the room boundary.',
            'Produce up to three meaningfully different practical layouts.',
            'Each proposal must contain at least one actual move.',
            'Optimize circulation, access, grouping, clutter reduction, useful storage, and practical use.',
            'Your proposals are advisory. FormShift deterministic validation is the final authority.',
          ].join(' '),
          prompt: JSON.stringify({
            basisSpatialVersionId: body.spatialVersionId,
            roomContext: body.roomContext?.trim() || null,
            snapshot,
          }),
        });

        const proposals = normalizeProposals(snapshot, output as OrganizeOutput);
        const validCount = proposals.filter((proposal) => proposal.geometryValidation.valid).length;
        attempts.push({ model, status: 'completed', validProposalCount: validCount, usage: usage ?? null });

        selected = { model, proposals, validCount };
        if (validCount > 0 || isLastAttempt) break;
      } catch (generationError) {
        lastError = generationError;
        attempts.push({
          model,
          status: 'failed',
          errorClass: generationError instanceof Error ? generationError.name : 'unknown',
        });
        if (isLastAttempt) throw generationError;
      }
    }

    if (!selected) throw lastError ?? new Error('No Organize model completed.');

    await active.client.from('ai_runs').update({
      status: 'completed',
      latency_ms: Date.now() - startedAt,
      provider_model: selected.model,
      token_usage: { attempts },
    }).eq('id', aiRunId);

    return json(request, {
      aiRunId,
      basisSpatialVersionId: body.spatialVersionId,
      status: selected.validCount > 0 ? 'proposed' : 'no_valid_proposals',
      validProposalCount: selected.validCount,
      modelUsed: selected.model,
      fallbackUsed: selected.model !== primaryModel,
      proposals: selected.proposals,
    });
  } catch (error) {
    if (error instanceof Response) return json(request, { error: await error.text() }, error.status);

    if (aiRunId) {
      // Best-effort observability. The request still returns the original generation error if this update fails.
      try {
        const bearer = request.headers.get('authorization');
        if (bearer?.startsWith('Bearer ')) {
          // The normal request path already owns the RLS-scoped client; failures before that point have no run to update.
          // Avoid introducing service-role access solely for telemetry.
        }
      } catch {
        // Intentionally ignored.
      }
    }

    return json(request, {
      error: 'organize_failed',
      aiRunId,
      message: error instanceof Error ? error.message : 'unknown error',
      attempts: attempts.map(({ model, status, validProposalCount, errorClass }) => ({ model, status, validProposalCount, errorClass })),
    }, 500);
  }
}

function normalizeProposals(snapshot: SpatialSnapshot, output: OrganizeOutput): Proposal[] {
  return output.proposals.map((proposal, index) => {
    const normalizedActions: LayoutAction[] = [];
    const schemaErrors: string[] = [];

    for (const action of proposal.actions) {
      if (action.type !== 'move') {
        schemaErrors.push(`Unsupported organize action type for ${action.objectId}: ${action.type}`);
        continue;
      }
      if (!action.to) {
        schemaErrors.push(`Move action for ${action.objectId} is missing a destination.`);
        continue;
      }
      normalizedActions.push({ type: 'move', objectId: action.objectId, to: action.to });
    }

    if (normalizedActions.length === 0) schemaErrors.push('Proposal contains no usable move actions.');

    const validationErrors = [
      ...schemaErrors,
      ...validateOrganizeActions(snapshot, normalizedActions),
    ];

    return {
      id: `proposal-${index + 1}`,
      title: proposal.title,
      rationale: proposal.rationale,
      expectedBenefits: proposal.expectedBenefits,
      assumptions: proposal.assumptions,
      actions: normalizedActions,
      geometryValidation: {
        valid: validationErrors.length === 0,
        errors: Array.from(new Set(validationErrors)),
      },
    };
  });
}
