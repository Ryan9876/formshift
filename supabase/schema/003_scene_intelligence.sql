-- FormShift Scene Intelligence v1
-- Derived scene evidence is immutable and never mutates canonical measurement/spatial state.

create table if not exists public.scene_analyses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade,
  source_asset_id uuid not null references public.assets(id) on delete restrict,
  depth_asset_id uuid references public.assets(id) on delete set null,
  schema_version text not null,
  provider text not null,
  model text not null,
  model_version text not null,
  analysis_json jsonb not null default '{}'::jsonb,
  status text not null default 'derived' check (status in ('derived','superseded','failed')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists scene_analyses_space_created_idx
  on public.scene_analyses(space_id, created_at desc);
create index if not exists scene_analyses_project_idx
  on public.scene_analyses(project_id);

revoke all on public.scene_analyses from anon, authenticated;
grant select, insert on public.scene_analyses to authenticated;

alter table public.scene_analyses enable row level security;

create policy scene_analyses_select_member
  on public.scene_analyses for select to authenticated
  using (private.can_read_project(project_id));

create policy scene_analyses_insert_editor
  on public.scene_analyses for insert to authenticated
  with check (
    private.can_edit_project(project_id)
    and created_by = (select auth.uid())
    and project_id = private.project_id_for_space(space_id)
  );
