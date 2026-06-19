
-- Status enum
DO $$ BEGIN
  CREATE TYPE public.content_status AS ENUM ('active','inactive','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add column to each table
ALTER TABLE public.plans      ADD COLUMN IF NOT EXISTS status public.content_status NOT NULL DEFAULT 'active';
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS status public.content_status NOT NULL DEFAULT 'active';
ALTER TABLE public.add_ons    ADD COLUMN IF NOT EXISTS status public.content_status NOT NULL DEFAULT 'active';

-- Backfill: existing is_active=false → inactive
UPDATE public.plans      SET status = 'inactive' WHERE is_active = false AND status = 'active';
UPDATE public.menu_items SET status = 'inactive' WHERE is_active = false AND status = 'active';
UPDATE public.add_ons    SET status = 'inactive' WHERE is_active = false AND status = 'active';

-- Bi-directional sync trigger so legacy is_active stays consistent
CREATE OR REPLACE FUNCTION public.sync_status_is_active()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- If status changed, derive is_active
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.is_active := (NEW.status = 'active');
  ELSIF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    -- If only is_active changed, derive status (active vs inactive; preserve archived)
    IF OLD.status = 'archived' THEN
      NEW.status := 'archived';
    ELSE
      NEW.status := CASE WHEN NEW.is_active THEN 'active' ELSE 'inactive' END;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_status_plans ON public.plans;
CREATE TRIGGER trg_sync_status_plans BEFORE INSERT OR UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.sync_status_is_active();

DROP TRIGGER IF EXISTS trg_sync_status_menu ON public.menu_items;
CREATE TRIGGER trg_sync_status_menu BEFORE INSERT OR UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_status_is_active();

DROP TRIGGER IF EXISTS trg_sync_status_addons ON public.add_ons;
CREATE TRIGGER trg_sync_status_addons BEFORE INSERT OR UPDATE ON public.add_ons
  FOR EACH ROW EXECUTE FUNCTION public.sync_status_is_active();

CREATE INDEX IF NOT EXISTS idx_plans_status      ON public.plans(status);
CREATE INDEX IF NOT EXISTS idx_menu_items_status ON public.menu_items(status);
CREATE INDEX IF NOT EXISTS idx_add_ons_status    ON public.add_ons(status);
