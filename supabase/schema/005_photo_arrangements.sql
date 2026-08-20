create table if not exists public.photo_arrangements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade,
  parent_arrangement_id uuid references public.photo_arrangements(id),
  source_asset_id uuid not null references public.assets(id),
  result_asset_id uuid not null references public.assets(id),
  mask_asset_id uuid references public.assets(id),
  cutout_asset_id uuid references public.assets(id),
  background_asset_id uuid references public.assets(id),
  base_spatial_version_id uuid references public.spatial_versions(id),
  transform_json jsonb not null default '{}'::jsonb,
  status text not null default 'committed' check (status in ('committed', 'superseded')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists photo_arrangements_space_created_idx
  on public.photo_arrangements(space_id, created_at desc);

alter table public.photo_arrangements enable row level security;

drop policy if exists photo_arrangements_select_member on public.photo_arrangements;
create policy photo_arrangements_select_member
  on public.photo_arrangements for select
  using (
    private.can_read_project(project_id)
    and project_id = private.project_id_for_space(space_id)
  );

drop policy if exists photo_arrangements_insert_editor on public.photo_arrangements;
create policy photo_arrangements_insert_editor
  on public.photo_arrangements for insert
  with check (
    private.can_edit_project(project_id)
    and project_id = private.project_id_for_space(space_id)
    and created_by = (select auth.uid())
  );

drop policy if exists photo_arrangements_update_none on public.photo_arrangements;
create policy photo_arrangements_update_none
  on public.photo_arrangements for update
  using (false)
  with check (false);

drop policy if exists photo_arrangements_delete_none on public.photo_arrangements;
create policy photo_arrangements_delete_none
  on public.photo_arrangements for delete
  using (false);

grant select, insert on public.photo_arrangements to authenticated;
revoke update, delete on public.photo_arrangements from authenticated;
