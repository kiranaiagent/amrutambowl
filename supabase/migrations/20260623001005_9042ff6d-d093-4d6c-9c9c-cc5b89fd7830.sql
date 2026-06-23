
-- 1. Meal type enum
DO $$ BEGIN
  CREATE TYPE public.meal_type AS ENUM ('breakfast','lunch','dinner','snack');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. New columns on menu_items
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS meal_type public.meal_type NOT NULL DEFAULT 'lunch',
  ADD COLUMN IF NOT EXISTS serving_size text,
  ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_addon boolean NOT NULL DEFAULT false;

-- Best-effort backfill of meal_type from old free-text category
UPDATE public.menu_items SET meal_type = 'snack'
 WHERE meal_type = 'lunch' AND category ILIKE '%snack%';
UPDATE public.menu_items SET meal_type = 'breakfast'
 WHERE meal_type = 'lunch' AND category ILIKE '%breakfast%';
UPDATE public.menu_items SET meal_type = 'dinner'
 WHERE meal_type = 'lunch' AND category ILIKE '%dinner%';

-- 3. Migrate add_ons into menu_items (flagged)
INSERT INTO public.menu_items
  (id, name, description, image_url, price_inr, food_type, allergens,
   is_active, status, meal_type, serving_size, is_available, is_addon, category)
SELECT a.id, a.name, a.description, a.image_url, a.price_inr, a.food_type,
       a.allergens, a.is_active, a.status, 'snack'::public.meal_type, NULL,
       true, true, a.category
  FROM public.add_ons a
  WHERE NOT EXISTS (SELECT 1 FROM public.menu_items m WHERE m.id = a.id);

-- 4. Rule R1: a plan can't be active with zero menu items
CREATE OR REPLACE FUNCTION public.enforce_plan_has_items()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'active' THEN
    IF NOT EXISTS (SELECT 1 FROM public.plan_items WHERE plan_id = NEW.id) THEN
      RAISE EXCEPTION 'Plan must have at least one menu item before it can be activated.';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_plan_has_items ON public.plans;
CREATE TRIGGER trg_enforce_plan_has_items
  BEFORE INSERT OR UPDATE OF status, is_active ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_has_items();

-- 5. Rule R2: order_items snapshot name + price from menu_items
CREATE OR REPLACE FUNCTION public.snapshot_order_item()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE m RECORD;
BEGIN
  IF NEW.menu_item_id IS NOT NULL AND (NEW.name IS NULL OR NEW.name = '' OR COALESCE(NEW.price_inr,0) = 0) THEN
    SELECT name, price_inr INTO m FROM public.menu_items WHERE id = NEW.menu_item_id;
    IF FOUND THEN
      IF NEW.name IS NULL OR NEW.name = '' THEN NEW.name := m.name; END IF;
      IF COALESCE(NEW.price_inr,0) = 0 THEN NEW.price_inr := m.price_inr; END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_snapshot_order_item ON public.order_items;
CREATE TRIGGER trg_snapshot_order_item
  BEFORE INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_order_item();
