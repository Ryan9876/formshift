import { supabase } from '../auth/AuthProvider';

const BUCKET = 'formshift-private';

export type LoadedPhotoArrangement = {
  id: string;
  sceneUrl: string;
  createdAt: string;
};

export type PersistPhotoArrangementInput = {
  projectId: string;
  spaceId: string;
  userId: string;
  baseSpatialVersionId?: string | null;
  resultDataUrl: string;
  maskDataUrl: string;
  cutoutDataUrl: string;
  backgroundDataUrl?: string | null;
  transform: {
    x: number;
    y: number;
    scale: number;
    manualScale?: number;
    perspectiveFactor?: number;
    placementAssist?: boolean;
    rotationDeg: number;
    bbox: { x: number; y: number; width: number; height: number };
    rendererVersion: string;
  };
};

type AssetRow = {
  id: string;
  storage_path: string;
};

export async function loadLatestPhotoArrangement(
  projectId: string,
  spaceId: string,
): Promise<LoadedPhotoArrangement | null> {
  if (!supabase) return null;

  const latest = await supabase
    .from('photo_arrangements')
    .select('id, result_asset_id, created_at')
    .eq('project_id', projectId)
    .eq('space_id', spaceId)
    .eq('status', 'committed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest.error) {
    if (latest.error.code === '42P01' || latest.error.code === 'PGRST205') return null;
    throw latest.error;
  }
  if (!latest.data?.result_asset_id) return null;

  const asset = await supabase
    .from('assets')
    .select('id, storage_path')
    .eq('id', latest.data.result_asset_id)
    .is('deleted_at', null)
    .maybeSingle();

  if (asset.error) throw asset.error;
  if (!asset.data?.storage_path) return null;

  const signed = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(asset.data.storage_path, 3600);

  if (signed.error) throw signed.error;

  return {
    id: latest.data.id,
    sceneUrl: signed.data.signedUrl,
    createdAt: latest.data.created_at,
  };
}

export async function persistPhotoArrangement(input: PersistPhotoArrangementInput) {
  if (!supabase) throw new Error('Photo arrangement persistence is unavailable.');

  const sourceAsset = await supabase
    .from('assets')
    .select('id, storage_path')
    .eq('project_id', input.projectId)
    .eq('space_id', input.spaceId)
    .eq('kind', 'room_photo')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sourceAsset.error) throw sourceAsset.error;
  if (!sourceAsset.data?.id) throw new Error('The source room photo could not be resolved.');

  const parent = await supabase
    .from('photo_arrangements')
    .select('id')
    .eq('project_id', input.projectId)
    .eq('space_id', input.spaceId)
    .eq('status', 'committed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (parent.error && parent.error.code !== '42P01' && parent.error.code !== 'PGRST205') {
    throw parent.error;
  }

  const arrangementId = crypto.randomUUID();
  const basePath = `${input.projectId}/${input.spaceId}/arrange/${arrangementId}`;
  const uploadedPaths: string[] = [];
  const insertedAssetIds: string[] = [];

  try {
    const resultAsset = await uploadDataUrlAsset({
      projectId: input.projectId,
      spaceId: input.spaceId,
      userId: input.userId,
      kind: 'photo_arrangement_scene',
      path: `${basePath}/scene.jpg`,
      dataUrl: input.resultDataUrl,
    });
    uploadedPaths.push(resultAsset.storage_path);
    insertedAssetIds.push(resultAsset.id);

    const maskAsset = await uploadDataUrlAsset({
      projectId: input.projectId,
      spaceId: input.spaceId,
      userId: input.userId,
      kind: 'photo_arrangement_mask',
      path: `${basePath}/mask.png`,
      dataUrl: input.maskDataUrl,
    });
    uploadedPaths.push(maskAsset.storage_path);
    insertedAssetIds.push(maskAsset.id);

    const cutoutAsset = await uploadDataUrlAsset({
      projectId: input.projectId,
      spaceId: input.spaceId,
      userId: input.userId,
      kind: 'photo_arrangement_cutout',
      path: `${basePath}/cutout.png`,
      dataUrl: input.cutoutDataUrl,
    });
    uploadedPaths.push(cutoutAsset.storage_path);
    insertedAssetIds.push(cutoutAsset.id);

    let backgroundAsset: AssetRow | null = null;
    if (input.backgroundDataUrl) {
      backgroundAsset = await uploadDataUrlAsset({
        projectId: input.projectId,
        spaceId: input.spaceId,
        userId: input.userId,
        kind: 'photo_arrangement_background',
        path: `${basePath}/background.jpg`,
        dataUrl: input.backgroundDataUrl,
      });
      uploadedPaths.push(backgroundAsset.storage_path);
      insertedAssetIds.push(backgroundAsset.id);
    }

    const row = await supabase
      .from('photo_arrangements')
      .insert({
        id: arrangementId,
        project_id: input.projectId,
        space_id: input.spaceId,
        parent_arrangement_id: parent.data?.id ?? null,
        source_asset_id: sourceAsset.data.id,
        result_asset_id: resultAsset.id,
        mask_asset_id: maskAsset.id,
        cutout_asset_id: cutoutAsset.id,
        background_asset_id: backgroundAsset?.id ?? null,
        base_spatial_version_id: input.baseSpatialVersionId ?? null,
        transform_json: input.transform,
        status: 'committed',
        created_by: input.userId,
      })
      .select('id, created_at')
      .single();

    if (row.error) throw row.error;

    const signed = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(resultAsset.storage_path, 3600);
    if (signed.error) throw signed.error;

    return {
      id: row.data.id as string,
      createdAt: row.data.created_at as string,
      sceneUrl: signed.data.signedUrl,
    };
  } catch (error) {
    if (insertedAssetIds.length) {
      await supabase.from('assets').delete().in('id', insertedAssetIds);
    }
    if (uploadedPaths.length) {
      await supabase.storage.from(BUCKET).remove(uploadedPaths);
    }
    throw error;
  }
}

async function uploadDataUrlAsset({
  projectId,
  spaceId,
  userId,
  kind,
  path,
  dataUrl,
}: {
  projectId: string;
  spaceId: string;
  userId: string;
  kind: string;
  path: string;
  dataUrl: string;
}): Promise<AssetRow> {
  if (!supabase) throw new Error('Photo arrangement persistence is unavailable.');

  const blob = await dataUrlToBlob(dataUrl);
  const upload = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, {
      contentType: blob.type || mimeTypeForPath(path),
      upsert: false,
    });

  if (upload.error) throw upload.error;

  const inserted = await supabase
    .from('assets')
    .insert({
      project_id: projectId,
      space_id: spaceId,
      kind,
      storage_bucket: BUCKET,
      storage_path: path,
      mime_type: blob.type || mimeTypeForPath(path),
      byte_size: blob.size,
      privacy_class: 'private_household',
      created_by: userId,
    })
    .select('id, storage_path')
    .single();

  if (inserted.error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw inserted.error;
  }

  return inserted.data as AssetRow;
}

async function dataUrlToBlob(dataUrl: string) {
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error('Could not prepare the edited photo for storage.');
  return response.blob();
}

function mimeTypeForPath(path: string) {
  return path.endsWith('.png') ? 'image/png' : 'image/jpeg';
}
