import { generateImage } from 'ai';
import { requireEditableSpace } from '../../src/auth.js';
import { json, parseJson, preflight } from '../../src/http.js';

type Body = {
  projectId: string;
  spaceId: string;
  sourceDataUrl: string;
  maskDataUrl: string;
  mode?: 'single-object' | 'prepared-scene';
};

export function OPTIONS(request: Request) {
  return preflight(request);
}

export async function POST(request: Request) {
  try {
    const body = await parseJson<Body>(request);
    if (!body.projectId || !body.spaceId || !body.sourceDataUrl || !body.maskDataUrl) {
      return json(request, { error: 'project_space_source_mask_required' }, 400);
    }

    const active = await requireEditableSpace(request, body.projectId, body.spaceId);
    const source = decodeDataUrl(body.sourceDataUrl, 3_500_000);
    const mask = decodeDataUrl(body.maskDataUrl, 3_500_000);
    if (!source.mediaType.startsWith('image/') || !mask.mediaType.startsWith('image/')) {
      return json(request, { error: 'image_inputs_required' }, 400);
    }

    const preparedScene = body.mode === 'prepared-scene';
    const model = process.env.FORMSHIFT_IMAGE_MODEL?.trim() || 'openai/gpt-image-2';
    const startedAt = Date.now();
    const { data: run } = await active.client.from('ai_runs').insert({
      project_id: body.projectId,
      space_id: body.spaceId,
      actor_user_id: active.userId,
      task_name: preparedScene ? 'prepared-scene-background-repair' : 'photo-background-repair',
      task_schema_version: preparedScene ? 'prepared-scene-repair-1' : 'photo-repair-1',
      prompt_version: preparedScene ? 'prepared-scene-repair-v1.0.0' : 'photo-repair-v0.6.0',
      status: 'running',
      provider_model: model,
    }).select('id').single();

    try {
      const result = await generateImage({
        model,
        prompt: {
          text: preparedScene ? preparedScenePrompt() : singleObjectPrompt(),
          images: [source.bytes, mask.bytes],
        },
      });

      const image = result.images?.[0];
      if (!image?.base64) throw new Error('Image model returned no repaired image.');
      if (run?.id) {
        await active.client.from('ai_runs').update({
          status: 'completed',
          latency_ms: Date.now() - startedAt,
          provider_model: model,
        }).eq('id', run.id);
      }
      return json(request, {
        status: 'completed',
        modelUsed: model,
        imageDataUrl: `data:${image.mediaType || 'image/png'};base64,${image.base64}`,
      });
    } catch (error) {
      if (run?.id) {
        await active.client.from('ai_runs').update({
          status: 'failed',
          latency_ms: Date.now() - startedAt,
          provider_model: model,
          error_class: error instanceof Error ? error.name : 'unknown',
        }).eq('id', run.id);
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof Response) return json(request, { error: await error.text() }, error.status);
    return json(request, {
      error: 'photo_background_repair_failed',
      message: error instanceof Error ? error.message : 'unknown error',
    }, 500);
  }
}

function singleObjectPrompt() {
  return [
    'Edit the first image only.',
    'The second image is a black-and-white selection mask: white marks the photographed object that was lifted and must be removed; black marks pixels that must stay unchanged.',
    'Reconstruct only the white-mask area as the background that would naturally be visible behind the removed object.',
    'Preserve the room, people, furniture, lighting, camera perspective, framing, colors, texture, and every pixel outside the masked area as closely as possible.',
    'Do not add a replacement object. Do not redesign or restyle the room. Return a photorealistic repaired room image.',
  ].join(' ');
}

function preparedScenePrompt() {
  return [
    'Edit the first room photograph only.',
    'The second image is a black-and-white mask. Every white region marks one or more photographed moveable objects that have been separated into independent layers. Black marks room pixels that must stay unchanged.',
    'Remove every object covered by white and reconstruct only those white regions as the wall, floor, furniture surface, or other background that would naturally be visible behind the removed objects.',
    'Treat all white regions as parts of one consistent room scene so wall lines, floorboards, furniture edges, lighting, shadows, perspective, texture, and color continue naturally across the repaired areas.',
    'Preserve people and every unmasked object. Do not redesign, redecorate, restyle, add replacement objects, or change camera framing.',
    'Return a photorealistic clean background plate for the same room.',
  ].join(' ');
}

function decodeDataUrl(value: string, maxBytes: number) {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(value);
  if (!match) throw new Error('Invalid image data URL.');
  const bytes = Buffer.from(match[2]!, 'base64');
  if (bytes.byteLength === 0 || bytes.byteLength > maxBytes) throw new Error('Image input is too large.');
  return { mediaType: match[1]!, bytes };
}
