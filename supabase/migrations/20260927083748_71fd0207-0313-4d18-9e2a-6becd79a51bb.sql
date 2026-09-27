create or replace function public.claim_doctor_if_none()
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  if exists (select 1 from public.user_roles where role = 'doctor') then
    insert into public.user_roles(user_id, role) values (auth.uid(), 'desk') on conflict do nothing;
    return false;
  end if;
  insert into public.user_roles(user_id, role) values (auth.uid(), 'doctor') on conflict do nothing;
  return true;
end $$;
revoke execute on function public.claim_doctor_if_none() from public, anon;
grant execute on function public.claim_doctor_if_none() to authenticated;
create policy "staff read all roles" on public.user_roles for select to authenticated using (true);