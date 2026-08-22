import { supabase } from '../auth/AuthProvider';
import type { PreparedBox, PreparedObjectMobility, PreparedSceneObject, PreparedSupportKind } from './types';

const BUCKET = 'formshift-private';

export type PreparedBackgroundQuality = 'quick' | 'ai_repaired';

export type LoadedPreparedScene = {
  id: string;
  sourceAssetId: string;
  createdAt: string;
  backgroundQuality: PreparedBackgroundQuality;
  cleanBackgroundUrl: string;
  cleanBackgroundAssetId: string;
  objects: PreparedSceneObject[];
  provider: Record<string, unknown>;
};

type StoredPreparedObject = {
  id: string;
  label: string;
  detectionScore: number;
  mobility: PreparedObjectMobility;
  expectedSupport: PreparedSupportKind;
  bbox: PreparedBox;
  maskAssetId: string;
  cutoutAssetId: string;
  position: { x: number; y: number };
  scale: number;
  rotationDeg: number;
  approximateDepth?: number;
  source: 'automatic' | 'user_added';
};

type AssetRow = { id: string; storage_path: string };

export async function loadLatestPreparedScene(projectId: string, spaceId: string): Promise<LoadedPreparedScene | null> {
  if (!supabase) return null;
  const sourceAsset = await resolveCurrentSourceAsset(projectId, spaceId);
  if (!sourceAsset) return null;

  const latest = await supabase
    .from('prepared_scenes')
    .select('id, clean_background_asset_id, objects_json, provider_json, background_quality, created_at')
    .eq('project_id', projectId)
    .eq('space_id', spaceId)
    .eq('source_asset_id', sourceAsset.id)
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest.error) {
    if (latest.error.code === '42P01' || latest.error.code === 'PGRST205') return null;
    throw latest.error;
  }
  if (!latest.data?.id || !latest.data.clean_background_asset_id) return null;

  const storedObjects = parseStoredObjects(latest.data.objects_json);
  const assetIds = [
    latest.data.clean_background_asset_id as string,
    ...storedObjects.flatMap((object) => [object.maskAssetId, object.cutoutAssetId]),
  ];
  const assets = await supabase
    .from('assets')
    .select('id, storage_path')
    .eq('project_id', projectId)
    .eq('space_id', spaceId)
    .in('id', assetIds)
    .is('deleted_at', null);
  if (assets.error) throw assets.error;

  const byId = new Map((assets.data ?? []).map((asset) => [asset.id as string, asset.storage_path as string]));
  const backgroundPath = byId.get(latest.data.clean_background_asset_id as string);
  if (!backgroundPath) return null;
  const cleanBackgroundUrl = await signAssetPath(backgroundPath);

  const objects = (await Promise.all(storedObjects.map(async (object) => {
    const maskPath = byId.get(object.maskAssetId);
    const cutoutPath = byId.get(object.cutoutAssetId);
    if (!maskPath || !cutoutPath) return null;
    const [maskDataUrl, cutoutDataUrl] = await Promise.all([signAssetPath(maskPath), signAssetPath(cutoutPath)]);
    return {
      id: object.id,
      label: object.label,
      detectionScore: object.detectionScore,
      mobility: object.mobility,
      expectedSupport: object.expectedSupport,
      bbox: object.bbox,
      maskDataUrl,
      cutoutDataUrl,
      maskAssetId: object.maskAssetId,
      cutoutAssetId: object.cutoutAssetId,
      position: object.position,
      scale: object.scale,
      rotationDeg: object.rotationDeg,
      approximateDepth: object.approximateDepth,
      source: object.source,
    } satisfies PreparedSceneObject;
  }))).filter((value): value is PreparedSceneObject => !!value);

  if (!objects.length) return null;
  return {
    id: latest.data.id as string,
    sourceAssetId: sourceAsset.id,
    createdAt: latest.data.created_at as string,
    backgroundQuality: latest.data.background_quality === 'ai_repaired' ? 'ai_repaired' : 'quick',
    cleanBackgroundUrl,
    cleanBackgroundAssetId: latest.data.clean_background_asset_id as string,
    objects,
    provider: isRecord(latest.data.provider_json) ? latest.data.provider_json as Record<string, unknown> : {},
  };
}

