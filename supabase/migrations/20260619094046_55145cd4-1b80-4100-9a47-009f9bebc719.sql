
-- Public catalog tables: readable by anon + authenticated
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;

GRANT SELECT ON public.menu_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
GRANT ALL ON public.menu_items TO service_role;

GRANT SELECT ON public.add_ons TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.add_ons TO authenticated;
GRANT ALL ON public.add_ons TO service_role;

GRANT SELECT ON public.plan_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_items TO authenticated;
GRANT ALL ON public.plan_items TO service_role;

GRANT SELECT ON public.serviceable_pincodes TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.serviceable_pincodes TO authenticated;
GRANT ALL ON public.serviceable_pincodes TO service_role;

-- User-owned tables: authenticated only (RLS enforces per-row ownership)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_addons TO authenticated;
GRANT ALL ON public.subscription_addons TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_swaps TO authenticated;
GRANT ALL ON public.subscription_swaps TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
