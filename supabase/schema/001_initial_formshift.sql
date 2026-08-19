-- FormShift initial Supabase schema source (v0.4.0)
-- Apply only to a dedicated FormShift project after cost/project confirmation.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.access_status as enum ('pending','active','suspended','revoked');
create type public.project_role as enum ('owner','editor','viewer');
create type public.measurement_state as enum ('estimated','measured','user_confirmed','invalidated');

create table private.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.account_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status public.access_status not null default 'pending',
  is_owner boolean not null default false,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  suspended_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  normalized_email text,
  status text not null default 'pending' check (status in ('pending','claimed','revoked','expired')),
  created_by uuid not null references auth.users(id),
  expires_at timestamptz,
  claimed_by uuid references auth.users(id),
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id),
  name text not null check (length(trim(name)) between 1 and 120),
  default_unit_system text not null default 'imperial' check (default_unit_system in ('imperial','metric')),
  status text not null default 'active' check (status in ('active','archived','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.project_role not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  primary key(project_id,user_id)
);
create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  space_type text not null default 'room',
  active_spatial_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.measurement_observations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade,
  entity_id text,
  dimension_key text not null,
  value_mm numeric(14,4) not null check (value_mm >= 0),
  source text not null check (source in ('manual_verified','manual_unverified','ios_roomplan','scale_reference_derived','photo_estimate','imported','build_derived')),
  tolerance_mm numeric(14,4),
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  verification_state public.measurement_state not null,
  device_context jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  supersedes_measurement_id uuid references public.measurement_observations(id),
  notes text
);
create table public.spatial_versions (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  parent_version_id uuid references public.spatial_versions(id),
  schema_version text not null,
  source_mode text not null check (source_mode in ('capture','organize','arrange','build-placement','correction')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  model_hash text not null,
  model_json jsonb not null,
  status text not null default 'committed' check (status in ('draft','committed','superseded')),
  unique(space_id, model_hash)
);
alter table public.spaces add constraint spaces_active_version_fk foreign key (active_spatial_version_id) references public.spatial_versions(id);
create table public.spatial_version_measurements (
  spatial_version_id uuid not null references public.spatial_versions(id) on delete cascade,
  measurement_id uuid not null references public.measurement_observations(id),
  primary key(spatial_version_id, measurement_id)
);
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  space_id uuid references public.spaces(id) on delete cascade,
  kind text not null,
  storage_bucket text not null default 'formshift-private',
  storage_path text not null,
  mime_type text,
  byte_size bigint,
  sha256 text,
  privacy_class text not null default 'private_household',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(storage_bucket, storage_path)
);
create table public.captures (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  capture_type text not null check (capture_type in ('photo','roomplan','imported')),
  status text not null default 'captured',
  source_asset_ids uuid[] not null default '{}',
  device_context jsonb not null default '{}'::jsonb,
  capability_context jsonb not null default '{}'::jsonb,
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.saved_layouts (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  name text not null,
  spatial_version_id uuid not null references public.spatial_versions(id),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.organize_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade,
  source_spatial_version_id uuid not null references public.spatial_versions(id),
  actor_user_id uuid not null references auth.users(id),
  status text not null default 'queued' check (status in ('queued','running','completed','failed','cancelled')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create table public.organize_proposals (
  id uuid primary key default gen_random_uuid(),
  organize_run_id uuid not null references public.organize_runs(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade,
  rank smallint not null check (rank between 1 and 10),
  proposal_schema_version text not null,
  proposed_model_delta jsonb not null,
  resulting_spatial_version_id uuid references public.spatial_versions(id),
  validation_status text not null default 'pending' check (validation_status in ('pending','valid','invalid','needs_review')),
  user_disposition text not null default 'unreviewed' check (user_disposition in ('unreviewed','accepted','edited','rejected')),
  rationale text not null,
  assumptions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organize_run_id, rank)
);
create table public.build_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade,
  source_spatial_version_id uuid not null references public.spatial_versions(id),
  actor_user_id uuid not null references auth.users(id),
  brief_text text not null,
  normalized_brief jsonb not null default '{}'::jsonb,
  risk_class text not null default 'A' check (risk_class in ('A','B','C')),
  status text not null default 'draft' check (status in ('draft','needs_measurements','ready','generated','cancelled','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.build_plans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  build_request_id uuid not null references public.build_requests(id) on delete cascade,
  source_spatial_version_id uuid not null references public.spatial_versions(id),
  plan_version integer not null default 1 check (plan_version > 0),
  archetype text not null,
  archetype_version text not null,
  geometry_json jsonb not null,
  placement_json jsonb not null default '{}'::jsonb,
  verification_status text not null default 'planning' check (verification_status in ('planning','partially_verified','dimension_verified','external_verification_required')),
  validation_result jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique(build_request_id, plan_version)
);
create table public.build_components (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  build_plan_id uuid not null references public.build_plans(id) on delete cascade,
  component_key text not null,
  label text not null,
  quantity numeric(12,3) not null default 1 check (quantity > 0),
  dimensions_json jsonb not null,
  material_key text,
  cut_notes text,
  sort_order integer not null default 0,
  unique(build_plan_id, component_key)
);
create table public.material_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  build_plan_id uuid not null references public.build_plans(id) on delete cascade,
  build_component_id uuid references public.build_components(id) on delete set null,
  material_key text not null,
  description text not null,
  quantity numeric(14,4) not null check (quantity >= 0),
  unit text not null,
  dimensions_spec text,
  waste_factor numeric(7,4) not null default 0 check (waste_factor >= 0 and waste_factor <= 1),
  confirmation_required boolean not null default false,
  assumptions jsonb not null default '[]'::jsonb
);
create table public.price_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  material_key text not null,
  description text not null,
  region text,
  source_label text not null,
  source_as_of date not null,
  unit_price numeric(14,4) not null check (unit_price >= 0),
  currency char(3) not null default 'USD',
  package_quantity numeric(14,4),
  package_unit text,
  confidence text not null default 'estimated' check (confidence in ('quoted','observed','estimated','manual')),
  status text not null default 'usable' check (status in ('usable','stale','unavailable','needs_confirmation')),
  entered_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.cost_estimates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  build_plan_id uuid not null references public.build_plans(id) on delete cascade,
  low_amount numeric(14,2) not null check (low_amount >= 0),
  expected_amount numeric(14,2) not null check (expected_amount >= 0),
  high_amount numeric(14,2) not null check (high_amount >= 0),
  currency char(3) not null default 'USD',
  pricing_as_of date,
  waste_assumption numeric(7,4) check (waste_assumption is null or (waste_assumption >= 0 and waste_assumption <= 1)),
  assumptions jsonb not null default '[]'::jsonb,
  exclusions jsonb not null default '[]'::jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check (low_amount <= expected_amount and expected_amount <= high_amount)
);
create table public.effort_estimates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  build_plan_id uuid not null references public.build_plans(id) on delete cascade,
  assumed_skill_level text not null check (assumed_skill_level in ('beginner','intermediate','advanced')),
  tool_profile jsonb not null default '[]'::jsonb,
  difficulty text not null check (difficulty in ('easy','moderate','advanced','professional_recommended')),
  active_low_hours numeric(8,2) not null check (active_low_hours >= 0),
  active_high_hours numeric(8,2) not null check (active_high_hours >= 0),
  elapsed_low_hours numeric(8,2),
  elapsed_high_hours numeric(8,2),
  task_breakdown jsonb not null default '[]'::jsonb,
  assumptions jsonb not null default '[]'::jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check (active_low_hours <= active_high_hours),
  check (elapsed_low_hours is null or elapsed_high_hours is null or elapsed_low_hours <= elapsed_high_hours)
);
create table public.exports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade,
  spatial_version_id uuid references public.spatial_versions(id),
  build_plan_id uuid references public.build_plans(id),
  kind text not null check (kind in ('room_plan_pdf','build_plan_pdf','materials_csv','project_bundle')),
  status text not null default 'queued' check (status in ('queued','rendering','ready','failed','deleted')),
  asset_id uuid references public.assets(id) on delete set null,
  measurement_summary jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  space_id uuid references public.spaces(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id),
  job_type text not null,
  status text not null default 'queued' check (status in ('queued','running','completed','failed','cancelled')),
  progress numeric(5,4) not null default 0 check (progress >= 0 and progress <= 1),
  input_ref jsonb not null default '{}'::jsonb,
  output_ref jsonb not null default '{}'::jsonb,
  error_class text,
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);
create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  space_id uuid references public.spaces(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id),
  task_name text not null,
  task_schema_version text not null,
  prompt_version text not null,
  provider_model text,
  input_hash text,
  output_hash text,
  status text not null,
  latency_ms integer,
  token_usage jsonb,
  cost_usd numeric(12,6),
  error_class text,
  created_at timestamptz not null default now()
);
create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id),
  project_id uuid references public.projects(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  correlation_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Authorization helpers live outside exposed schemas. SECURITY DEFINER is intentional to avoid RLS recursion.
create or replace function private.is_active_user() returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.account_access aa where aa.user_id = (select auth.uid()) and aa.status = 'active'
  );
