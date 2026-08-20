import type { OpenShelvingPlanDraft, SpatialObject, SpatialSnapshot } from '@formshift/domain';
import { supabase } from '../auth/AuthProvider';

export type RestoredNormalizedBuildBrief = {
  label: string;
  archetype: 'shelving' | 'cabinet' | 'storage' | 'desk' | 'bench' | 'other';
  purpose: string;
  targetWidthMm: number | null;
  targetHeightMm: number | null;
  targetDepthMm: number | null;
  interiorShelfCount: number | null;
  installationType: 'freestanding' | 'wall_anchored' | 'built_in' | 'unknown';
  placementIntent: string;
  materialPreferences: string[];
  constraints: string[];
  missingCriticalInformation: string[];
};

export type RestoredBuildPlan = {
  brief: string;
  normalized: RestoredNormalizedBuildBrief;
  plan: OpenShelvingPlanDraft;
  buildRequestId: string;
  buildPlanId: string;
  buildObjectId?: string;
};

type JsonRecord = Record<string, unknown>;

export async function loadLatestSavedBuildPlan({
  projectId,
  spaceId,
  snapshot,
}: {
  projectId: string;
  spaceId: string;
  snapshot: SpatialSnapshot;
}): Promise<RestoredBuildPlan | null> {
  if (!supabase) return null;

  const requestResult = await supabase
    .from('build_requests')
    .select('id, brief_text, normalized_brief, created_at')
    .eq('project_id', projectId)
    .eq('space_id', spaceId)
    .eq('status', 'generated')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (requestResult.error) throw requestResult.error;
  if (!requestResult.data) return null;

  const request = requestResult.data as {
    id: string;
    brief_text: string;
    normalized_brief: unknown;
  };

  const planResult = await supabase
    .from('build_plans')
    .select('id, archetype, archetype_version, geometry_json, placement_json, validation_result, verification_status, plan_version')
    .eq('build_request_id', request.id)
    .order('plan_version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (planResult.error) throw planResult.error;
  if (!planResult.data) return null;

  const persisted = planResult.data as {
    id: string;
    archetype: string;
    archetype_version: string;
    geometry_json: unknown;
    placement_json: unknown;
    validation_result: unknown;
  };
  if (persisted.archetype !== 'open_shelving' || persisted.archetype_version !== 'open-shelving-1') return null;

  const [componentResult, materialResult, costResult, effortResult] = await Promise.all([
    supabase
      .from('build_components')
      .select('component_key, label, quantity, dimensions_json, material_key, cut_notes, sort_order')
      .eq('build_plan_id', persisted.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('material_items')
      .select('material_key, description, quantity, unit, dimensions_spec, waste_factor, confirmation_required, assumptions')
      .eq('build_plan_id', persisted.id)
      .order('material_key', { ascending: true }),
    supabase
      .from('cost_estimates')
      .select('low_amount, expected_amount, high_amount, currency, waste_assumption, assumptions, exclusions')
      .eq('build_plan_id', persisted.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('effort_estimates')
      .select('assumed_skill_level, difficulty, active_low_hours, active_high_hours, elapsed_low_hours, elapsed_high_hours, tool_profile, task_breakdown, assumptions')
      .eq('build_plan_id', persisted.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const firstError = componentResult.error || materialResult.error || costResult.error || effortResult.error;
  if (firstError) throw firstError;
  if (!costResult.data || !effortResult.data) throw new Error('Saved Build plan is missing cost or effort records.');

  const geometryJson = record(persisted.geometry_json);
  const geometry = {
    widthMm: finiteNumber(geometryJson.widthMm, 'saved width'),
    heightMm: finiteNumber(geometryJson.heightMm, 'saved height'),
    depthMm: finiteNumber(geometryJson.depthMm, 'saved depth'),
    panelThicknessMm: finiteNumber(geometryJson.panelThicknessMm, 'saved panel thickness'),
    interiorSpanMm: finiteNumber(geometryJson.interiorSpanMm, 'saved interior span'),
    interiorShelves: integerNumber(geometryJson.interiorShelves, 'saved interior shelf count'),
    sheetCountPlanning: integerNumber(geometryJson.sheetCountPlanning, 'saved sheet count'),
  };

  const normalized = normalizeBrief(request.normalized_brief, geometry);
  const placement = normalizePlacement(persisted.placement_json, geometry.heightMm);
  const matchedObject = findPersistedObject(snapshot, geometry, placement);
  const object: SpatialObject = matchedObject ?? {
    id: `persisted-build-${persisted.id}`,
    label: normalized.label || 'Open shelving',
    category: 'custom_build',
    movable: true,
    measurementState: 'estimated',
    dimensions: { width: geometry.widthMm, height: geometry.heightMm, depth: geometry.depthMm },
    transform: placement,
  };

  const components: OpenShelvingPlanDraft['components'] = (componentResult.data ?? []).map((row) => {
    const item = row as {
      component_key: string;
      label: string;
      quantity: number | string;
      dimensions_json: unknown;
      material_key: string | null;
      cut_notes: string | null;
      sort_order: number;
    };
    const dimensions = record(item.dimensions_json);
    return {
      componentKey: item.component_key,
      label: item.label,
      quantity: finiteNumber(item.quantity, 'component quantity'),
      dimensionsJson: {
        lengthMm: finiteNumber(dimensions.lengthMm, 'component length'),
        widthMm: finiteNumber(dimensions.widthMm, 'component width'),
        thicknessMm: finiteNumber(dimensions.thicknessMm, 'component thickness'),
      },
      materialKey: item.material_key ?? '',
      cutNotes: item.cut_notes ?? '',
      sortOrder: item.sort_order,
    };
  });

  const materials: OpenShelvingPlanDraft['materials'] = (materialResult.data ?? []).map((row) => {
    const item = row as {
      material_key: string;
      description: string;
      quantity: number | string;
      unit: string;
      dimensions_spec: string | null;
      waste_factor: number | string;
      confirmation_required: boolean;
      assumptions: unknown;
    };
    return {
      materialKey: item.material_key,
      description: item.description,
      quantity: finiteNumber(item.quantity, 'material quantity'),
      unit: item.unit,
      dimensionsSpec: item.dimensions_spec,
      wasteFactor: finiteNumber(item.waste_factor, 'material waste factor'),
      confirmationRequired: item.confirmation_required,
      assumptions: stringArray(item.assumptions),
    };
  });

  const costRow = costResult.data as {
    low_amount: number | string;
    expected_amount: number | string;
    high_amount: number | string;
    currency: string;
    waste_assumption: number | string | null;
    assumptions: unknown;
    exclusions: unknown;
  };
  const cost: OpenShelvingPlanDraft['cost'] = {
    lowAmount: finiteNumber(costRow.low_amount, 'cost low amount'),
    expectedAmount: finiteNumber(costRow.expected_amount, 'cost expected amount'),
    highAmount: finiteNumber(costRow.high_amount, 'cost high amount'),
    currency: 'USD',
    wasteAssumption: nullableNumber(costRow.waste_assumption) ?? 0,
    assumptions: stringArray(costRow.assumptions),
    exclusions: stringArray(costRow.exclusions),
  };

  const effortRow = effortResult.data as {
    assumed_skill_level: string;
    difficulty: string;
    active_low_hours: number | string;
    active_high_hours: number | string;
    elapsed_low_hours: number | string | null;
    elapsed_high_hours: number | string | null;
    tool_profile: unknown;
    task_breakdown: unknown;
    assumptions: unknown;
  };
  const effort: OpenShelvingPlanDraft['effort'] = {
    assumedSkillLevel: 'intermediate',
    difficulty: normalizeDifficulty(effortRow.difficulty),
    activeLowHours: finiteNumber(effortRow.active_low_hours, 'effort low hours'),
    activeHighHours: finiteNumber(effortRow.active_high_hours, 'effort high hours'),
    elapsedLowHours: nullableNumber(effortRow.elapsed_low_hours),
    elapsedHighHours: nullableNumber(effortRow.elapsed_high_hours),
    toolProfile: stringArray(effortRow.tool_profile),
    taskBreakdown: taskBreakdown(effortRow.task_breakdown),
    assumptions: stringArray(effortRow.assumptions),
  };

  const validationJson = record(persisted.validation_result);
  const validation: OpenShelvingPlanDraft['validation'] = {
    valid: validationJson.valid === true,
    errors: stringArray(validationJson.errors),
    warnings: stringArray(validationJson.warnings),
    assumptions: stringArray(validationJson.assumptions),
  };

  const plan: OpenShelvingPlanDraft = {
    schemaVersion: 'build-plan-1',
    archetype: 'open_shelving',
    archetypeVersion: 'open-shelving-1',
    input: {
      objectId: object.id,
      label: object.label,
      widthMm: geometry.widthMm,
      heightMm: geometry.heightMm,
      depthMm: geometry.depthMm,
      interiorShelves: geometry.interiorShelves,
    },
    object,
    geometry,
    components,
    materials,
    cost,
    effort,
    validation,
  };

  return {
    brief: request.brief_text,
    normalized,
    plan,
    buildRequestId: request.id,
    buildPlanId: persisted.id,
    buildObjectId: matchedObject?.id,
  };
}

function normalizeBrief(value: unknown, geometry: OpenShelvingPlanDraft['geometry']): RestoredNormalizedBuildBrief {
  const source = record(value);
  return {
    label: stringValue(source.label, 'Open shelving'),
    archetype: normalizeArchetype(source.archetype),
    purpose: stringValue(source.purpose, 'Storage'),
    targetWidthMm: nullableNumber(source.targetWidthMm),
    targetHeightMm: nullableNumber(source.targetHeightMm),
    targetDepthMm: nullableNumber(source.targetDepthMm),
    interiorShelfCount: nullableInteger(source.interiorShelfCount),
    installationType: normalizeInstallation(source.installationType),
    placementIntent: stringValue(source.placementIntent, 'Freestanding floor placement'),
    materialPreferences: stringArray(source.materialPreferences),
    constraints: stringArray(source.constraints),
    missingCriticalInformation: stringArray(source.missingCriticalInformation),
  };
}

function normalizePlacement(value: unknown, heightMm: number): SpatialObject['transform'] {
  const source = record(value);
  const translation = record(source.translation);
  const rotation = record(source.rotation);
  return {
    translation: {
      x: finiteNumber(translation.x, 'saved placement x'),
      y: nullableNumber(translation.y) ?? heightMm / 2,
      z: finiteNumber(translation.z, 'saved placement z'),
    },
    rotation: {
      x: nullableNumber(rotation.x) ?? 0,
      y: nullableNumber(rotation.y) ?? 0,
      z: nullableNumber(rotation.z) ?? 0,
      w: nullableNumber(rotation.w) ?? 1,
    },
  };
}

function findPersistedObject(
  snapshot: SpatialSnapshot,
  geometry: OpenShelvingPlanDraft['geometry'],
  placement: SpatialObject['transform'],
) {
  return snapshot.objects.find((object) =>
    object.category === 'custom_build'
    && close(object.dimensions.width, geometry.widthMm)
    && close(object.dimensions.height, geometry.heightMm)
    && close(object.dimensions.depth, geometry.depthMm)
    && close(object.transform.translation.x, placement.translation.x, 1)
    && close(object.transform.translation.z, placement.translation.z, 1),
  );
}

function taskBreakdown(value: unknown): OpenShelvingPlanDraft['effort']['taskBreakdown'] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const row = record(entry);
    const task = typeof row.task === 'string' ? row.task : null;
    const lowHours = nullableNumber(row.lowHours);
    const highHours = nullableNumber(row.highHours);
    return task && lowHours != null && highHours != null ? [{ task, lowHours, highHours }] : [];
  });
}

function record(value: unknown): JsonRecord {
  return value != null && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function finiteNumber(value: unknown, label: string) {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label} is invalid.`);
  return number;
}

function integerNumber(value: unknown, label: string) {
  const number = finiteNumber(value, label);
  if (!Number.isInteger(number)) throw new Error(`${label} is invalid.`);
  return number;
}

function nullableNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function nullableInteger(value: unknown): number | null {
  const number = nullableNumber(value);
  return number != null && Number.isInteger(number) ? number : null;
}

function close(a: number, b: number, epsilon = 0.01) {
  return Math.abs(a - b) <= epsilon;
}

function normalizeArchetype(value: unknown): RestoredNormalizedBuildBrief['archetype'] {
  return value === 'cabinet' || value === 'storage' || value === 'desk' || value === 'bench' || value === 'other' ? value : 'shelving';
}

function normalizeInstallation(value: unknown): RestoredNormalizedBuildBrief['installationType'] {
  return value === 'wall_anchored' || value === 'built_in' || value === 'unknown' ? value : 'freestanding';
}

function normalizeDifficulty(value: string): OpenShelvingPlanDraft['effort']['difficulty'] {
  return value === 'easy' || value === 'advanced' ? value : 'moderate';
}
