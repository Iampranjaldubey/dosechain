drop policy if exists "clinic staff full access" on public.clinic_settings;
create policy "clinic staff read settings" on public.clinic_settings for select to authenticated using (public.is_staff_of(clinic_id));
create policy "clinic doctor edits settings" on public.clinic_settings for update to authenticated using (public.is_clinic_doctor(clinic_id)) with check (public.is_clinic_doctor(clinic_id));

drop policy if exists "any staff manage catalogue" on public.vaccine_doses;
drop policy if exists "any staff manage regimens" on public.rabies_regimens;

revoke execute on function public.add_staff_by_email(uuid,text,app_role), public.approve_staff(uuid,uuid,boolean), public.create_clinic(text,text,text), public.remove_staff(uuid,uuid), public.request_join_clinic(uuid), public.list_clinic_staff(uuid) from anon, public;
grant execute on function public.add_staff_by_email(uuid,text,app_role), public.approve_staff(uuid,uuid,boolean), public.create_clinic(text,text,text), public.remove_staff(uuid,uuid), public.request_join_clinic(uuid), public.list_clinic_staff(uuid) to authenticated;