import {
  applyActions,
  canonicalCoordinateSystem,
  validateOrganizeActions,
  type LayoutAction,
  type MeasurementState,
  type SpatialObject,
  type SpatialSnapshot,
} from '@formshift/domain';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { supabase, useAuth } from '../auth/AuthProvider';

type ProjectSummary = { id: string; name: string };
type SpaceSummary = { id: string; name: string; project_id: string; active_spatial_version_id: string | null };
type SourceMode = 'capture' | 'organize' | 'arrange' | 'build-placement' | 'correction';
type EvidenceMode = 'measured' | 'estimated';

type RoomDimensions = {
  widthMm: number;
  depthMm: number;
  ceilingHeightMm: number;
  evidence: EvidenceMode;
};

type ObjectInput = {
  label: string;
  category?: string;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  evidence: EvidenceMode;
};

export function useRoomWorkspace() {
  const auth = useAuth();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [space, setSpace] = useState<SpaceSummary | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [persistedSnapshot, setPersistedSnapshot] = useState<SpatialSnapshot | null>(null);
  const [workingSnapshot, setWorkingSnapshotState] = useState<SpatialSnapshot | null>(null);
  const [dirty, setDirty] = useState(false);
  const [measurementSummary, setMeasurementSummary] = useState<'needs_dimensions' | 'estimated' | 'measured' | 'mixed'>('needs_dimensions');

  const load = useCallback(async () => {
    if (!supabase || !auth.session) {
      setLoading(false);
      setProject(null);
      setSpace(null);
      setPhotoUrl(null);
      setActiveVersionId(null);
      setPersistedSnapshot(null);
      setWorkingSnapshotState(null);
      setDirty(false);
      setMeasurementSummary('needs_dimensions');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const projectResult = await supabase
        .from('projects')
        .select('id, name')
        .eq('status', 'active')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (projectResult.error) throw projectResult.error;
      if (!projectResult.data) {
        setProject(null);
        setSpace(null);
        setPhotoUrl(null);
        setActiveVersionId(null);
        setPersistedSnapshot(null);
        setWorkingSnapshotState(null);
        setDirty(false);
        setMeasurementSummary('needs_dimensions');
        return;
      }

      const nextProject = projectResult.data as ProjectSummary;
      setProject(nextProject);

      const spaceResult = await supabase
        .from('spaces')
        .select('id, name, project_id, active_spatial_version_id')
        .eq('project_id', nextProject.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (spaceResult.error) throw spaceResult.error;
      if (!spaceResult.data) {
        setSpace(null);
        setPhotoUrl(null);
        setActiveVersionId(null);
        setPersistedSnapshot(null);
        setWorkingSnapshotState(null);
        setDirty(false);
        setMeasurementSummary('needs_dimensions');
        return;
      }

      const nextSpace = spaceResult.data as SpaceSummary;
      setSpace(nextSpace);

      const assetResult = await supabase
        .from('assets')
        .select('storage_path')
        .eq('space_id', nextSpace.id)
        .eq('kind', 'room_photo')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (assetResult.error) throw assetResult.error;
      if (assetResult.data?.storage_path) {
        const signed = await supabase.storage
          .from('formshift-private')
          .createSignedUrl(assetResult.data.storage_path, 3600);
        if (signed.error) throw signed.error;
        setPhotoUrl(signed.data.signedUrl);
      } else {
        setPhotoUrl(null);
      }

      let versionResult: { id: string; model_json: unknown } | null = null;

      if (nextSpace.active_spatial_version_id) {
        const active = await supabase
          .from('spatial_versions')
          .select('id, model_json')
          .eq('id', nextSpace.active_spatial_version_id)
          .maybeSingle();
        if (active.error) throw active.error;
        versionResult = active.data as { id: string; model_json: unknown } | null;
      }

      if (!versionResult) {
        const latest = await supabase
          .from('spatial_versions')
          .select('id, model_json')
          .eq('space_id', nextSpace.id)
          .eq('status', 'committed')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (latest.error) throw latest.error;
        versionResult = latest.data as { id: string; model_json: unknown } | null;
      }

      if (!versionResult) {
        setActiveVersionId(null);
        setPersistedSnapshot(null);
        setWorkingSnapshotState(null);
        setDirty(false);
        setMeasurementSummary('needs_dimensions');
        return;
      }

      const snapshot = versionResult.model_json as SpatialSnapshot;
      if (!snapshot || snapshot.schemaVersion !== 'spatial-1' || snapshot.spaceId !== nextSpace.id) {
        throw new Error('The active room model is not a supported FormShift spatial snapshot.');
      }

      setActiveVersionId(versionResult.id);
      setPersistedSnapshot(snapshot);
      setWorkingSnapshotState(snapshot);
      setDirty(false);
      setMeasurementSummary(await summarizeRoomMeasurements(snapshot));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [auth.session]);

  useEffect(() => {
    void load();
  }, [load]);

  const setWorkingSnapshot = useCallback((next: SpatialSnapshot) => {
    setWorkingSnapshotState(next);
    setDirty(persistedSnapshot ? canonicalJson(next) !== canonicalJson(persistedSnapshot) : true);
  }, [persistedSnapshot]);

  const discardArrangement = useCallback(() => {
    setWorkingSnapshotState(persistedSnapshot);
    setDirty(false);
  }, [persistedSnapshot]);

  const commitSpatialVersion = useCallback(async (snapshot: SpatialSnapshot, sourceMode: SourceMode, parentVersionId: string | null) => {
    if (!supabase || !auth.session || !space) throw new Error('Room persistence is unavailable.');
    const modelHash = await hashSnapshot(snapshot);

    const insert = await supabase
      .from('spatial_versions')
      .insert({
        space_id: space.id,
        parent_version_id: parentVersionId,
        schema_version: snapshot.schemaVersion,
        source_mode: sourceMode,
        created_by: auth.session.user.id,
        model_hash: modelHash,
        model_json: snapshot,
        status: 'committed',
      })
      .select('id')
      .single();

    let versionId: string;
    if (insert.error) {
      const existing = await supabase
        .from('spatial_versions')
        .select('id')
        .eq('space_id', space.id)
        .eq('model_hash', modelHash)
        .maybeSingle();
      if (existing.error || !existing.data) throw insert.error;
      versionId = existing.data.id;
    } else {
      versionId = insert.data.id;
    }

    const refs = Array.from(new Set(snapshot.measurementRefs));
    if (refs.length > 0) {
      const existingLinks = await supabase
        .from('spatial_version_measurements')
        .select('measurement_id')
        .eq('spatial_version_id', versionId);
      if (existingLinks.error) throw existingLinks.error;
      const linked = new Set((existingLinks.data ?? []).map((row: { measurement_id: string }) => row.measurement_id));
      const missing = refs.filter((id) => !linked.has(id));
      if (missing.length > 0) {
        const linkInsert = await supabase
          .from('spatial_version_measurements')
          .insert(missing.map((measurementId) => ({ spatial_version_id: versionId, measurement_id: measurementId })));
        if (linkInsert.error) throw linkInsert.error;
      }
    }

    const spaceUpdate = await supabase
      .from('spaces')
      .update({ active_spatial_version_id: versionId })
      .eq('id', space.id);
    if (spaceUpdate.error) throw spaceUpdate.error;

    return versionId;
  }, [auth.session, space]);

  const initializeRoom = useCallback(async (dimensions: RoomDimensions) => {
    if (!supabase || !auth.session || !project || !space) throw new Error('Capture a room before adding dimensions.');
    validatePositiveDimensions(dimensions.widthMm, dimensions.depthMm, dimensions.ceilingHeightMm);
    setBusy(true);
    setError(null);

    try {
      const evidence = evidenceFields(dimensions.evidence);
      const rows = [
        measurementRow(project.id, space.id, space.id, 'room.width', dimensions.widthMm, auth.session.user.id, evidence),
        measurementRow(project.id, space.id, space.id, 'room.depth', dimensions.depthMm, auth.session.user.id, evidence),
        measurementRow(project.id, space.id, space.id, 'room.ceiling_height', dimensions.ceilingHeightMm, auth.session.user.id, evidence),
      ];

      const measurementInsert = await supabase
        .from('measurement_observations')
        .insert(rows)
        .select('id');
      if (measurementInsert.error) throw measurementInsert.error;
      const measurementRefs = (measurementInsert.data ?? []).map((row: { id: string }) => row.id);
      if (measurementRefs.length !== 3) throw new Error('FormShift could not record all three room dimensions.');

      const snapshot: SpatialSnapshot = {
        schemaVersion: 'spatial-1',
        coordinateSystem: canonicalCoordinateSystem,
        spaceId: space.id,
        boundary: {
          floorPolygon: [
            { x: 0, z: 0 },
            { x: dimensions.widthMm, z: 0 },
            { x: dimensions.widthMm, z: dimensions.depthMm },
            { x: 0, z: dimensions.depthMm },
          ],
          ceilingHeightMm: dimensions.ceilingHeightMm,
        },
        objects: [],
        openings: [],
        constraints: [],
        measurementRefs,
      };

      const versionId = await commitSpatialVersion(snapshot, 'capture', null);
      setActiveVersionId(versionId);
      setPersistedSnapshot(snapshot);
      setWorkingSnapshotState(snapshot);
      setDirty(false);
      setMeasurementSummary(dimensions.evidence === 'measured' ? 'measured' : 'estimated');
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      throw new Error(message);
    } finally {
      setBusy(false);
    }
  }, [auth.session, commitSpatialVersion, project, space]);

  const addObject = useCallback(async (input: ObjectInput) => {
    if (!supabase || !auth.session || !project || !space || !workingSnapshot) throw new Error('Set room dimensions before adding objects.');
    validatePositiveDimensions(input.widthMm, input.depthMm, input.heightMm);
    const bounds = roomBounds(workingSnapshot);
    if (!bounds) throw new Error('The room boundary is not ready for object placement.');
    if (input.widthMm > bounds.width || input.depthMm > bounds.depth) throw new Error('That object footprint is larger than the measured room.');
    if (!input.label.trim()) throw new Error('Give the object a name.');

    setBusy(true);
    setError(null);

    try {
      const objectId = makeObjectId(input.label);
      const evidence = evidenceFields(input.evidence);
      const measurementInsert = await supabase
        .from('measurement_observations')
        .insert([
          measurementRow(project.id, space.id, objectId, 'object.width', input.widthMm, auth.session.user.id, evidence),
          measurementRow(project.id, space.id, objectId, 'object.depth', input.depthMm, auth.session.user.id, evidence),
          measurementRow(project.id, space.id, objectId, 'object.height', input.heightMm, auth.session.user.id, evidence),
        ])
        .select('id');
      if (measurementInsert.error) throw measurementInsert.error;
      const refs = (measurementInsert.data ?? []).map((row: { id: string }) => row.id);
      if (refs.length !== 3) throw new Error('FormShift could not record all object dimensions.');

      const object: SpatialObject = {
        id: objectId,
        label: input.label.trim(),
        category: input.category?.trim() || 'furniture',
        movable: true,
        measurementState: input.evidence === 'measured' ? 'user_confirmed' : 'estimated',
        dimensions: { width: input.widthMm, depth: input.depthMm, height: input.heightMm },
        transform: {
          translation: { x: bounds.minX + bounds.width / 2, y: input.heightMm / 2, z: bounds.minZ + bounds.depth / 2 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
        },
      };

      const next: SpatialSnapshot = {
        ...workingSnapshot,
        objects: [...workingSnapshot.objects, object],
        measurementRefs: [...workingSnapshot.measurementRefs, ...refs],
      };

      const versionId = await commitSpatialVersion(next, 'arrange', activeVersionId);
      setActiveVersionId(versionId);
      setPersistedSnapshot(next);
      setWorkingSnapshotState(next);
      setDirty(false);
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      throw new Error(message);
    } finally {
      setBusy(false);
    }
  }, [activeVersionId, auth.session, commitSpatialVersion, project, space, workingSnapshot]);

  const saveArrangement = useCallback(async () => {
    if (!workingSnapshot || !space) return;
    if (!dirty) return;
    setBusy(true);
    setError(null);

    try {
      const versionId = await commitSpatialVersion(workingSnapshot, 'arrange', activeVersionId);
      setActiveVersionId(versionId);
      setPersistedSnapshot(workingSnapshot);
      setDirty(false);
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      throw new Error(message);
    } finally {
      setBusy(false);
    }
  }, [activeVersionId, commitSpatialVersion, dirty, space, workingSnapshot]);

  const acceptOrganizeProposal = useCallback(async (basisVersionId: string, actions: LayoutAction[]) => {
    if (!supabase || !space || !workingSnapshot || !activeVersionId) throw new Error('A committed room version is required.');
    if (dirty) throw new Error('Save or discard Arrange changes before accepting an Organize proposal.');
    if (basisVersionId !== activeVersionId) throw new Error('This proposal is stale because the room has changed. Generate new Organize options.');

    const activeCheck = await supabase
      .from('spaces')
      .select('active_spatial_version_id')
      .eq('id', space.id)
      .single();
    if (activeCheck.error) throw activeCheck.error;
    if (activeCheck.data.active_spatial_version_id !== basisVersionId) {
      await load();
      throw new Error('This proposal is stale because the room changed elsewhere. Generate new Organize options.');
    }

    const validationErrors = validateOrganizeActions(workingSnapshot, actions);
    if (validationErrors.length > 0) throw new Error(validationErrors[0]);

    const next = applyActions(workingSnapshot, actions);
    setBusy(true);
    setError(null);

    try {
      const versionId = await commitSpatialVersion(next, 'organize', basisVersionId);
      setActiveVersionId(versionId);
      setPersistedSnapshot(next);
      setWorkingSnapshotState(next);
      setDirty(false);
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      throw new Error(message);
    } finally {
      setBusy(false);
    }
  }, [activeVersionId, commitSpatialVersion, dirty, load, space, workingSnapshot]);

  return {
    loading,
    busy,
    error,
    project,
    space,
    photoUrl,
    activeVersionId,
    workingSnapshot,
    dirty,
    measurementSummary,
    refresh: load,
    initializeRoom,
    addObject,
    setWorkingSnapshot,
    discardArrangement,
    saveArrangement,
    acceptOrganizeProposal,
  };
}

async function summarizeRoomMeasurements(snapshot: SpatialSnapshot): Promise<'needs_dimensions' | 'estimated' | 'measured' | 'mixed'> {
  if (!supabase || snapshot.measurementRefs.length === 0) return 'needs_dimensions';
  const result = await supabase
    .from('measurement_observations')
    .select('dimension_key, verification_state')
    .in('id', snapshot.measurementRefs);
  if (result.error) throw result.error;
  const roomRows = (result.data ?? []).filter((row: { dimension_key: string }) => row.dimension_key.startsWith('room.')) as Array<{ dimension_key: string; verification_state: MeasurementState }>;
  if (roomRows.length < 2) return 'needs_dimensions';
  const states = new Set(roomRows.map((row) => row.verification_state));
  if (states.size > 1) return 'mixed';
  return states.has('user_confirmed') || states.has('measured') ? 'measured' : 'estimated';
}

function measurementRow(projectId: string, spaceId: string, entityId: string, dimensionKey: string, valueMm: number, userId: string, evidence: { source: 'manual_verified' | 'manual_unverified'; verification_state: 'user_confirmed' | 'estimated' }) {
  return {
    project_id: projectId,
    space_id: spaceId,
    entity_id: entityId,
    dimension_key: dimensionKey,
    value_mm: valueMm,
    source: evidence.source,
    verification_state: evidence.verification_state,
    device_context: { platform: Platform.OS, input: 'manual' },
    created_by: userId,
    notes: evidence.source === 'manual_verified' ? 'User entered a measured dimension.' : 'User entered an approximate dimension.',
  };
}

function evidenceFields(mode: EvidenceMode) {
  return mode === 'measured'
    ? { source: 'manual_verified' as const, verification_state: 'user_confirmed' as const }
    : { source: 'manual_unverified' as const, verification_state: 'estimated' as const };
}

function validatePositiveDimensions(...values: number[]) {
  if (!values.every((value) => Number.isFinite(value) && value > 0)) throw new Error('All dimensions must be greater than zero.');
}

function roomBounds(snapshot: SpatialSnapshot) {
  const xs = snapshot.boundary.floorPolygon.map((point) => point.x);
  const zs = snapshot.boundary.floorPolygon.map((point) => point.z);
  if (xs.length < 3 || zs.length < 3) return null;
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  return { minX, maxX, minZ, maxZ, width: maxX - minX, depth: maxZ - minZ };
}

function makeObjectId(label: string) {
  const slug = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 28) || 'object';
  return `${slug}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

async function hashSnapshot(snapshot: SpatialSnapshot) {
  const value = canonicalJson(snapshot);
  const cryptoApi = (globalThis as any).crypto;
  const Encoder = (globalThis as any).TextEncoder;
  if (cryptoApi?.subtle && Encoder) {
    const bytes = new Encoder().encode(value);
    const digest = await cryptoApi.subtle.digest('SHA-256', bytes);
    return `sha256:${Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  }
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, nested]) => [key, sortValue(nested)]));
  }
  return value;
}

function errorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
  return 'FormShift could not update the room.';
}
