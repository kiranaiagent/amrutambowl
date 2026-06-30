
-- 1. Extend menu_items
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'ingredient',
  ADD COLUMN IF NOT EXISTS is_addon boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS component_role text;

ALTER TABLE public.menu_items
  DROP CONSTRAINT IF EXISTS menu_items_kind_check;
ALTER TABLE public.menu_items
  ADD CONSTRAINT menu_items_kind_check
  CHECK (kind IN ('ingredient','bowl','beverage','snack'));

ALTER TABLE public.menu_items
  DROP CONSTRAINT IF EXISTS menu_items_component_role_check;
ALTER TABLE public.menu_items
  ADD CONSTRAINT menu_items_component_role_check
  CHECK (component_role IS NULL OR component_role IN ('base','protein','vegetable','sauce','topping','other'));

-- 2. bowl_components table
CREATE TABLE IF NOT EXISTS public.bowl_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bowl_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT,
  quantity numeric NOT NULL DEFAULT 1,
  is_default boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bowl_components_bowl_id_idx ON public.bowl_components(bowl_id);

GRANT SELECT ON public.bowl_components TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.bowl_components TO authenticated;
GRANT ALL ON public.bowl_components TO service_role;

ALTER TABLE public.bowl_components ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bowl_components read all" ON public.bowl_components;
CREATE POLICY "bowl_components read all"
  ON public.bowl_components FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "bowl_components admin write" ON public.bowl_components;
CREATE POLICY "bowl_components admin write"
  ON public.bowl_components FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
