
-- 1. Widen billing_cycle enum
ALTER TYPE billing_cycle ADD VALUE IF NOT EXISTS 'daily';
ALTER TYPE billing_cycle ADD VALUE IF NOT EXISTS 'biweekly';

-- 2. Drop add_ons & is_addon
DROP TABLE IF EXISTS public.add_ons CASCADE;
ALTER TABLE public.menu_items DROP COLUMN IF EXISTS is_addon;

-- 3. Extend plans
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS duration_days integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS start_day_of_week smallint,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS delivery_days smallint[] NOT NULL DEFAULT '{1,2,3,4,5}';

-- 4. Duplicate RPCs (admin-only)
CREATE OR REPLACE FUNCTION public.duplicate_menu_item(_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  INSERT INTO public.menu_items (
    name, description, image_url, price_inr, calories, protein_g, carbs_g, fat_g, fiber_g,
    food_type, allergens, tags, category, is_active, status, meal_type, serving_size, is_available
  )
  SELECT name || ' (copy)', description, image_url, price_inr, calories, protein_g, carbs_g, fat_g, fiber_g,
         food_type, allergens, tags, category, false, 'inactive', meal_type, serving_size, is_available
  FROM public.menu_items WHERE id = _id
  RETURNING id INTO new_id;
  RETURN new_id;
END $$;

CREATE OR REPLACE FUNCTION public.duplicate_plan(_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  INSERT INTO public.plans (
    name, description, image_url, goal_type, meals_per_day, days_per_week, billing_cycle,
    price_inr, is_active, status, duration_days, start_day_of_week, start_date, delivery_days
  )
  SELECT name || ' (copy)', description, image_url, goal_type, meals_per_day, days_per_week, billing_cycle,
         price_inr, false, 'inactive', duration_days, start_day_of_week, start_date, delivery_days
  FROM public.plans WHERE id = _id
  RETURNING id INTO new_id;

  INSERT INTO public.plan_items (plan_id, menu_item_id, day_of_week, slot)
  SELECT new_id, menu_item_id, day_of_week, slot
  FROM public.plan_items WHERE plan_id = _id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION public.duplicate_menu_item(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.duplicate_plan(uuid) TO authenticated;
