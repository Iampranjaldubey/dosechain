create table public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  email text not null,
  role app_role not null default 'desk',
  created_at timestamptz not null default now(),
  unique (clinic_id, email)
);
grant select, delete on public.staff_invites to authenticated;
grant all on public.staff_invites to service_role;
alter table public.staff_invites enable row level security;
create policy "doctor sees invites" on public.staff_invites for select to authenticated using (public.is_clinic_doctor(clinic_id));
create policy "doctor cancels invites" on public.staff_invites for delete to authenticated using (public.is_clinic_doctor(clinic_id));

create or replace function public.add_staff_by_email(_clinic uuid, _email text, _role app_role)
 returns text language plpgsql security definer set search_path to 'public' as $$
declare uid uuid;
begin
  if not public.is_clinic_doctor(_clinic) then raise exception 'Only this clinic''s doctor can add staff'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(_email)) limit 1;
  if uid is null then
    insert into public.staff_invites(clinic_id, email, role) values (_clinic, lower(trim(_email)), _role)
      on conflict (clinic_id, email) do update set role = excluded.role;
    return 'invited';
  end if;
  delete from public.user_roles where user_id = uid and clinic_id = _clinic;
  insert into public.user_roles(user_id, role, clinic_id) values (uid, _role, _clinic);
  delete from public.staff_requests where user_id = uid and clinic_id = _clinic;
  return 'added';
end $$;

create or replace function public.accept_my_invites()
 returns int language plpgsql security definer set search_path to 'public' as $$
declare n int := 0; em text := lower(auth.jwt()->>'email');
begin
  if auth.uid() is null or em is null then return 0; end if;
  insert into public.user_roles(user_id, role, clinic_id)
    select auth.uid(), i.role, i.clinic_id from public.staff_invites i where i.email = em
    on conflict do nothing;
  get diagnostics n = row_count;
  delete from public.staff_invites where email = em;
  delete from public.staff_requests where user_id = auth.uid() and clinic_id in (select clinic_id from public.user_roles where user_id = auth.uid());
  return n;
end $$;
revoke execute on function public.accept_my_invites() from anon, public;
grant execute on function public.accept_my_invites() to authenticated;