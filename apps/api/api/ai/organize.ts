import { generateText, Output } from 'ai';
import { validateLayoutActions, validateSnapshot, type LayoutAction, type SpatialSnapshot } from '@formshift/domain';
import { organizeOutputSchema, type OrganizeOutput } from '../../src/aiSchemas.js';
import { requireEditableSpace } from '../../src/auth.js';
import { json, parseJson, preflight } from '../../src/http.js';
import { requireServerEnv } from '../../src/env.js';

type Body = { projectId: string; spaceId: string; snapshot: SpatialSnapshot; roomContext?: string };
export function OPTIONS(request: Request) { return preflight(request); }

export async function POST(request: Request) {
  let aiRunId: string | undefined;
  try {
    const body = await parseJson<Body>(request);
    if (!body.projectId || !body.spaceId || !body.snapshot) return json(request, { error: 'project_space_snapshot_required' }, 400);
    const active = await requireEditableSpace(request, body.projectId, body.spaceId);
    const errors = validateSnapshot(body.snapshot);
    if (errors.length) return json(request, { error: 'invalid_spatial_snapshot', details: errors }, 422);

    const { data: run, error: runError } = await active.client.from('ai_runs').insert({
      project_id: body.projectId, space_id: body.spaceId, actor_user_id: active.userId,
      task_name: 'organize', task_schema_version: 'organize-1', prompt_version: 'organize-v0.4.0', status: 'running'
    }).select('id').single();
    if (runError || !run) return json(request, { error: 'ai_run_not_authorized' }, 403);
    aiRunId = run.id;

    const startedAt = Date.now();
    const model = requireServerEnv('FORMSHIFT_AI_MODEL');
    try {
      const { output, usage } = await generateText({
        model,
        output: Output.object({ schema: organizeOutputSchema, name: 'FormShiftOrganizeProposals' }),
        system: [
          'You are FormShift Organize. Propose improvements to the supplied structured room model.',
          'Never move a fixed object. Never invent dimensions. Use only stable object IDs supplied in the input. For move actions set rotation to null; for rotate actions set to to null.',
          'Your proposal is advisory: deterministic geometry validation will decide whether actions are feasible.',
          'Optimize access, grouping, circulation, clutter reduction, useful storage, and practical use of the space.'
        ].join(' '),
        prompt: JSON.stringify({ roomContext: body.roomContext ?? null, snapshot: body.snapshot })
      });
      const proposals = (output as OrganizeOutput).proposals.map((proposal: OrganizeOutput['proposals'][number]) => {
        const normalizedActions: LayoutAction[] = [];
        const schemaErrors: string[] = [];
        for (const action of proposal.actions) {
          if (action.type === 'move') {
            if (!action.to) schemaErrors.push(`Move action for ${action.objectId} is missing a destination.`);
            else normalizedActions.push({ type: 'move', objectId: action.objectId, to: action.to });
          } else {
            if (!action.rotation) schemaErrors.push(`Rotate action for ${action.objectId} is missing a rotation.`);
            else normalizedActions.push({ type: 'rotate', objectId: action.objectId, rotation: action.rotation });
          }
        }
        const baselineErrors = [...schemaErrors, ...validateLayoutActions(body.snapshot, normalizedActions)];
        return {
          ...proposal,
          actions: normalizedActions,
          baselineGeometryValidation: { valid: baselineErrors.length === 0, errors: baselineErrors, fullCollisionValidationPending: true }
        };
      });
      await active.client.from('ai_runs').update({ status: 'completed', latency_ms: Date.now() - startedAt, provider_model: model, token_usage: usage ?? null }).eq('id', aiRunId);
      return json(request, { aiRunId, status: 'proposed_geometry_pending', proposals });
    } catch (generationError) {
      await active.client.from('ai_runs').update({ status: 'failed', latency_ms: Date.now() - startedAt, provider_model: model, error_class: generationError instanceof Error ? generationError.name : 'unknown' }).eq('id', aiRunId);
      throw generationError;
    }
  } catch (error) {
    if (error instanceof Response) return json(request, { error: await error.text() }, error.status);
    return json(request, { error: 'organize_failed', aiRunId, message: error instanceof Error ? error.message : 'unknown error' }, 500);
  }
}
