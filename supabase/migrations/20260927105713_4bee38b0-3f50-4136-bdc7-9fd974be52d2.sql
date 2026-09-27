CREATE TABLE public.parent_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guardian_id uuid NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, guardian_id)
);
GRANT SELECT, DELETE ON public.parent_links TO authenticated;
GRANT ALL ON public.parent_links TO service_role;
ALTER TABLE public.parent_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents see own links" ON public.parent_links FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Parents remove own links" ON public.parent_links FOR DELETE TO authenticated USING (auth.uid() = user_id);