import { generateText, Output } from 'ai';
import { buildBriefSchema } from '../../src/aiSchemas.js';
import { requireEditableSpace } from '../../src/auth.js';
import { json, parseJson, preflight } from '../../src/http.js';
import { requireServerEnv } from '../../src/env.js';

type Body = { projectId: string; spaceId: string; brief: string };
export function OPTIONS(request: Request) { return preflight(request); }

export async function POST(request: Request) {
  let aiRunId: string | undefined;
  try {
    const body = await parseJson<Body>(request);
    if (!body.projectId || !body.spaceId || !body.brief?.trim()) return json(request, { error: 'project_space_brief_required' }, 400);
    const active = await requireEditableSpace(request, body.projectId, body.spaceId);
    const { data: run, error: runError } = await active.client.from('ai_runs').insert({
      project_id: body.projectId, space_id: body.spaceId, actor_user_id: active.userId,
      task_name: 'build_brief', task_schema_version: 'build-brief-1', prompt_version: 'build-brief-v0.4.0', status: 'running'
    }).select('id').single();
    if (runError || !run) return json(request, { error: 'ai_run_not_authorized' }, 403);
    aiRunId = run.id;

    const startedAt = Date.now();
    const model = requireServerEnv('FORMSHIFT_AI_MODEL');
    try {
      const { output, usage } = await generateText({
        model,
        output: Output.object({ schema: buildBriefSchema, name: 'FormShiftBuildBrief' }),
        system: 'Extract a structured build brief. Do not invent missing dimensions or material facts. Put unknown build-critical inputs in missingCriticalInformation. Output planning requirements only; do not claim code, structural, or professional approval.',
        prompt: body.brief
      });
      await active.client.from('ai_runs').update({ status: 'completed', latency_ms: Date.now() - startedAt, provider_model: model, token_usage: usage ?? null }).eq('id', aiRunId);
      return json(request, { aiRunId, output });
    } catch (generationError) {
      await active.client.from('ai_runs').update({ status: 'failed', latency_ms: Date.now() - startedAt, provider_model: model, error_class: generationError instanceof Error ? generationError.name : 'unknown' }).eq('id', aiRunId);
      throw generationError;
    }
  } catch (error) {
    if (error instanceof Response) return json(request, { error: await error.text() }, error.status);
    return json(request, { error: 'build_brief_failed', aiRunId, message: error instanceof Error ? error.message : 'unknown error' }, 500);
  }
}
