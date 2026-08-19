-- FormShift RLS harness. Intended for a disposable/local Supabase database after applying schema/001_initial_formshift.sql.
-- It is designed to fail loudly on cross-user access. Do not run against production data.

begin;

-- Test identities are fixed only inside this rollback-only test transaction.
insert into auth.users(id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
('11111111-1111-4111-8111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','owner@example.test','',now(),now(),now()),
('22222222-2222-4222-8222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','friend@example.test','',now(),now(),now())
on conflict (id) do nothing;
insert into public.account_access(user_id,status,is_owner) values
('11111111-1111-4111-8111-111111111111','active',true),
('22222222-2222-4222-8222-222222222222','active',false)
on conflict (user_id) do update set status=excluded.status, is_owner=excluded.is_owner;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
insert into public.projects(id,owner_user_id,name) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','Owner Room');
insert into public.project_members(project_id,user_id,role,created_by) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','owner','11111111-1111-4111-8111-111111111111');

-- Switch to Friend: project must be invisible before membership.
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
do $$ begin
  if exists(select 1 from public.projects where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') then raise exception 'RLS FAILURE: non-member read owner project'; end if;
end $$;

-- Owner grants viewer membership.
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
insert into public.project_members(project_id,user_id,role,created_by) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222','viewer','11111111-1111-4111-8111-111111111111');

-- Viewer can read but cannot edit.
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
do $$ begin
  if not exists(select 1 from public.projects where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') then raise exception 'RLS FAILURE: viewer cannot read shared project'; end if;
end $$;
do $$ begin
  begin
    insert into public.spaces(project_id,name) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Should Fail');
    raise exception 'RLS FAILURE: viewer wrote to project';
  exception when insufficient_privilege then null; when check_violation then null; end;
end $$;

-- Viewer cannot spend AI budget or create editor-only work.
do $$ begin
  begin
    insert into public.ai_runs(project_id,space_id,actor_user_id,task_name,task_schema_version,prompt_version,status)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',null,'22222222-2222-4222-8222-222222222222','organize','test','test','running');
    raise exception 'RLS FAILURE: viewer created AI run';
  exception when insufficient_privilege then null; when check_violation then null; end;
end $$;

-- Project ownership cannot be reassigned by an ordinary update, even by the owner.
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
do $$ begin
  begin
    update public.projects set owner_user_id='22222222-2222-4222-8222-222222222222' where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    raise exception 'RLS FAILURE: owner_user_id reassigned through project update';
  exception when insufficient_privilege then null; when check_violation then null; end;
end $$;

-- A pending identity remains blocked even if a membership row exists.
set local role postgres;
update public.account_access set status='pending' where user_id='22222222-2222-4222-8222-222222222222';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
do $$ begin
  if exists(select 1 from public.projects where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') then raise exception 'RLS FAILURE: pending user read shared project'; end if;
end $$;

rollback;
