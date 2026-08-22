-- FormShift Scene Intelligence v1 performance hardening.
-- These indexes cover foreign keys reported by the Supabase database advisor.

create index if not exists scene_analyses_source_asset_idx
  on public.scene_analyses(source_asset_id);

create index if not exists scene_analyses_depth_asset_idx
  on public.scene_analyses(depth_asset_id)
  where depth_asset_id is not null;

create index if not exists scene_analyses_created_by_idx
  on public.scene_analyses(created_by);
