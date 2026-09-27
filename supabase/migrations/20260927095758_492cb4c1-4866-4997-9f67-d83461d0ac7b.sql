revoke execute on function public.is_staff_of(uuid) from public, anon;
revoke execute on function public.is_any_staff() from public, anon;
revoke execute on function public.is_clinic_doctor(uuid) from public, anon;

revoke execute on function public.create_clinic(text, text, text) from public, anon;
revoke execute on function public.request_join_clinic(uuid) from public, anon;
revoke execute on function public.approve_staff(uuid, uuid, boolean) from public, anon;
