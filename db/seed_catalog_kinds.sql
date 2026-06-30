-- Amrutam Bowl — classify the existing catalog into kinds/roles + sample recipes.
-- Run in Supabase SQL Editor (admin/service privileges). Safe to re-run.
-- After this, the storefront splits into Bowls vs Ingredients vs Add-ons.
-- Adjust freely in Admin → Menu Items afterwards.

-- 1) Bowls (sellable composed meals) ------------------------------------------
update public.menu_items set kind = 'bowl', is_addon = false
where name in ('Sprouted Moong Chaat', 'Seasonal Fruit Bowl', 'Mixed Fruit Bowl');

-- 2) Add-ons: a beverage and a snack ------------------------------------------
update public.menu_items set kind = 'beverage', is_addon = true
where name = 'Chia Seeds Water';

update public.menu_items set kind = 'snack', is_addon = true
where name ilike 'Pomegranate%';

-- 3) Ingredients (building blocks) with component roles -----------------------
update public.menu_items set kind = 'ingredient', component_role = 'protein'
where name in ('Grilled Paneer (100g)', 'Boiled Eggs (2 pcs)');

update public.menu_items set kind = 'ingredient', component_role = 'base'
where name in ('Sweet Potato (50g)');

update public.menu_items set kind = 'ingredient', component_role = 'vegetable'
where name in ('Kheera Slices', 'Baby Carrots', 'Sprout Salad');

update public.menu_items set kind = 'ingredient', component_role = 'topping'
where name in ('Pumpkin Seeds', 'Papaya Fruit');

-- 4) Sample recipes for the signature bowls (bowl_components) ------------------
-- helper: insert a component only if it doesn't already exist
insert into public.bowl_components (bowl_id, ingredient_id)
select b.id, i.id
from public.menu_items b
join public.menu_items i on i.name = any (array['Sprout Salad', 'Kheera Slices', 'Baby Carrots'])
where b.name = 'Sprouted Moong Chaat'
  and not exists (
    select 1 from public.bowl_components bc where bc.bowl_id = b.id and bc.ingredient_id = i.id
  );

insert into public.bowl_components (bowl_id, ingredient_id)
select b.id, i.id
from public.menu_items b
join public.menu_items i on i.name = any (array['Papaya Fruit', 'Pumpkin Seeds'])
where b.name = 'Seasonal Fruit Bowl'
  and not exists (
    select 1 from public.bowl_components bc where bc.bowl_id = b.id and bc.ingredient_id = i.id
  );
