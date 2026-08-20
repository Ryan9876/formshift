import { generateText, Output } from 'ai';
import { validateSnapshot, type SpatialSnapshot } from '@formshift/domain';
import { buildBriefSchema, type BuildBriefOutput } from '../../src/aiSchemas.js';
import { requireEditableSpace } from '../../src/auth.js';
import { json, parseJson, preflight } from '../../src/http.js';

type Body = { projectId: string; spaceId: string; spatialVersionId: string; brief: string };
type Attempt = { model: string; status: 'completed' | 'failed'; usage?: unknown; error?: string };

export function OPTIONS(request: Request) { return preflight(request); }

export async function POST(request: Request) {
  let aiRunId: string | undefined;
  try {
    const body = await parseJson<Body>(request);
    if (!body.projectId || !body.spaceId || !body.spatialVersionId || !body.brief?.trim()) {
      return json(request, { error: 'project_space_version_brief_required' }, 400);
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
      return json(request, { error: 'stale_spatial_version', activeSpatialVersionId: spaceState.active_spatial_version_id }, 409);
    }

    const { data: version, error: versionError } = await active.client
      .from('spatial_versions')
      .select('model_json')
      .eq('id', body.spatialVersionId)
      .eq('space_id', body.spaceId)
      .eq('status', 'committed')
      .single();
    if (versionError || !version) return json(request, { error: 'spatial_version_not_found' }, 404);
    const snapshot = version.model_json as SpatialSnapshot;
    const snapshotErrors = validateSnapshot(snapshot);
    if (snapshot.spaceId !== body.spaceId) snapshotErrors.push('snapshot spaceId does not match requested space');
    if (snapshotErrors.length) return json(request, { error: 'invalid_spatial_snapshot', details: snapshotErrors }, 422);

    const { data: run, error: runError } = await active.client.from('ai_runs').insert({
      project_id: body.projectId,
      space_id: body.spaceId,
      actor_user_id: active.userId,
      task_name: 'build_brief',
      task_schema_version: 'build-brief-2',
      prompt_version: 'build-brief-v0.5.0',
      status: 'running'
    }).select('id').single();
    if (runError || !run) return json(request, { error: 'ai_run_not_authorized' }, 403);
    aiRunId = run.id;

    const startedAt = Date.now();
    const primaryModel = process.env.FORMSHIFT_AI_MODEL?.trim() || 'openai/gpt-5.6-luna';
    const fallbackModel = process.env.FORMSHIFT_AI_FALLBACK_MODEL?.trim() || 'openai/gpt-5.6-terra';
    const attempts: Attempt[] = [];

    try {
      let output: BuildBriefOutput | null = null;
      let selectedModel = primaryModel;
      for (const model of Array.from(new Set([primaryModel, fallbackModel]))) {
        selectedModel = model;
        try {
          const result = await generateText({
            model,
            output: Output.object({ schema: buildBriefSchema, name: 'FormShiftBuildBrief' }),
            system: [
              'Normalize a FormShift build request into the provided schema.',
              'Do not invent missing physical dimensions, installation facts, or material facts.',
              'Convert explicitly stated dimensions to millimeters.',
              'Use installationType=freestanding only when the user describes a freestanding/floor-standing unit; otherwise classify conservatively.',
              'For the current Build slice, open shelving/storage is the supported furnishing archetype, but still classify the user request accurately.',
              'Put unknown build-critical inputs in missingCriticalInformation.',
              'Do not claim structural, code, professional, or construction approval.'
            ].join(' '),
            prompt: JSON.stringify({ brief: body.brief.trim(), roomEnvelope: snapshot.boundary })
          });
          output = result.output as BuildBriefOutput;
          attempts.push({ model, status: 'completed', usage: result.usage ?? null });
          break;
        } catch (error) {
          attempts.push({ model, status: 'failed', error: error instanceof Error ? error.message : 'unknown error' });
        }
      }

      if (!output) throw new Error('All Build brief models failed.');
      const supportedArchetype = output.archetype === 'shelving' || output.archetype === 'storage';
      const supportedInstallation = output.installationType === 'freestanding' || output.installationType === 'unknown';
      const supported = supportedArchetype && supportedInstallation;
      const unsupportedReason = !supportedArchetype
        ? 'This phase supports freestanding open shelving/storage only.'
        : !supportedInstallation
          ? 'Wall-anchored and built-in construction requires a later installation-aware Build slice.'
          : null;

      await active.client.from('ai_runs').update({
        status: 'completed',
        latency_ms: Date.now() - startedAt,
        provider_model: selectedModel,
        token_usage: { attempts }
      }).eq('id', aiRunId);

      return json(request, {
        aiRunId,
        basisSpatialVersionId: body.spatialVersionId,
        supported,
        unsupportedReason,
        normalizedBrief: output
      });
    } catch (generationError) {
      await active.client.from('ai_runs').update({
        status: 'failed',
        latency_ms: Date.now() - startedAt,
        provider_model: attempts.at(-1)?.model ?? primaryModel,
        token_usage: { attempts },
        error_class: generationError instanceof Error ? generationError.name : 'unknown'
      }).eq('id', aiRunId);
      throw generationError;
    }
  } catch (error) {
    if (error instanceof Response) return json(request, { error: await error.text() }, error.status);
    return json(request, { error: 'build_brief_failed', aiRunId, message: error instanceof Error ? error.message : 'unknown error' }, 500);
  }
}