$$;
create or replace function private.is_project_owner(p_project_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_active_user() and exists (
    select 1 from public.projects p where p.id = p_project_id and p.owner_user_id = (select auth.uid()) and p.deleted_at is null
  );
$$;
create or replace function private.project_role_for(p_project_id uuid) returns public.project_role language sql stable security definer set search_path = '' as $$
  select pm.role from public.project_members pm where pm.project_id = p_project_id and pm.user_id = (select auth.uid()) limit 1;
$$;
create or replace function private.can_read_project(p_project_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_active_user() and (
    exists (select 1 from public.projects p where p.id = p_project_id and p.owner_user_id = (select auth.uid()) and p.deleted_at is null)
    or exists (
      select 1 from public.project_members pm join public.projects p on p.id = pm.project_id
      where pm.project_id = p_project_id and pm.user_id = (select auth.uid()) and p.deleted_at is null
    )
  );
$$;
create or replace function private.project_owner_id(p_project_id uuid) returns uuid language sql stable security definer set search_path = '' as $$
  select p.owner_user_id from public.projects p
  where p.id = p_project_id and p.deleted_at is null and private.can_read_project(p_project_id);
$$;
create or replace function private.can_edit_project(p_project_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_project_owner(p_project_id) or (private.can_read_project(p_project_id) and private.project_role_for(p_project_id) in ('owner','editor'));
$$;
create or replace function private.project_id_for_space(p_space_id uuid) returns uuid language sql stable security definer set search_path = '' as $$
  select s.project_id from public.spaces s
  where s.id = p_space_id and private.can_read_project(s.project_id);
$$;
create or replace function private.safe_project_uuid(p_text text) returns uuid language plpgsql immutable set search_path = '' as $$
begin
  if p_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then return p_text::uuid; end if;
  return null;
end; $$;
create or replace function private.is_owner_user() returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_active_user() and exists (
    select 1 from public.account_access aa
    where aa.user_id = (select auth.uid()) and aa.status = 'active' and aa.is_owner = true
  );
$$;

create or replace function private.is_configured_owner() returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null
    and lower(coalesce(auth.jwt() ->> 'email','')) = lower(coalesce((select value from private.app_config where key='owner_email'),''));
$$;

create or replace function public.bootstrap_formshift_owner() returns boolean
language plpgsql security invoker set search_path = '' as $$
begin
  update public.account_access
  set status='active', is_owner=true, approved_by=(select auth.uid()), approved_at=now(), suspended_at=null, updated_at=now()
  where user_id=(select auth.uid()) and status='pending';
  return found;
end; $$;

create or replace function private.handle_new_auth_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(user_id, display_name, avatar_url)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name',''), nullif(new.raw_user_meta_data ->> 'avatar_url',''))
  on conflict (user_id) do nothing;
  insert into public.account_access(user_id, status)
  values (new.id, 'pending')
  on conflict (user_id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created_formshift on auth.users;
create trigger on_auth_user_created_formshift after insert on auth.users for each row execute function private.handle_new_auth_user();
revoke all on all functions in schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_active_user() to authenticated;
grant execute on function private.is_project_owner(uuid) to authenticated;
grant execute on function private.project_owner_id(uuid) to authenticated;
grant execute on function private.project_role_for(uuid) to authenticated;
grant execute on function private.can_read_project(uuid) to authenticated;
grant execute on function private.can_edit_project(uuid) to authenticated;
grant execute on function private.project_id_for_space(uuid) to authenticated;
grant execute on function private.safe_project_uuid(text) to authenticated;
grant execute on function private.is_owner_user() to authenticated;
grant execute on function private.is_configured_owner() to authenticated;
revoke all on function public.bootstrap_formshift_owner() from public, anon;
grant execute on function public.bootstrap_formshift_owner() to authenticated;

-- Explicit API grants and RLS. No anon data access.
revoke all on all tables in schema public from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, update on public.account_access to authenticated;
grant select, insert, update, delete on public.projects, public.project_members, public.spaces, public.measurement_observations, public.spatial_versions, public.spatial_version_measurements, public.assets, public.captures, public.saved_layouts, public.organize_runs, public.organize_proposals, public.build_requests, public.exports, public.jobs to authenticated;
grant select, insert on public.build_plans, public.build_components, public.material_items, public.price_snapshots, public.cost_estimates, public.effort_estimates to authenticated;
grant select, insert, update on public.ai_runs to authenticated;
grant select, insert on public.audit_events to authenticated;

alter table public.profiles enable row level security;
alter table public.account_access enable row level security;
alter table public.invites enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.spaces enable row level security;
alter table public.measurement_observations enable row level security;
alter table public.spatial_versions enable row level security;
alter table public.spatial_version_measurements enable row level security;
alter table public.assets enable row level security;
alter table public.captures enable row level security;
alter table public.saved_layouts enable row level security;
alter table public.organize_runs enable row level security;
alter table public.organize_proposals enable row level security;
alter table public.build_requests enable row level security;
alter table public.build_plans enable row level security;
alter table public.build_components enable row level security;
alter table public.material_items enable row level security;
alter table public.price_snapshots enable row level security;
alter table public.cost_estimates enable row level security;
alter table public.effort_estimates enable row level security;
alter table public.exports enable row level security;
alter table public.jobs enable row level security;
alter table public.ai_runs enable row level security;
alter table public.audit_events enable row level security;

create policy invites_no_direct_access on public.invites for all to authenticated using (false) with check (false);

create policy profiles_select_self on public.profiles for select to authenticated using (user_id = (select auth.uid()));
create policy profiles_insert_self on public.profiles for insert to authenticated with check (user_id = (select auth.uid()));
create policy profiles_update_self on public.profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy access_select_self on public.account_access for select to authenticated using (user_id = (select auth.uid()));
create policy access_select_owner on public.account_access for select to authenticated using (private.is_owner_user());
create policy access_bootstrap_owner on public.account_access for update to authenticated
  using (user_id=(select auth.uid()) and status='pending' and is_owner=false and private.is_configured_owner())
  with check (user_id=(select auth.uid()) and status='active' and is_owner=true and approved_by=(select auth.uid()) and private.is_configured_owner());
create policy access_update_owner on public.account_access for update to authenticated
  using (private.is_owner_user())
  with check (private.is_owner_user() and (user_id <> (select auth.uid()) or (status='active' and is_owner=true)) and (user_id = (select auth.uid()) or is_owner=false));
create policy profiles_select_owner on public.profiles for select to authenticated using (private.is_owner_user());

create policy projects_select_member on public.projects for select to authenticated using (private.can_read_project(id));
create policy projects_insert_active_self on public.projects for insert to authenticated with check (private.is_active_user() and owner_user_id = (select auth.uid()));
create policy projects_update_editor on public.projects for update to authenticated using (private.can_edit_project(id)) with check (private.can_edit_project(id) and owner_user_id = private.project_owner_id(id));
create policy projects_delete_owner on public.projects for delete to authenticated using (private.is_project_owner(id));

create policy members_select_member on public.project_members for select to authenticated using (private.can_read_project(project_id));
create policy members_insert_owner on public.project_members for insert to authenticated with check (private.is_project_owner(project_id));
create policy members_update_owner on public.project_members for update to authenticated using (private.is_project_owner(project_id)) with check (private.is_project_owner(project_id));
create policy members_delete_owner on public.project_members for delete to authenticated using (private.is_project_owner(project_id));

create policy spaces_select_member on public.spaces for select to authenticated using (private.can_read_project(project_id));
create policy spaces_insert_editor on public.spaces for insert to authenticated with check (private.can_edit_project(project_id));
create policy spaces_update_editor on public.spaces for update to authenticated using (private.can_edit_project(project_id)) with check (private.can_edit_project(project_id));
create policy spaces_delete_editor on public.spaces for delete to authenticated using (private.can_edit_project(project_id));

create policy measurements_select_member on public.measurement_observations for select to authenticated using (private.can_read_project(project_id));
create policy measurements_insert_editor on public.measurement_observations for insert to authenticated with check (private.can_edit_project(project_id) and created_by=(select auth.uid()));
create policy measurements_update_none on public.measurement_observations for update to authenticated using (false);
create policy measurements_delete_none on public.measurement_observations for delete to authenticated using (false);

create policy versions_select_member on public.spatial_versions for select to authenticated using (private.can_read_project(private.project_id_for_space(space_id)));
create policy versions_insert_editor on public.spatial_versions for insert to authenticated with check (private.can_edit_project(private.project_id_for_space(space_id)) and created_by=(select auth.uid()));
create policy versions_update_none on public.spatial_versions for update to authenticated using (false);
create policy versions_delete_none on public.spatial_versions for delete to authenticated using (false);

create policy svm_select_member on public.spatial_version_measurements for select to authenticated using (exists (select 1 from public.spatial_versions sv where sv.id=spatial_version_id and private.can_read_project(private.project_id_for_space(sv.space_id))));
create policy svm_insert_editor on public.spatial_version_measurements for insert to authenticated with check (exists (select 1 from public.spatial_versions sv where sv.id=spatial_version_id and private.can_edit_project(private.project_id_for_space(sv.space_id))));
create policy svm_delete_none on public.spatial_version_measurements for delete to authenticated using (false);

create policy assets_select_member on public.assets for select to authenticated using (private.can_read_project(project_id));
create policy assets_insert_editor on public.assets for insert to authenticated with check (private.can_edit_project(project_id) and created_by=(select auth.uid()));
create policy assets_update_editor on public.assets for update to authenticated using (private.can_edit_project(project_id)) with check (private.can_edit_project(project_id));
create policy assets_delete_editor on public.assets for delete to authenticated using (private.can_edit_project(project_id));

create policy captures_select_member on public.captures for select to authenticated using (private.can_read_project(private.project_id_for_space(space_id)));
create policy captures_insert_editor on public.captures for insert to authenticated with check (private.can_edit_project(private.project_id_for_space(space_id)) and created_by=(select auth.uid()));
create policy captures_update_editor on public.captures for update to authenticated using (private.can_edit_project(private.project_id_for_space(space_id))) with check (private.can_edit_project(private.project_id_for_space(space_id)));
create policy captures_delete_editor on public.captures for delete to authenticated using (private.can_edit_project(private.project_id_for_space(space_id)));

create policy layouts_select_member on public.saved_layouts for select to authenticated using (private.can_read_project(private.project_id_for_space(space_id)));
create policy layouts_insert_editor on public.saved_layouts for insert to authenticated with check (private.can_edit_project(private.project_id_for_space(space_id)) and created_by=(select auth.uid()));
create policy layouts_update_editor on public.saved_layouts for update to authenticated using (private.can_edit_project(private.project_id_for_space(space_id))) with check (private.can_edit_project(private.project_id_for_space(space_id)));
create policy layouts_delete_editor on public.saved_layouts for delete to authenticated using (private.can_edit_project(private.project_id_for_space(space_id)));

create policy organize_runs_select_member on public.organize_runs for select to authenticated using (private.can_read_project(project_id));
create policy organize_runs_insert_editor on public.organize_runs for insert to authenticated with check (private.can_edit_project(project_id) and actor_user_id=(select auth.uid()));
create policy organize_runs_update_self_editor on public.organize_runs for update to authenticated using (private.can_edit_project(project_id) and actor_user_id=(select auth.uid())) with check (private.can_edit_project(project_id) and actor_user_id=(select auth.uid()));
create policy organize_runs_delete_editor on public.organize_runs for delete to authenticated using (private.can_edit_project(project_id));
create policy organize_proposals_select_member on public.organize_proposals for select to authenticated using (private.can_read_project(project_id));
create policy organize_proposals_insert_editor on public.organize_proposals for insert to authenticated with check (private.can_edit_project(project_id));
create policy organize_proposals_update_editor on public.organize_proposals for update to authenticated using (private.can_edit_project(project_id)) with check (private.can_edit_project(project_id));
create policy organize_proposals_delete_editor on public.organize_proposals for delete to authenticated using (private.can_edit_project(project_id));

create policy build_requests_select_member on public.build_requests for select to authenticated using (private.can_read_project(project_id));
create policy build_requests_insert_self_editor on public.build_requests for insert to authenticated with check (private.can_edit_project(project_id) and actor_user_id=(select auth.uid()));
create policy build_requests_update_self_editor on public.build_requests for update to authenticated using (private.can_edit_project(project_id) and actor_user_id=(select auth.uid())) with check (private.can_edit_project(project_id) and actor_user_id=(select auth.uid()));
create policy build_requests_delete_editor on public.build_requests for delete to authenticated using (private.can_edit_project(project_id));
create policy build_plans_select_member on public.build_plans for select to authenticated using (private.can_read_project(project_id));
create policy build_plans_insert_self_editor on public.build_plans for insert to authenticated with check (private.can_edit_project(project_id) and created_by=(select auth.uid()));
create policy build_components_select_member on public.build_components for select to authenticated using (private.can_read_project(project_id));
create policy build_components_insert_editor on public.build_components for insert to authenticated with check (private.can_edit_project(project_id));
create policy material_items_select_member on public.material_items for select to authenticated using (private.can_read_project(project_id));
create policy material_items_insert_editor on public.material_items for insert to authenticated with check (private.can_edit_project(project_id));
create policy price_snapshots_select_member on public.price_snapshots for select to authenticated using (private.can_read_project(project_id));
create policy price_snapshots_insert_self_editor on public.price_snapshots for insert to authenticated with check (private.can_edit_project(project_id) and entered_by=(select auth.uid()));
create policy cost_estimates_select_member on public.cost_estimates for select to authenticated using (private.can_read_project(project_id));
create policy cost_estimates_insert_self_editor on public.cost_estimates for insert to authenticated with check (private.can_edit_project(project_id) and created_by=(select auth.uid()));
create policy effort_estimates_select_member on public.effort_estimates for select to authenticated using (private.can_read_project(project_id));
create policy effort_estimates_insert_self_editor on public.effort_estimates for insert to authenticated with check (private.can_edit_project(project_id) and created_by=(select auth.uid()));
create policy exports_select_member on public.exports for select to authenticated using (private.can_read_project(project_id));
create policy exports_insert_self_editor on public.exports for insert to authenticated with check (private.can_edit_project(project_id) and created_by=(select auth.uid()));
create policy exports_update_self_editor on public.exports for update to authenticated using (private.can_edit_project(project_id) and created_by=(select auth.uid())) with check (private.can_edit_project(project_id) and created_by=(select auth.uid()));
create policy exports_delete_editor on public.exports for delete to authenticated using (private.can_edit_project(project_id));
create policy jobs_select_member on public.jobs for select to authenticated using (private.can_read_project(project_id));
create policy jobs_insert_self_editor on public.jobs for insert to authenticated with check (private.can_edit_project(project_id) and actor_user_id=(select auth.uid()));
create policy jobs_update_self_editor on public.jobs for update to authenticated using (private.can_edit_project(project_id) and actor_user_id=(select auth.uid())) with check (private.can_edit_project(project_id) and actor_user_id=(select auth.uid()));
create policy jobs_delete_editor on public.jobs for delete to authenticated using (private.can_edit_project(project_id));

create policy ai_select_member on public.ai_runs for select to authenticated using (private.can_read_project(project_id));
create policy ai_insert_self_editor on public.ai_runs for insert to authenticated with check (private.can_edit_project(project_id) and actor_user_id=(select auth.uid()));
create policy ai_update_self_editor on public.ai_runs for update to authenticated using (private.can_edit_project(project_id) and actor_user_id=(select auth.uid())) with check (private.can_edit_project(project_id) and actor_user_id=(select auth.uid()));
create policy audit_select_owner on public.audit_events for select to authenticated using (project_id is not null and private.is_project_owner(project_id));
create policy audit_insert_self on public.audit_events for insert to authenticated with check (actor_user_id=(select auth.uid()) and (project_id is null or private.can_read_project(project_id)));

-- Private bucket. Object path convention: <project_uuid>/<asset_uuid>/<filename>
insert into storage.buckets(id,name,public) values ('formshift-private','formshift-private',false)
on conflict (id) do update set public=false;

create policy formshift_storage_select on storage.objects for select to authenticated using (
  bucket_id='formshift-private' and private.can_read_project(private.safe_project_uuid((storage.foldername(name))[1]))
);
create policy formshift_storage_insert on storage.objects for insert to authenticated with check (
  bucket_id='formshift-private' and private.can_edit_project(private.safe_project_uuid((storage.foldername(name))[1]))
);
create policy formshift_storage_update on storage.objects for update to authenticated using (
  bucket_id='formshift-private' and private.can_edit_project(private.safe_project_uuid((storage.foldername(name))[1]))
) with check (
  bucket_id='formshift-private' and private.can_edit_project(private.safe_project_uuid((storage.foldername(name))[1]))
);
create policy formshift_storage_delete on storage.objects for delete to authenticated using (
  bucket_id='formshift-private' and private.can_edit_project(private.safe_project_uuid((storage.foldername(name))[1]))
);
