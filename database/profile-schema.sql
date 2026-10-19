create table public.studyboss_profiles (
user_id uuid primary key references auth.users(id) on delete cascade,
workspace jsonb not null check (workspace->>'version' = '1' and jsonb_typeof(workspace->'courses') = 'array'),
revision bigint not null default 1 check (revision > 0),
updated_at timestamptz not null default now(),
constraint workspace_size check (octet_length(workspace::text) <= 20971520)
);
alter table public.studyboss_profiles enable row level security;
revoke all on public.studyboss_profiles from anon, authenticated;
grant select, insert, update on public.studyboss_profiles to authenticated;
create policy own_profile_read on public.studyboss_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy own_profile_insert on public.studyboss_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy own_profile_update on public.studyboss_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create function public.save_studyboss_profile(expected_revision bigint, new_workspace jsonb)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare saved bigint;
begin
if auth.uid() is null then raise exception 'Login required'; end if;
if expected_revision = 0 then
insert into public.studyboss_profiles(user_id,workspace) values(auth.uid(),new_workspace)
on conflict(user_id) do nothing returning revision into saved;
else
update public.studyboss_profiles set workspace=new_workspace,revision=revision+1,updated_at=now()
where user_id=auth.uid() and revision=expected_revision returning revision into saved;
end if;
if saved is null then raise exception 'PROFILE_CONFLICT' using errcode='40001'; end if;
return saved;
end;
$$;
revoke all on function public.save_studyboss_profile(bigint,jsonb) from public, anon;
grant execute on function public.save_studyboss_profile(bigint,jsonb) to authenticated;