export async function persistPreparedScene(input: {
  projectId: string;
  spaceId: string;
  userId: string;
  objects: PreparedSceneObject[];
  cleanBackgroundDataUrl: string;
  backgroundQuality: PreparedBackgroundQuality;
  provider?: Record<string, unknown>;
  parentPreparedSceneId?: string | null;
  cleanBackgroundAssetId?: string | null;
}): Promise<{
  id: string;
  createdAt: string;
  sourceAssetId: string;
  cleanBackgroundAssetId: string;
  objects: PreparedSceneObject[];
}> {
  if (!supabase) throw new Error('Prepared Scene persistence is unavailable.');
  if (!input.objects.length) throw new Error('Prepared Scene needs at least one prepared object before it can be cached.');
  const sourceAsset = await resolveCurrentSourceAsset(input.projectId, input.spaceId);
  if (!sourceAsset) throw new Error('The current room photo could not be resolved for Prepared Scene persistence.');

  const latestParent = input.parentPreparedSceneId ? { id: input.parentPreparedSceneId } : await findLatestPreparedSceneId(input.projectId, input.spaceId, sourceAsset.id);
  const sceneId = crypto.randomUUID();
  const basePath = `${input.projectId}/${input.spaceId}/prepared/${sceneId}`;
  const uploadedPaths: string[] = [];
  const insertedAssetIds: string[] = [];

  try {
    let cleanBackgroundAssetId = input.cleanBackgroundAssetId ?? null;
    if (cleanBackgroundAssetId) {
      const valid = await validReusableAssetIds(input.projectId, input.spaceId, [cleanBackgroundAssetId]);
      if (!valid.has(cleanBackgroundAssetId)) cleanBackgroundAssetId = null;
    }
    if (!cleanBackgroundAssetId) {
      const background = await uploadDataUrlAsset({
        projectId: input.projectId,
        spaceId: input.spaceId,
        userId: input.userId,
        kind: input.backgroundQuality === 'ai_repaired' ? 'prepared_scene_background_ai_v1' : 'prepared_scene_background_quick_v1',
        path: `${basePath}/background.jpg`,
        dataUrl: input.cleanBackgroundDataUrl,
      });
      cleanBackgroundAssetId = background.id;
      uploadedPaths.push(background.storage_path);
      insertedAssetIds.push(background.id);
    }

    const reusableCandidates = input.objects.flatMap((object) => [object.maskAssetId, object.cutoutAssetId]).filter((value): value is string => !!value);
    const reusable = await validReusableAssetIds(input.projectId, input.spaceId, reusableCandidates);
    const persistedObjects: PreparedSceneObject[] = [];
    const storedObjects: StoredPreparedObject[] = [];

    for (let index = 0; index < input.objects.length; index += 1) {
      const object = input.objects[index]!;
      let maskAssetId = object.maskAssetId && reusable.has(object.maskAssetId) ? object.maskAssetId : null;
      let cutoutAssetId = object.cutoutAssetId && reusable.has(object.cutoutAssetId) ? object.cutoutAssetId : null;

      if (!maskAssetId) {
        const mask = await uploadDataUrlAsset({
          projectId: input.projectId,
          spaceId: input.spaceId,
          userId: input.userId,
          kind: 'prepared_scene_object_mask_v1',
          path: `${basePath}/objects/${index}-${safeId(object.id)}-mask.png`,
          dataUrl: object.maskDataUrl,
        });
        maskAssetId = mask.id;
        uploadedPaths.push(mask.storage_path);
        insertedAssetIds.push(mask.id);
      }
      if (!cutoutAssetId) {
        const cutout = await uploadDataUrlAsset({
          projectId: input.projectId,
          spaceId: input.spaceId,
          userId: input.userId,
          kind: 'prepared_scene_object_cutout_v1',
          path: `${basePath}/objects/${index}-${safeId(object.id)}-cutout.png`,
          dataUrl: object.cutoutDataUrl,
        });
        cutoutAssetId = cutout.id;
        uploadedPaths.push(cutout.storage_path);
        insertedAssetIds.push(cutout.id);
      }

      const next: PreparedSceneObject = { ...object, maskAssetId, cutoutAssetId };
      persistedObjects.push(next);
      storedObjects.push(toStoredObject(next));
    }

    const row = await supabase
      .from('prepared_scenes')
      .insert({
        id: sceneId,
        project_id: input.projectId,
        space_id: input.spaceId,
        source_asset_id: sourceAsset.id,
        parent_prepared_scene_id: latestParent?.id ?? null,
        clean_background_asset_id: cleanBackgroundAssetId,
        schema_version: 'prepared-scene-1',
        background_quality: input.backgroundQuality,
        objects_json: storedObjects,
        provider_json: input.provider ?? {},
        status: 'ready',
        created_by: input.userId,
      })
      .select('id, created_at')
      .single();
    if (row.error) throw row.error;

    return {
      id: row.data.id as string,
      createdAt: row.data.created_at as string,
      sourceAssetId: sourceAsset.id,
      cleanBackgroundAssetId,
      objects: persistedObjects,
    };
  } catch (error) {
    if (insertedAssetIds.length) await supabase.from('assets').delete().in('id', insertedAssetIds);
    if (uploadedPaths.length) await supabase.storage.from(BUCKET).remove(uploadedPaths);
    throw error;
  }
}

async function resolveCurrentSourceAsset(projectId: string, spaceId: string) {
  if (!supabase) return null;
  const source = await supabase
    .from('assets')
    .select('id, storage_path')
    .eq('project_id', projectId)
    .eq('space_id', spaceId)
    .eq('kind', 'room_photo')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (source.error) throw source.error;
  return source.data ? { id: source.data.id as string, storagePath: source.data.storage_path as string } : null;
}

