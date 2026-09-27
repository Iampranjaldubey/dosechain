create or replace function public.is_staff(_uid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _uid)
$$;
revoke execute on function public.is_staff(uuid) from public, anon;
grant execute on function public.is_staff(uuid) to authenticated, service_role;

create table public.staff_requests (
  user_id uuid primary key,
  email text,
  created_at timestamptz not null default now()
);
grant select on public.staff_requests to authenticated;
grant all on public.staff_requests to service_role;
alter table public.staff_requests enable row level security;
create policy "doctor or self reads requests" on public.staff_requests for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'doctor'));

-- First account becomes doctor; everyone else waits for the doctor's approval.
create or replace function public.claim_doctor_if_none() returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  if exists (select 1 from public.user_roles where user_id = auth.uid()) then return false; end if;
  if exists (select 1 from public.user_roles where role = 'doctor') then
    insert into public.staff_requests(user_id, email) values (auth.uid(), auth.jwt()->>'email') on conflict do nothing;
    return false;
  end if;
  insert into public.user_roles(user_id, role) values (auth.uid(), 'doctor') on conflict do nothing;
  return true;
end $$;

create or replace function public.approve_staff(_user_id uuid, _approve boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'doctor') then raise exception 'Only the doctor can approve staff'; end if;
  if _approve then insert into public.user_roles(user_id, role) values (_user_id, 'desk') on conflict do nothing; end if;
  delete from public.staff_requests where user_id = _user_id;
end $$;
revoke execute on function public.approve_staff(uuid, boolean) from public, anon;
grant execute on function public.approve_staff(uuid, boolean) to authenticated;

-- Only approved staff (anyone with a role) can touch clinic data.
do $$
declare t text;
begin
  foreach t in array array['app_clock','bite_cases','bite_doses','child_doses','children','clinic_settings','guardians','impact_events','messages','rabies_regimens','stock','vaccine_doses','vials','visits','payments'] loop
    execute format('drop policy if exists "staff full access" on public.%I', t);
    execute format('create policy "staff full access" on public.%I for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()))', t);
  end loop;
end $$;
drop policy if exists "staff read and draft" on public.plan_changes;
drop policy if exists "staff insert drafts" on public.plan_changes;
create policy "staff read and draft" on public.plan_changes for select to authenticated using (public.is_staff(auth.uid()));
create policy "staff insert drafts" on public.plan_changes for insert to authenticated with check (public.is_staff(auth.uid()));
drop policy if exists "staff read all roles" on public.user_roles;
create policy "staff read all roles" on public.user_roles for select to authenticated using (public.is_staff(auth.uid()));