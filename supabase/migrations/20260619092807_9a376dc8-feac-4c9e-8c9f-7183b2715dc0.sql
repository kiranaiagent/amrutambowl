
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid='public.billing_cycle'::regtype AND enumlabel='daily') THEN
    ALTER TYPE public.billing_cycle ADD VALUE 'daily';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid='public.billing_cycle'::regtype AND enumlabel='custom_dates') THEN
    ALTER TYPE public.billing_cycle ADD VALUE 'custom_dates';
  END IF;
END $$;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS selected_dates date[],
  ADD COLUMN IF NOT EXISTS avoid_allergens text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS special_instructions text;

CREATE TABLE IF NOT EXISTS public.add_ons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  price_inr numeric(10,2) NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'extra',
  food_type public.food_type NOT NULL DEFAULT 'veg',
  allergens text[] DEFAULT '{}'::text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.add_ons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.add_ons TO authenticated;
GRANT ALL ON public.add_ons TO service_role;
ALTER TABLE public.add_ons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "add_ons read" ON public.add_ons FOR SELECT USING (true);
CREATE POLICY "add_ons admin write" ON public.add_ons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_add_ons_updated BEFORE UPDATE ON public.add_ons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.subscription_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  addon_id uuid NOT NULL REFERENCES public.add_ons(id) ON DELETE RESTRICT,
  qty integer NOT NULL DEFAULT 1 CHECK (qty > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_addons TO authenticated;
GRANT ALL ON public.subscription_addons TO service_role;
ALTER TABLE public.subscription_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sub_addons owner" ON public.subscription_addons FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id=subscription_id AND s.user_id=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id=subscription_id AND s.user_id=auth.uid()));
CREATE POLICY "sub_addons admin read" ON public.subscription_addons FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.subscription_swaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  slot public.delivery_slot NOT NULL,
  swap_menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, day_of_week, slot)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_swaps TO authenticated;
GRANT ALL ON public.subscription_swaps TO service_role;
ALTER TABLE public.subscription_swaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sub_swaps owner" ON public.subscription_swaps FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id=subscription_id AND s.user_id=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id=subscription_id AND s.user_id=auth.uid()));
CREATE POLICY "sub_swaps admin read" ON public.subscription_swaps FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

INSERT INTO public.add_ons (name, description, price_inr, category, food_type) VALUES
  ('Extra Chapati (2 pcs)', 'Two fresh phulkas', 30, 'side', 'veg'),
  ('Masala Chaas (250ml)', 'Spiced buttermilk', 40, 'drink', 'veg'),
  ('Sweet Lassi (250ml)', 'Creamy yogurt drink', 60, 'drink', 'veg'),
  ('Mixed Fruit Bowl', 'Seasonal cut fruits, 150g', 80, 'fruit', 'veg'),
  ('Sprout Salad', 'Moong sprouts, onion, lemon', 70, 'extra', 'veg'),
  ('Boiled Eggs (2 pcs)', 'Farm-fresh boiled eggs', 50, 'extra', 'egg'),
  ('Grilled Paneer (100g)', 'Tandoori-spiced paneer', 120, 'extra', 'veg'),
  ('Grilled Chicken (100g)', 'Lean grilled chicken breast', 150, 'extra', 'non-veg'),
  ('Gulab Jamun (2 pcs)', 'Classic Indian dessert', 60, 'dessert', 'veg'),
  ('Filter Coffee (200ml)', 'South-Indian style', 40, 'drink', 'veg')
ON CONFLICT DO NOTHING;
