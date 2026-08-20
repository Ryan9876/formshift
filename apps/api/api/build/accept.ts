import {
  createOpenShelvingPlan,
  validateSnapshot,
  type OpenShelvingDesignInput,
  type SpatialSnapshot,
} from '@formshift/domain';
import { requireEditableSpace } from '../../src/auth.js';
import { json, parseJson, preflight } from '../../src/http.js';

type Body = {
  projectId: string;
  spaceId: string;
  spatialVersionId: string;
  briefText: string;
  normalizedBrief: unknown;
  design: OpenShelvingDesignInput;
  placement: { x: number; z: number };
};

export function OPTIONS(request: Request) { return preflight(request); }

export async function POST(request: Request) {
  try {
    const body = await parseJson<Body>(request);
    if (!body.projectId || !body.spaceId || !body.spatialVersionId || !body.briefText?.trim()) {
      return json(request, { error: 'project_space_version_brief_required' }, 400);
    }
    if (!body.design?.objectId || !body.placement || ![body.placement.x, body.placement.z].every(Number.isFinite)) {
      return json(request, { error: 'valid_design_and_placement_required' }, 400);
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

    // Recompute the entire Build plan server-side. Client-supplied BOM/cost/validation
    // is never trusted for persistence.
    const plan = createOpenShelvingPlan(snapshot, body.design, body.placement);
    if (!plan.validation.valid) {
      return json(request, { error: 'invalid_build_plan', details: plan.validation.errors }, 422);
    }

    const { data: accepted, error: acceptError } = await active.client.rpc('accept_shelving_build_plan', {
      p_payload: {
        projectId: body.projectId,
        spaceId: body.spaceId,
        sourceSpatialVersionId: body.spatialVersionId,
        briefText: body.briefText.trim(),
        normalizedBrief: body.normalizedBrief ?? {},
        buildObject: plan.object,
        geometry: plan.geometry,
        components: plan.components,
        materials: plan.materials,
        cost: plan.cost,
        effort: plan.effort,
        validation: plan.validation,
      }
    });

    if (acceptError) {
      const message = acceptError.message ?? 'Build acceptance failed.';
      if (message.includes('stale_spatial_version')) return json(request, { error: 'stale_spatial_version' }, 409);
      return json(request, { error: 'build_accept_failed', message }, 500);
    }

    return json(request, { status: 'accepted', accepted, plan });
  } catch (error) {
    if (error instanceof Response) return json(request, { error: await error.text() }, error.status);
    return json(request, { error: 'build_accept_failed', message: error instanceof Error ? error.message : 'unknown error' }, 500);
  }
}
