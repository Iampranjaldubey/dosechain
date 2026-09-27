revoke execute on function public.add_staff_by_email(uuid, text, app_role) from public;
revoke execute on function public.remove_staff(uuid, uuid) from public;
revoke execute on function public.list_clinic_staff(uuid) from public;
grant execute on function public.add_staff_by_email(uuid, text, app_role) to authenticated;
grant execute on function public.remove_staff(uuid, uuid) to authenticated;
grant execute on function public.list_clinic_staff(uuid) to authenticated;