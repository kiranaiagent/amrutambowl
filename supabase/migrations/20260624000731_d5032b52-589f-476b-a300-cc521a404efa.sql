
REVOKE EXECUTE ON FUNCTION public.duplicate_menu_item(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.duplicate_plan(uuid) FROM PUBLIC;

-- Repoint subscription_addons to menu_items
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscription_addons' AND column_name='addon_id') THEN
    ALTER TABLE public.subscription_addons RENAME COLUMN addon_id TO menu_item_id;
  END IF;
END $$;

-- Clean up any orphans before adding FK
DELETE FROM public.subscription_addons sa
WHERE NOT EXISTS (SELECT 1 FROM public.menu_items mi WHERE mi.id = sa.menu_item_id);

ALTER TABLE public.subscription_addons
  DROP CONSTRAINT IF EXISTS subscription_addons_addon_id_fkey,
  DROP CONSTRAINT IF EXISTS subscription_addons_menu_item_id_fkey;

ALTER TABLE public.subscription_addons
  ADD CONSTRAINT subscription_addons_menu_item_id_fkey
  FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;
