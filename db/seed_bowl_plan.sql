-- Amrutam Bowl — a sample plan that delivers actual Bowls (kind='bowl').
-- Use this as a template for repointing your real plans at Bowls.
-- Run in Supabase SQL Editor (admin privileges). Safe to re-run (skips if exists).

do $$
declare pid uuid;
begin
  if not exists (select 1 from public.plans where name = 'Signature Bowls — Weekly') then
    insert into public.plans (name, description, goal_type, billing_cycle, price_inr,
                       meals_per_day, days_per_week, duration_days, delivery_days,
                       status, image_url, is_popular)
    values ('Signature Bowls — Weekly',
            'A rotating week of our signature bowls — Sprouted Moong, Seasonal Fruit and Mixed Fruit.',
            'balanced', 'weekly', 1499, 1, 6, 7, '{1,2,3,4,5,6}',
            'inactive',
            'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
            false)
    returning id into pid;

    -- plan_items reference BOWLS (not ingredients), one per delivery day
    insert into public.plan_items (plan_id, menu_item_id, day_of_week, slot)
    select pid, b.id, d.dow, 'lunch'
    from (values
      ('Sprouted Moong Chaat', 1),
      ('Seasonal Fruit Bowl',  2),
      ('Mixed Fruit Bowl',     3),
      ('Sprouted Moong Chaat', 4),
      ('Seasonal Fruit Bowl',  5),
      ('Mixed Fruit Bowl',     6)
    ) as d(bowl_name, dow)
    join public.menu_items b on b.name = d.bowl_name and b.kind = 'bowl';

    update public.plans set status = 'active' where id = pid;
  end if;
end $$;
