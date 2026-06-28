-- Amrutam Bowl — sample themed plans to showcase the derived dietary/health filters.
-- Run in Supabase SQL Editor (or hand to Lovable). Safe to re-run: it skips plans
-- whose names already exist. Images use public URLs (no storage upload needed).
--
-- The menu_item IDs below are the current active items in your DB. If you've changed
-- your catalog, re-map them in Admin → Menu Items.

-- 1) High-Protein Pack ---------------------------------------------------------
do $$
declare pid uuid;
begin
  if not exists (select 1 from plans where name = 'High-Protein Pack') then
    insert into plans (name, description, goal_type, billing_cycle, price_inr,
                       meals_per_day, days_per_week, duration_days, delivery_days,
                       status, image_url, is_popular)
    values ('High-Protein Pack',
            'A protein-loaded line-up of paneer, eggs, sprouts and seeds to hit your macros every day.',
            'muscle-gain', 'weekly', 1499, 1, 6, 7, '{1,2,3,4,5,6}',
            'inactive',
            'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&q=80',
            false)
    returning id into pid;

    insert into plan_items (plan_id, menu_item_id, day_of_week, slot) values
      (pid, '04ba0fde-62cb-44b1-ac8f-2fb94e7c3613', 1, 'lunch'), -- Grilled Paneer (18g)
      (pid, 'fdba2e2e-f711-4e26-b006-6afe1d5f5b81', 2, 'lunch'), -- Boiled Eggs (13g)
      (pid, 'fbdebdf3-a0d4-4beb-94dd-1e1ae971a4f7', 3, 'lunch'), -- Sprouted Moong (14g/9g fibre)
      (pid, 'dc37a8f7-7d0c-4436-a5f6-d66550e01f69', 4, 'lunch'), -- Pumpkin Seeds (9g)
      (pid, '38f3df39-0883-4c27-b7bb-0968c4d262f0', 5, 'lunch'); -- Sprout Salad (5g)

    update plans set status = 'active' where id = pid;
  end if;
end $$;

-- 2) Low-Calorie High-Fibre ----------------------------------------------------
do $$
declare pid uuid;
begin
  if not exists (select 1 from plans where name = 'Low-Calorie High-Fibre') then
    insert into plans (name, description, goal_type, billing_cycle, price_inr,
                       meals_per_day, days_per_week, duration_days, delivery_days,
                       status, image_url, is_popular)
    values ('Low-Calorie High-Fibre',
            'Light, filling and fibre-rich — sprouts, salads and fresh fruit to keep you full on fewer calories.',
            'weight-loss', 'weekly', 1299, 1, 6, 7, '{1,2,3,4,5,6}',
            'inactive',
            'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
            false)
    returning id into pid;

    insert into plan_items (plan_id, menu_item_id, day_of_week, slot) values
      (pid, 'fbdebdf3-a0d4-4beb-94dd-1e1ae971a4f7', 1, 'lunch'), -- Sprouted Moong (220 kcal, 9g fibre)
      (pid, '2edfabe9-4eb5-48c1-a02d-6d543731ee21', 2, 'lunch'), -- Seasonal Fruit Bowl (240 kcal, 8g fibre)
      (pid, '38f3df39-0883-4c27-b7bb-0968c4d262f0', 3, 'lunch'), -- Sprout Salad (60 kcal)
      (pid, '1ea25dc4-05c5-4788-bd47-a5e092bb3606', 4, 'lunch'), -- Kheera Slices (16 kcal)
      (pid, 'c5fc5473-16b7-4066-9ae7-c89516a378fc', 5, 'lunch'); -- Mixed Fruit Bowl (120 kcal)

    update plans set status = 'active' where id = pid;
  end if;
end $$;

-- Optional: a Student Tiffin example (affordable, filling) — uncomment to add.
-- do $$
-- declare pid uuid;
-- begin
--   if not exists (select 1 from plans where name = 'Student Tiffin') then
--     insert into plans (name, description, goal_type, billing_cycle, price_inr,
--                        meals_per_day, days_per_week, duration_days, delivery_days,
--                        status, image_url, is_popular)
--     values ('Student Tiffin',
--             'Budget-friendly, filling veg meals for hostel and college days.',
--             'balanced', 'weekly', 999, 1, 6, 7, '{1,2,3,4,5,6}',
--             'inactive',
--             'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
--             false)
--     returning id into pid;
--     insert into plan_items (plan_id, menu_item_id, day_of_week, slot) values
--       (pid, 'ac0672c4-9a89-4e3c-aad4-148057ea1e5c', 1, 'lunch'),
--       (pid, 'c5fc5473-16b7-4066-9ae7-c89516a378fc', 2, 'lunch'),
--       (pid, '38f3df39-0883-4c27-b7bb-0968c4d262f0', 3, 'lunch'),
--       (pid, '6e96a910-a32f-4c21-a06b-27b02e159acd', 4, 'lunch');
--     update plans set status = 'active' where id = pid;
--   end if;
-- end $$;
