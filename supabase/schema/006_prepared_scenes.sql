-- FormShift Prepared Scene v1
-- Immutable, source-bound derived scene packages for fast multi-object restore.

create table if not exists public.prepared_scenes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade,
  source_asset_id uuid not null references public.assets(id) on delete restrict,
  parent_prepared_scene_id uuid references public.prepared_scenes(id) on delete set null,
  clean_background_asset_id uuid references public.assets(id) on delete set null,
  schema_version text not null default 'prepared-scene-1',
  background_quality text not null default 'quick' check (background_quality in ('quick','ai_repaired')),
  objects_json jsonb not null default '[]'::jsonb,
  provider_json jsonb not null default '{}'::jsonb,
  status text not null default 'ready' check (status in ('ready','failed','superseded')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists prepared_scenes_source_created_idx
  on public.prepared_scenes(source_asset_id, created_at desc);
create index if not exists prepared_scenes_space_created_idx
  on public.prepared_scenes(space_id, created_at desc);
create index if not exists prepared_scenes_project_idx
  on public.prepared_scenes(project_id);
create index if not exists prepared_scenes_parent_idx
  on public.prepared_scenes(parent_prepared_scene_id)
  where parent_prepared_scene_id is not null;
create index if not exists prepared_scenes_background_asset_idx
  on public.prepared_scenes(clean_background_asset_id)
  where clean_background_asset_id is not null;

revoke all on public.prepared_scenes from anon, authenticated;
grant select, insert on public.prepared_scenes to authenticated;

alter table public.prepared_scenes enable row level security;

create policy prepared_scenes_select_member
  on public.prepared_scenes for select to authenticated
  using (private.can_read_project(project_id));

create policy prepared_scenes_insert_editor
  on public.prepared_scenes for insert to authenticated
  with check (
    private.can_edit_project(project_id)
    and created_by = (select auth.uid())
    and project_id = private.project_id_for_space(space_id)
  );
