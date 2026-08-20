-- FormShift Phase 3: atomic acceptance for the first Class A Build archetype.
-- The API deterministically recomputes/validates the plan before invoking this RPC.
-- This function independently enforces user/project/version ownership and basic
-- room-envelope invariants, then commits all Build records and the new spatial
-- version in one PostgreSQL transaction.

create or replace function public.accept_shelving_build_plan(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_project uuid := (p_payload->>'projectId')::uuid;
  v_space uuid := (p_payload->>'spaceId')::uuid;
  v_source_version uuid := (p_payload->>'sourceSpatialVersionId')::uuid;
  v_request_id uuid := pg_catalog.gen_random_uuid();
  v_plan_id uuid := pg_catalog.gen_random_uuid();
  v_spatial_version_id uuid := pg_catalog.gen_random_uuid();
  v_width_measurement_id uuid := pg_catalog.gen_random_uuid();
  v_height_measurement_id uuid := pg_catalog.gen_random_uuid();
  v_depth_measurement_id uuid := pg_catalog.gen_random_uuid();
  v_source_model jsonb;
  v_model jsonb;
  v_build_object jsonb := p_payload->'buildObject';
  v_object_id text := p_payload#>>'{buildObject,id}';
  v_width numeric := (p_payload#>>'{buildObject,dimensions,width}')::numeric;
  v_height numeric := (p_payload#>>'{buildObject,dimensions,height}')::numeric;
  v_depth numeric := (p_payload#>>'{buildObject,dimensions,depth}')::numeric;
  v_x numeric := (p_payload#>>'{buildObject,transform,translation,x}')::numeric;
  v_y numeric := (p_payload#>>'{buildObject,transform,translation,y}')::numeric;
  v_z numeric := (p_payload#>>'{buildObject,transform,translation,z}')::numeric;
  v_min_x numeric;
  v_max_x numeric;
  v_min_z numeric;
  v_max_z numeric;
  v_ceiling numeric;
  v_hash text;
begin
  if v_user is null then
    raise exception 'authentication_required';
  end if;
  if v_project is null or v_space is null or v_source_version is null then
    raise exception 'project_space_version_required';
  end if;
  if not private.can_edit_project(v_project) then
    raise exception 'project_edit_not_authorized';
  end if;

  select sv.model_json
  into v_source_model
  from public.spaces s
  join public.spatial_versions sv on sv.id = s.active_spatial_version_id
  where s.id = v_space
    and s.project_id = v_project
    and s.active_spatial_version_id = v_source_version
    and sv.space_id = v_space
    and sv.status = 'committed';

  if v_source_model is null then
    raise exception 'stale_spatial_version';
  end if;
  if v_source_model->>'spaceId' is distinct from v_space::text then
    raise exception 'spatial_space_mismatch';
  end if;
  if v_build_object is null or coalesce(v_object_id, '') = '' then
    raise exception 'build_object_required';
  end if;
  if v_width <= 0 or v_height <= 0 or v_depth <= 0 then
    raise exception 'invalid_build_dimensions';
  end if;
  if pg_catalog.abs(v_y - v_height / 2) > 1 then
    raise exception 'build_must_rest_on_floor';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(coalesce(v_source_model->'objects', '[]'::jsonb)) as existing
    where existing->>'id' = v_object_id
  ) then
    raise exception 'duplicate_build_object_id';
  end if;

  select min((point->>'x')::numeric), max((point->>'x')::numeric),
         min((point->>'z')::numeric), max((point->>'z')::numeric)
  into v_min_x, v_max_x, v_min_z, v_max_z
  from jsonb_array_elements(coalesce(v_source_model#>'{boundary,floorPolygon}', '[]'::jsonb)) as point;

  if v_min_x is not null and (
    v_x - v_width / 2 < v_min_x or v_x + v_width / 2 > v_max_x
    or v_z - v_depth / 2 < v_min_z or v_z + v_depth / 2 > v_max_z
  ) then
    raise exception 'build_leaves_room_envelope';
  end if;

  v_ceiling := nullif(v_source_model#>>'{boundary,ceilingHeightMm}', '')::numeric;
  if v_ceiling is not null and v_height > v_ceiling then
    raise exception 'build_exceeds_ceiling';
  end if;

  insert into public.build_requests (
    id, project_id, space_id, source_spatial_version_id, actor_user_id,
    brief_text, normalized_brief, risk_class, status
  ) values (
    v_request_id, v_project, v_space, v_source_version, v_user,
    p_payload->>'briefText', coalesce(p_payload->'normalizedBrief', '{}'::jsonb), 'A', 'generated'
  );

  insert into public.build_plans (
    id, project_id, build_request_id, source_spatial_version_id, plan_version,
    archetype, archetype_version, geometry_json, placement_json,
    verification_status, validation_result, created_by
  ) values (
    v_plan_id, v_project, v_request_id, v_source_version, 1,
    'open_shelving', 'open-shelving-1', coalesce(p_payload->'geometry', '{}'::jsonb),
    coalesce(v_build_object->'transform', '{}'::jsonb), 'planning',
    coalesce(p_payload->'validation', '{}'::jsonb), v_user
  );

  insert into public.build_components (
    project_id, build_plan_id, component_key, label, quantity,
    dimensions_json, material_key, cut_notes, sort_order
  )
  select
    v_project, v_plan_id,
    component->>'componentKey', component->>'label', (component->>'quantity')::numeric,
    coalesce(component->'dimensionsJson', '{}'::jsonb), component->>'materialKey',
    component->>'cutNotes', (component->>'sortOrder')::integer
  from jsonb_array_elements(coalesce(p_payload->'components', '[]'::jsonb)) as component;

  insert into public.material_items (
    project_id, build_plan_id, material_key, description, quantity, unit,
    dimensions_spec, waste_factor, confirmation_required, assumptions
  )
  select
    v_project, v_plan_id,
    material->>'materialKey', material->>'description', (material->>'quantity')::numeric,
    material->>'unit', material->>'dimensionsSpec', (material->>'wasteFactor')::numeric,
    coalesce((material->>'confirmationRequired')::boolean, false),
    coalesce(material->'assumptions', '[]'::jsonb)
  from jsonb_array_elements(coalesce(p_payload->'materials', '[]'::jsonb)) as material;

  insert into public.cost_estimates (
    project_id, build_plan_id, low_amount, expected_amount, high_amount, currency,
    waste_assumption, assumptions, exclusions, created_by
  ) values (
    v_project, v_plan_id,
    (p_payload#>>'{cost,lowAmount}')::numeric,
    (p_payload#>>'{cost,expectedAmount}')::numeric,
    (p_payload#>>'{cost,highAmount}')::numeric,
    coalesce(p_payload#>>'{cost,currency}', 'USD'),
    (p_payload#>>'{cost,wasteAssumption}')::numeric,
    coalesce(p_payload#>'{cost,assumptions}', '[]'::jsonb),
    coalesce(p_payload#>'{cost,exclusions}', '[]'::jsonb),
    v_user
  );

  insert into public.effort_estimates (
    project_id, build_plan_id, assumed_skill_level, tool_profile, difficulty,
    active_low_hours, active_high_hours, elapsed_low_hours, elapsed_high_hours,
    task_breakdown, assumptions, created_by
  ) values (
    v_project, v_plan_id,
    coalesce(p_payload#>>'{effort,assumedSkillLevel}', 'intermediate'),
    coalesce(p_payload#>'{effort,toolProfile}', '[]'::jsonb),
    coalesce(p_payload#>>'{effort,difficulty}', 'moderate'),
    (p_payload#>>'{effort,activeLowHours}')::numeric,
    (p_payload#>>'{effort,activeHighHours}')::numeric,
    nullif(p_payload#>>'{effort,elapsedLowHours}', '')::numeric,
    nullif(p_payload#>>'{effort,elapsedHighHours}', '')::numeric,
    coalesce(p_payload#>'{effort,taskBreakdown}', '[]'::jsonb),
    coalesce(p_payload#>'{effort,assumptions}', '[]'::jsonb),
    v_user
  );

  insert into public.measurement_observations (
    id, project_id, space_id, entity_id, dimension_key, value_mm, source,
    confidence, verification_state, created_by, notes
  ) values
    (v_width_measurement_id, v_project, v_space, v_object_id, 'object.width', v_width,
      'build_derived', 1, 'estimated', v_user,
      'Design dimension derived from accepted Build plan; not an as-built measurement.'),
    (v_height_measurement_id, v_project, v_space, v_object_id, 'object.height', v_height,
      'build_derived', 1, 'estimated', v_user,
      'Design dimension derived from accepted Build plan; not an as-built measurement.'),
    (v_depth_measurement_id, v_project, v_space, v_object_id, 'object.depth', v_depth,
      'build_derived', 1, 'estimated', v_user,
      'Design dimension derived from accepted Build plan; not an as-built measurement.');

  v_model := jsonb_set(
    v_source_model,
    '{objects}',
    coalesce(v_source_model->'objects', '[]'::jsonb) || jsonb_build_array(v_build_object),
    true
  );
  v_model := jsonb_set(
    v_model,
    '{measurementRefs}',
    coalesce(v_model->'measurementRefs', '[]'::jsonb)
      || jsonb_build_array(v_width_measurement_id::text, v_height_measurement_id::text, v_depth_measurement_id::text),
    true
  );

  v_hash := 'sha256:' || pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(v_model::text, 'UTF8'), 'sha256'),
    'hex'
  );

  insert into public.spatial_versions (
    id, space_id, parent_version_id, schema_version, source_mode,
    created_by, model_hash, model_json, status
  ) values (
    v_spatial_version_id, v_space, v_source_version, 'spatial-1', 'build-placement',
    v_user, v_hash, v_model, 'committed'
  );

  -- Preserve every measurement relation inherited by the source version, then add
  -- this accepted build's design dimensions. The spatial snapshot and relational
  -- evidence ledger therefore describe the same complete evidence set.
  insert into public.spatial_version_measurements (spatial_version_id, measurement_id)
  select v_spatial_version_id, svm.measurement_id
  from public.spatial_version_measurements svm
  where svm.spatial_version_id = v_source_version
  on conflict do nothing;

  insert into public.spatial_version_measurements (spatial_version_id, measurement_id)
  values
    (v_spatial_version_id, v_width_measurement_id),
    (v_spatial_version_id, v_height_measurement_id),
    (v_spatial_version_id, v_depth_measurement_id)
  on conflict do nothing;

  update public.spaces
  set active_spatial_version_id = v_spatial_version_id,
      updated_at = now()
  where id = v_space and project_id = v_project and active_spatial_version_id = v_source_version;

  if not found then
    raise exception 'stale_spatial_version';
  end if;

  return jsonb_build_object(
    'buildRequestId', v_request_id,
    'buildPlanId', v_plan_id,
    'spatialVersionId', v_spatial_version_id,
    'buildObjectId', v_object_id
  );
end;
$$;

revoke all on function public.accept_shelving_build_plan(jsonb) from public;
revoke all on function public.accept_shelving_build_plan(jsonb) from anon;
grant execute on function public.accept_shelving_build_plan(jsonb) to authenticated;

comment on function public.accept_shelving_build_plan(jsonb) is
  'Atomically accepts a validated Class A open-shelving Build plan for the authenticated project editor.';
