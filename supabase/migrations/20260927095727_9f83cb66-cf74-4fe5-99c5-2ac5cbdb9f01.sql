-- ============ multi-clinic tenancy ============

create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  phone text,
  created_at timestamptz not null default now()
);

-- seed clinic from the existing single-clinic settings row
do $$
declare seed uuid;
begin
  insert into public.clinics (name, city, phone)
  select clinic_name, city, phone from public.clinic_settings where id = 1
  returning id into seed;

  execute format($f$
    alter table public.guardians    add column if not exists clinic_id uuid not null default %L;
    alter table public.children     add column if not exists clinic_id uuid not null default %L;
    alter table public.visits       add column if not exists clinic_id uuid not null default %L;
    alter table public.bite_cases   add column if not exists clinic_id uuid not null default %L;
    alter table public.bite_doses   add column if not exists clinic_id uuid not null default %L;
    alter table public.child_doses  add column if not exists clinic_id uuid not null default %L;
    alter table public.messages     add column if not exists clinic_id uuid not null default %L;
    alter table public.payments     add column if not exists clinic_id uuid not null default %L;
    alter table public.plan_changes add column if not exists clinic_id uuid not null default %L;
    alter table public.impact_events add column if not exists clinic_id uuid not null default %L;
    alter table public.vials        add column if not exists clinic_id uuid not null default %L;
    alter table public.stock        add column if not exists clinic_id uuid not null default %L;
  $f$, seed, seed, seed, seed, seed, seed, seed, seed, seed, seed, seed, seed);

  -- dedupe staff requests before adding a unique index
  delete from public.staff_requests a using public.staff_requests b
    where a.ctid > b.ctid and a.user_id = b.user_id;
end $$;

alter table public.clinic_settings add column if not exists clinic_id uuid references public.clinics(id);
update public.clinic_settings set clinic_id = (select id from public.clinics order by created_at limit 1);
alter table public.clinic_settings alter column clinic_id set not null;

alter table public.user_roles add column if not exists clinic_id uuid references public.clinics(id);
update public.user_roles set clinic_id = (select id from public.clinics order by created_at limit 1) where clinic_id is null;
alter table public.user_roles alter column clinic_id set not null;
alter table public.user_roles drop constraint if exists user_roles_user_id_role_key;
alter table public.user_roles add constraint user_roles_user_role_clinic_key unique (user_id, role, clinic_id);

alter table public.staff_requests add column if not exists clinic_id uuid references public.clinics(id);
update public.staff_requests set clinic_id = (select id from public.clinics order by created_at limit 1) where clinic_id is null;
alter table public.staff_requests alter column clinic_id set not null;
create unique index if not exists staff_requests_user_clinic_uq on public.staff_requests(user_id, clinic_id);

-- capacity planner persistence per clinic
alter table public.clinic_settings add column if not exists capacity jsonb;

-- ============ helpers ============

create or replace function public.is_staff_of(_clinic uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.clinic_id = _clinic)
$$;

create or replace function public.is_any_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles ur where ur.user_id = auth.uid())
$$;

create or replace function public.is_clinic_doctor(_clinic uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.clinic_id = _clinic and ur.role = 'doctor')
$$;

create or replace function public.create_clinic(_name text, _city text, _phone text)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  insert into public.clinics(name, city, phone) values (_name, nullif(_city,''), nullif(_phone,'')) returning id into cid;
  insert into public.clinic_settings (clinic_id, opd_hours, bite_windows, holidays)
    select cid, s.opd_hours, s.bite_windows, s.holidays from public.clinic_settings s where s.id = 1;
  insert into public.user_roles(user_id, role, clinic_id) values (auth.uid(), 'doctor', cid) on conflict do nothing;
  return cid;
end $$;

