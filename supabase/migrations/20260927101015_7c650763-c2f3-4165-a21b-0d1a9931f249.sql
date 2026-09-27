create or replace function public.add_staff_by_email(_clinic uuid, _email text, _role app_role)
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.is_clinic_doctor(_clinic) then raise exception 'Only this clinic''s doctor can add staff'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(_email)) limit 1;
  if uid is null then return 'not_found'; end if;
  delete from public.user_roles where user_id = uid and clinic_id = _clinic;
  insert into public.user_roles(user_id, role, clinic_id) values (uid, _role, _clinic);
  delete from public.staff_requests where user_id = uid and clinic_id = _clinic;
  return 'added';
end $$;

create or replace function public.remove_staff(_clinic uuid, _user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_clinic_doctor(_clinic) then raise exception 'Only this clinic''s doctor can remove staff'; end if;
  if _user_id = auth.uid() then raise exception 'You cannot remove yourself'; end if;
  delete from public.user_roles where user_id = _user_id and clinic_id = _clinic;
end $$;

create or replace function public.list_clinic_staff(_clinic uuid)
returns table(user_id uuid, email text, role app_role) language sql stable security definer set search_path = public as $$
  select ur.user_id, u.email::text, ur.role from public.user_roles ur join auth.users u on u.id = ur.user_id
  where ur.clinic_id = _clinic and public.is_staff_of(_clinic) order by ur.role, u.email
$$;

revoke execute on function public.add_staff_by_email(uuid, text, app_role) from anon;
revoke execute on function public.remove_staff(uuid, uuid) from anon;
revoke execute on function public.list_clinic_staff(uuid) from anon;