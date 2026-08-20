-- FormShift Phase 3 hardening: the first open-shelving archetype has no center
-- divider or engineered edge stiffener. Persisted plans therefore require the
-- same conservative 48 in clear-span limit enforced by the deterministic domain
-- engine. Wider designs must use a future supported archetype.

alter table public.build_plans
  add constraint build_plans_open_shelving_span_check
  check (
    archetype <> 'open_shelving'
    or (
      geometry_json ? 'interiorSpanMm'
      and jsonb_typeof(geometry_json->'interiorSpanMm') = 'number'
      and (geometry_json->>'interiorSpanMm')::numeric <= 1219.2
    )
  );

comment on constraint build_plans_open_shelving_span_check on public.build_plans is
  'Current open_shelving archetype is limited to a 48 in clear shelf span until a divider/stiffener archetype is implemented.';
