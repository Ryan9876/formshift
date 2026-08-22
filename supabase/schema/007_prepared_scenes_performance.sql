-- Prepared Scene performance hardening.
create index if not exists prepared_scenes_created_by_idx
  on public.prepared_scenes(created_by);
