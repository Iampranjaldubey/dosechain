create table public.health_profile (
  child_id uuid primary key references public.children(id) on delete cascade,
  clinic_id uuid not null,
  blood_group text, allergies jsonb not null default '[]', conditions jsonb not null default '[]',
  birth_weight_kg numeric, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.health_visits (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  clinic_id uuid not null,
  visit_date date not null, doctor_name text, clinic_name text, symptoms text, diagnosis text, advice text,
  follow_up_on date, is_illness boolean not null default false,
  source text not null default 'clinic' check (source in ('clinic','parent')),
  created_at timestamptz not null default now()
);
create table public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  health_visit_id uuid not null references public.health_visits(id) on delete cascade,
  clinic_id uuid not null,
  medicine text not null, dose text, frequency text, days integer, remind boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.growth_readings (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  clinic_id uuid not null,
  measured_on date not null, weight_kg numeric, height_cm numeric, head_cm numeric,
  source text not null default 'clinic', created_at timestamptz not null default now()
);
create table public.milestones (
  child_id uuid not null references public.children(id) on delete cascade,
  clinic_id uuid not null, code text not null, achieved_on date not null,
  primary key (child_id, code)
);
create table public.health_documents (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  clinic_id uuid not null,
  kind text not null, title text, doc_date date, file_path text not null,
  source text not null default 'parent', created_at timestamptz not null default now()
);
create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  clinic_id uuid not null,
  token text not null unique, expires_at timestamptz not null, revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.share_views (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.share_links(id) on delete cascade,
  clinic_id uuid not null, viewed_at timestamptz not null default now(), viewer text
);

do $$ declare t text; begin
  foreach t in array array['health_profile','health_visits','prescriptions','growth_readings','milestones','health_documents','share_links','share_views'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "clinic staff full access" on public.%I for all to authenticated using (public.is_staff_of(clinic_id)) with check (public.is_staff_of(clinic_id))', t);
  end loop;
end $$;

create index on public.health_visits(child_id);
create index on public.growth_readings(child_id);
create index on public.health_documents(child_id);
create index on public.share_links(child_id);

create or replace function public.update_updated_at_column() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
create trigger health_profile_updated before update on public.health_profile for each row execute function public.update_updated_at_column();