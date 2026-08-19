-- FormShift performance/RLS consolidation (v0.4.1)

-- Consolidate overlapping permissive policies so each action evaluates one policy.
drop policy if exists profiles_select_self on public.profiles;
drop policy if exists profiles_select_owner on public.profiles;
create policy profiles_select_self_or_owner on public.profiles
for select to authenticated
using (user_id=(select auth.uid()) or private.is_owner_user());

drop policy if exists access_select_self on public.account_access;
drop policy if exists access_select_owner on public.account_access;
create policy access_select_self_or_owner on public.account_access
for select to authenticated
using (user_id=(select auth.uid()) or private.is_owner_user());

drop policy if exists access_bootstrap_owner on public.account_access;
drop policy if exists access_update_owner on public.account_access;
create policy access_update_bootstrap_or_owner on public.account_access
for update to authenticated
using (
  private.is_owner_user()
  or (
    user_id=(select auth.uid())
    and status='pending'
    and is_owner=false
    and private.is_configured_owner()
  )
)
with check (
  (
    private.is_owner_user()
    and (user_id <> (select auth.uid()) or (status='active' and is_owner=true))
    and (user_id = (select auth.uid()) or is_owner=false)
  )
  or (
    user_id=(select auth.uid())
    and status='active'
    and is_owner=true
    and approved_by=(select auth.uid())
    and private.is_configured_owner()
  )
);

-- Add a covering index for every FK that does not already have one as its leading
-- index key(s). Names are deterministic and hash-suffixed to stay unique under
-- PostgreSQL's 63-byte identifier limit.
do $$
declare
  r record;
  index_name text;
begin
  for r in
    with fks as (
      select c.oid, c.conname, c.conrelid, c.conkey, n.nspname, cls.relname,
             string_agg(quote_ident(a.attname), ', ' order by u.ord) as column_list
      from pg_constraint c
      join pg_class cls on cls.oid=c.conrelid
      join pg_namespace n on n.oid=cls.relnamespace
      cross join lateral unnest(c.conkey) with ordinality u(attnum,ord)
      join pg_attribute a on a.attrelid=c.conrelid and a.attnum=u.attnum
      where c.contype='f' and n.nspname='public'
      group by c.oid,c.conname,c.conrelid,c.conkey,n.nspname,cls.relname
    )
    select f.*
    from fks f
    where not exists (
      select 1 from pg_index i
      where i.indrelid=f.conrelid and i.indisvalid and i.indisready
        and not exists (
          select 1 from unnest(f.conkey) with ordinality k(attnum,ord)
          where (i.indkey::smallint[])[k.ord-1] is distinct from k.attnum
        )
    )
  loop
    index_name := left('idx_fk_' || r.conname, 54) || '_' || substr(md5(r.conname),1,8);
    execute format('create index if not exists %I on %I.%I (%s)', index_name, r.nspname, r.relname, r.column_list);
  end loop;
end $$;
