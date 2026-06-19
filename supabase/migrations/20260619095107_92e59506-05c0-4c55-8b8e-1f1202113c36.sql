DROP POLICY IF EXISTS "Public read active plans" ON public.plans;
CREATE POLICY "Visitors can read active plans"
ON public.plans
FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Admins can read all plans"
ON public.plans
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Public read active menu items" ON public.menu_items;
CREATE POLICY "Visitors can read active menu items"
ON public.menu_items
FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Admins can read all menu items"
ON public.menu_items
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));