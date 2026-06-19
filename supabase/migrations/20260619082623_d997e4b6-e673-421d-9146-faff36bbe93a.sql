
-- Allow one-off (non-subscription) orders for "Build Your Own Bowl"
ALTER TABLE public.orders ALTER COLUMN subscription_id DROP NOT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_pincode TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_inr NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'subscription';
ALTER TABLE public.orders ADD CONSTRAINT orders_kind_chk CHECK (kind IN ('subscription','bowl'));

-- Replace user-view policy to include orders linked directly to user
DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
CREATE POLICY "Users view own orders" ON public.orders FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = subscription_id AND s.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Users insert own orders" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own orders soft" ON public.orders FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ============ ORDER ITEMS ============
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  price_inr NUMERIC(10,2) NOT NULL DEFAULT 0,
  qty INT NOT NULL DEFAULT 1 CHECK (qty > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own order items" ON public.order_items FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND (
      o.user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = o.subscription_id AND s.user_id = auth.uid())
      OR public.has_role(auth.uid(), 'admin')
    )
  )
);
CREATE POLICY "Users manage own order items" ON public.order_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND (
        o.user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = o.subscription_id AND s.user_id = auth.uid())
        OR public.has_role(auth.uid(), 'admin')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND (
        o.user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = o.subscription_id AND s.user_id = auth.uid())
        OR public.has_role(auth.uid(), 'admin')
      )
    )
  );

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