create or replace function public.request_join_clinic(_clinic uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if public.is_staff_of(_clinic) then return; end if;
  insert into public.staff_requests(user_id, email, clinic_id)
  values (auth.uid(), auth.jwt()->>'email', _clinic) on conflict do nothing;
end $$;

create or replace function public.approve_staff(_user_id uuid, _clinic uuid, _approve boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_clinic_doctor(_clinic) then raise exception 'Only this clinic''s doctor can approve staff'; end if;
  if _approve then
    insert into public.user_roles(user_id, role, clinic_id) values (_user_id, 'desk', _clinic) on conflict do nothing;
  end if;
  delete from public.staff_requests where user_id = _user_id and clinic_id = _clinic;
end $$;

-- ============ access rules ============

do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in (
      'guardians','children','visits','bite_cases','bite_doses','child_doses',
      'messages','payments','plan_changes','impact_events','vials','stock',
      'clinic_settings','user_roles','staff_requests','app_clock','clinics',
      'rabies_regimens','vaccine_doses')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

grant select on public.clinics to authenticated;
alter table public.clinics enable row level security;
create policy "members read their clinics" on public.clinics for select to authenticated using (public.is_staff_of(id));
create policy "clinic list for joining" on public.clinics for select to authenticated using (true);

-- per-clinic staff own every row of their clinic
create policy "clinic staff full access" on public.guardians for all to authenticated using (public.is_staff_of(clinic_id)) with check (public.is_staff_of(clinic_id));
create policy "clinic staff full access" on public.children for all to authenticated using (public.is_staff_of(clinic_id)) with check (public.is_staff_of(clinic_id));
create policy "clinic staff full access" on public.visits for all to authenticated using (public.is_staff_of(clinic_id)) with check (public.is_staff_of(clinic_id));
create policy "clinic staff full access" on public.bite_cases for all to authenticated using (public.is_staff_of(clinic_id)) with check (public.is_staff_of(clinic_id));
create policy "clinic staff full access" on public.bite_doses for all to authenticated using (public.is_staff_of(clinic_id)) with check (public.is_staff_of(clinic_id));
create policy "clinic staff full access" on public.child_doses for all to authenticated using (public.is_staff_of(clinic_id)) with check (public.is_staff_of(clinic_id));
create policy "clinic staff full access" on public.messages for all to authenticated using (public.is_staff_of(clinic_id)) with check (public.is_staff_of(clinic_id));
create policy "clinic staff full access" on public.payments for all to authenticated using (public.is_staff_of(clinic_id)) with check (public.is_staff_of(clinic_id));
create policy "clinic staff full access" on public.impact_events for all to authenticated using (public.is_staff_of(clinic_id)) with check (public.is_staff_of(clinic_id));
create policy "clinic staff full access" on public.vials for all to authenticated using (public.is_staff_of(clinic_id)) with check (public.is_staff_of(clinic_id));
create policy "clinic staff full access" on public.stock for all to authenticated using (public.is_staff_of(clinic_id)) with check (public.is_staff_of(clinic_id));
create policy "clinic staff full access" on public.clinic_settings for all to authenticated using (public.is_staff_of(clinic_id)) with check (public.is_staff_of(clinic_id));

-- plan changes: desk drafts, only the clinic's doctor decides
create policy "staff read drafts" on public.plan_changes for select to authenticated using (public.is_staff_of(clinic_id));
create policy "staff insert drafts" on public.plan_changes for insert to authenticated with check (public.is_staff_of(clinic_id));
create policy "doctor decides" on public.plan_changes for update to authenticated using (public.is_clinic_doctor(clinic_id)) with check (public.is_clinic_doctor(clinic_id));

-- demo clock: any staff member
create policy "any staff clock" on public.app_clock for all to authenticated using (public.is_any_staff()) with check (public.is_any_staff());

-- shared vaccine catalogue: any staff can read and maintain it
create policy "any staff read catalogue" on public.vaccine_doses for select to authenticated using (public.is_any_staff());
create policy "any staff manage catalogue" on public.vaccine_doses for all to authenticated using (public.is_any_staff()) with check (public.is_any_staff());
create policy "any staff read regimens" on public.rabies_regimens for select to authenticated using (public.is_any_staff());
create policy "any staff manage regimens" on public.rabies_regimens for all to authenticated using (public.is_any_staff()) with check (public.is_any_staff());

-- roles & join requests
create policy "read own or member clinics" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_staff_of(clinic_id));
create policy "doctor manages clinic roles" on public.user_roles for all to authenticated using (public.is_clinic_doctor(clinic_id)) with check (public.is_clinic_doctor(clinic_id));
create policy "self or clinic doctor reads requests" on public.staff_requests for select to authenticated using (user_id = auth.uid() or public.is_clinic_doctor(clinic_id));
create policy "self requests to join" on public.staff_requests for insert to authenticated with check (user_id = auth.uid());
create policy "clinic doctor clears requests" on public.staff_requests for delete to authenticated using (public.is_clinic_doctor(clinic_id));

-- retire single-clinic helpers
drop function if exists public.claim_doctor_if_none();
drop function if exists public.approve_staff(uuid, boolean);
drop function if exists public.has_role(uuid, app_role);
drop function if exists public.is_staff(uuid);
