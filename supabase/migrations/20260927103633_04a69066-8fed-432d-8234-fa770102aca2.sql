alter table public.clinic_settings drop constraint if exists clinic_settings_id_check;
create sequence if not exists public.clinic_settings_id_seq owned by public.clinic_settings.id;
select setval('public.clinic_settings_id_seq', greatest((select coalesce(max(id),1) from public.clinic_settings),1));
alter table public.clinic_settings alter column id set default nextval('public.clinic_settings_id_seq');
grant usage, select on sequence public.clinic_settings_id_seq to authenticated, service_role;
create unique index if not exists clinic_settings_clinic_id_key on public.clinic_settings(clinic_id);