async function findLatestPreparedSceneId(projectId: string, spaceId: string, sourceAssetId: string) {
  if (!supabase) return null;
  const latest = await supabase
    .from('prepared_scenes')
    .select('id')
    .eq('project_id', projectId)
    .eq('space_id', spaceId)
    .eq('source_asset_id', sourceAssetId)
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latest.error && latest.error.code !== '42P01' && latest.error.code !== 'PGRST205') throw latest.error;
  return latest.data?.id ? { id: latest.data.id as string } : null;
}

async function validReusableAssetIds(projectId: string, spaceId: string, ids: string[]) {
  if (!supabase || !ids.length) return new Set<string>();
  const unique = [...new Set(ids)];
  const result = await supabase
    .from('assets')
    .select('id')
    .eq('project_id', projectId)
    .eq('space_id', spaceId)
    .in('id', unique)
    .is('deleted_at', null);
  if (result.error) throw result.error;
  return new Set((result.data ?? []).map((asset) => asset.id as string));
}

async function uploadDataUrlAsset(input: {
  projectId: string;
  spaceId: string;
  userId: string;
  kind: string;
  path: string;
  dataUrl: string;
}): Promise<AssetRow> {
  if (!supabase) throw new Error('Prepared Scene persistence is unavailable.');
  const blob = await dataUrlToBlob(input.dataUrl);
  const upload = await supabase.storage.from(BUCKET).upload(input.path, blob, {
    contentType: blob.type || mimeTypeForPath(input.path),
    upsert: false,
  });
  if (upload.error) throw upload.error;

  const inserted = await supabase
    .from('assets')
    .insert({
      project_id: input.projectId,
      space_id: input.spaceId,
      kind: input.kind,
      storage_bucket: BUCKET,
      storage_path: input.path,
      mime_type: blob.type || mimeTypeForPath(input.path),
      byte_size: blob.size,
      privacy_class: 'private_household',
      created_by: input.userId,
    })
    .select('id, storage_path')
    .single();
  if (inserted.error) {
    await supabase.storage.from(BUCKET).remove([input.path]);
    throw inserted.error;
  }
  return inserted.data as AssetRow;
}

async function signAssetPath(path: string) {
  if (!supabase) throw new Error('Prepared Scene persistence is unavailable.');
  const signed = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (signed.error) throw signed.error;
  return signed.data.signedUrl;
}

async function dataUrlToBlob(dataUrl: string) {
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error('Could not prepare a Prepared Scene asset for storage.');
  return response.blob();
}

function toStoredObject(object: PreparedSceneObject): StoredPreparedObject {
  if (!object.maskAssetId || !object.cutoutAssetId) throw new Error('Prepared object asset lineage is incomplete.');
  return {
    id: object.id,
    label: object.label,
    detectionScore: object.detectionScore,
    mobility: object.mobility,
    expectedSupport: object.expectedSupport,
    bbox: object.bbox,
    maskAssetId: object.maskAssetId,
    cutoutAssetId: object.cutoutAssetId,
    position: object.position,
    scale: object.scale,
    rotationDeg: object.rotationDeg,
    approximateDepth: object.approximateDepth,
    source: object.source,
  };
}

function parseStoredObjects(value: unknown): StoredPreparedObject[] {
  if (!Array.isArray(value)) return [];
  return value.map(parseStoredObject).filter((object): object is StoredPreparedObject => !!object);
}

function parseStoredObject(value: unknown): StoredPreparedObject | null {
  if (!isRecord(value) || !isRecord(value.bbox) || !isRecord(value.position)) return null;
  if (typeof value.id !== 'string' || typeof value.label !== 'string' || typeof value.maskAssetId !== 'string' || typeof value.cutoutAssetId !== 'string') return null;
  const mobility = value.mobility;
  const support = value.expectedSupport;
  const source = value.source;
  if (!['movable','conditional','fixed'].includes(String(mobility))) return null;
  if (!['floor','wall','surface','unknown'].includes(String(support))) return null;
  if (!['automatic','user_added'].includes(String(source))) return null;
  const bbox = value.bbox;
  const position = value.position;
  for (const numberValue of [value.detectionScore, bbox.x, bbox.y, bbox.width, bbox.height, position.x, position.y, value.scale, value.rotationDeg]) {
    if (!Number.isFinite(numberValue)) return null;
  }
  return {
    id: value.id,
    label: value.label,
    detectionScore: value.detectionScore as number,
    mobility: mobility as PreparedObjectMobility,
    expectedSupport: support as PreparedSupportKind,
    bbox: { x: bbox.x as number, y: bbox.y as number, width: bbox.width as number, height: bbox.height as number },
    maskAssetId: value.maskAssetId,
    cutoutAssetId: value.cutoutAssetId,
    position: { x: position.x as number, y: position.y as number },
    scale: value.scale as number,
    rotationDeg: value.rotationDeg as number,
    approximateDepth: Number.isFinite(value.approximateDepth) ? value.approximateDepth as number : undefined,
    source: source as 'automatic' | 'user_added',
  };
}

function safeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || crypto.randomUUID();
}

function mimeTypeForPath(path: string) {
  return path.endsWith('.png') ? 'image/png' : 'image/jpeg';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
