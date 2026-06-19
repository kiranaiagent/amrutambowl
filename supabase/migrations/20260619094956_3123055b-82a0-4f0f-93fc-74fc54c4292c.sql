GRANT SELECT ON public.plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;

GRANT SELECT ON public.plan_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_items TO authenticated;
GRANT ALL ON public.plan_items TO service_role;

GRANT SELECT ON public.menu_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
GRANT ALL ON public.menu_items TO service_role;

GRANT SELECT ON public.add_ons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.add_ons TO authenticated;
GRANT ALL ON public.add_ons TO service_role;

GRANT SELECT ON public.serviceable_pincodes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.serviceable_pincodes TO authenticated;
GRANT ALL ON public.serviceable_pincodes TO service_role;