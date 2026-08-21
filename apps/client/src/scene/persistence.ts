import { supabase } from '../auth/AuthProvider';
import type { SceneAnalysis } from './types';

const BUCKET = 'formshift-private';

function dataUrlToBlob(dataUrl: string) {
  return fetch(dataUrl).then((response) => response.blob());
}

export async function persistSceneAnalysis(input: {
  projectId: string;
  spaceId: string;
  userId: string;
  analysis: SceneAnalysis;
}) {
  if (!supabase) throw new Error('Scene persistence is unavailable.');
  if (!input.analysis.depth) throw new Error('A depth result is required before scene analysis can be persisted.');

  const sourceAsset = await supabase
    .from('assets')
    .select('id')
    .eq('project_id', input.projectId)
    .eq('space_id', input.spaceId)
    .eq('kind', 'room_photo')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (sourceAsset.error) throw sourceAsset.error;
  if (!sourceAsset.data?.id) throw new Error('The source room photo could not be resolved.');

  const analysisId = crypto.randomUUID();
  const storagePath = `${input.projectId}/${input.spaceId}/scene/${analysisId}/depth.png`;
  const blob = await dataUrlToBlob(input.analysis.depth.depthDataUrl);

  const upload = await supabase.storage.from(BUCKET).upload(storagePath, blob, {
    contentType: 'image/png',
    upsert: false,
  });
  if (upload.error) throw upload.error;

  let depthAssetId: string | null = null;
  try {
    const asset = await supabase.from('assets').insert({
      project_id: input.projectId,
      space_id: input.spaceId,
      kind: 'scene_depth_v1',
      storage_bucket: BUCKET,
      storage_path: storagePath,
      mime_type: 'image/png',
      byte_size: blob.size,
      privacy_class: 'private_household',
      created_by: input.userId,
    }).select('id').single();
    if (asset.error) throw asset.error;
    depthAssetId = asset.data.id as string;

    const row = await supabase.from('scene_analyses').insert({
      id: analysisId,
      project_id: input.projectId,
      space_id: input.spaceId,
      source_asset_id: sourceAsset.data.id,
      depth_asset_id: depthAssetId,
      schema_version: input.analysis.schemaVersion,
      provider: input.analysis.depth.provider,
      model: input.analysis.depth.model,
      model_version: input.analysis.depth.modelVersion,
      analysis_json: {
        ...input.analysis,
        depth: {
          ...input.analysis.depth,
          depthDataUrl: undefined,
        },
      },
      status: 'derived',
      created_by: input.userId,
    }).select('id, created_at').single();
    if (row.error) throw row.error;

    return { id: row.data.id as string, createdAt: row.data.created_at as string };
  } catch (error) {
    if (depthAssetId) await supabase.from('assets').delete().eq('id', depthAssetId);
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw error;
  }
}
