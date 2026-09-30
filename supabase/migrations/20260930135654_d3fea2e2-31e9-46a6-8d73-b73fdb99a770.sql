-- The join-a-clinic directory only needs id/name/city; phone must not be world-readable.
REVOKE SELECT ON public.clinics FROM authenticated, anon;
GRANT SELECT (id, name, city, created_at) ON public.clinics TO authenticated;

DROP POLICY IF EXISTS "clinic list for joining" ON public.clinics;
CREATE POLICY "clinic directory for joining"
ON public.clinics FOR SELECT TO authenticated
USING (NOT is_any_staff() OR is_staff_of(id) OR NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()
));
