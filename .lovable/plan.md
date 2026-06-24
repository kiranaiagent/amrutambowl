
# Rework + Slices 2–4

Big rework. Confirm direction before I run the migrations.

## 1. Drop add-ons concept

- `DROP TABLE add_ons`. Drop `is_addon` column from `menu_items`. Delete `/admin/addons` route from nav and router.
- Menu items are the only catalog. Customers add any item as an extra at any time. The "extras" section in the customer flow simply lists active menu items (filtered by meal_type chips); no special flag.
- `subscription_addons.menu_item_id` already references `menu_items` — no change needed there.

## 2. Plans: richer scheduling

Extend `billing_cycle` enum to add `daily` and `biweekly` (alongside `weekly`, `monthly`).

Add to `plans`:
- `duration_days int` — total length of one billing cycle (1 for daily, 7 weekly, 14 biweekly, 28/30 monthly; admin can override).
- `start_day_of_week smallint` — 0=Sun..6=Sat. Optional anchor.
- `start_date date` — optional fixed start.
- `delivery_days smallint[]` — which weekdays meals are delivered (e.g. `{1,2,3,4,5}` Mon–Fri). Replaces the loose `days_per_week` semantics; old `days_per_week` stays as a derived hint.

Admin form shows fields conditionally:
- **daily** → meals/day only.
- **weekly / biweekly** → delivery-day checkboxes (Mon–Sun), start day, meals/day; weekly menu builder shows the chosen days × meal slots (Day 1, Day 2, …) where each cell picks a menu item.
- **monthly** → delivery days + start date + meals/day; menu builder shows Week 1..4 × delivery days × meal slots (re-uses the weekly grid, repeated).

The existing `plan_items (plan_id, menu_item_id, day_of_week, slot)` shape stays; weekly/biweekly use day_of_week 0–6, monthly uses 0–27 (Day 1..28).

The activation trigger from Slice 1 stays — a plan with no `plan_items` cannot be `active`.

## 3. Duplicate (copy) existing rows

Add a **Duplicate** button on every plan card and menu-item card. Server-side via Supabase RPC:
- `duplicate_plan(uuid) → uuid` — inserts a copy with `" (copy)"` suffix, `status='inactive'`, then `INSERT … SELECT` on `plan_items`.
- `duplicate_menu_item(uuid) → uuid` — same pattern; copies all fields, suffixes name, status `inactive`.

Both are `SECURITY DEFINER` and gated by `has_role(auth.uid(),'admin')`.

## 4. Customer plan-detail page (Slice 3)

`/plans/$id` redesigned:
- Hero with plan image, price, billing cycle, meals/day, food-type icon.
- "What's on the menu" section — grid of menu-item cards (image, name, serving size, calories + P/C/F, veg/non-veg dot) grouped by Day/Week per the plan shape.
- Two CTAs: **Subscribe as-is** | **Customize** (swap within same `meal_type`, price delta shown).
- "Add extras" — searchable grid of active menu items, qty stepper, live total.

## 5. Signup capture (Slice 4)

- `/auth` phone-OTP flow already exists; add Name + Pincode fields after first sign-in, store in `profiles` (and validate pincode against `serviceable_pincodes`).
- Checkout prompts for missing phone/pincode before allowing payment.
- `handle_new_user` trigger already creates `profiles`; just ensure name + pincode persist. Admin → Users already joins profiles.

## 6. Build number in footer

- New file `src/build-info.json` storing `{ "build": N, "builtAt": "ISO" }`.
- Tiny Vite plugin in `vite.config.ts` (`buildStart` hook, only when `command==='build'`) reads the JSON, increments `build`, refreshes `builtAt`, writes it back.
- Footer reads it as a static JSON import and shows `Build #N · {date}` on the right edge.

## Technical changes

- 1 migration: enum widen + `plans` columns + drop `add_ons`/`is_addon` + duplicate RPCs.
- Edited: `src/routes/_authenticated/admin/plans.tsx` (full rewrite), `…/admin/menu.tsx` (drop add-on flag, add Duplicate), `src/routes/_authenticated/admin.tsx` (drop Add-ons nav), `src/routes/plans.$id.tsx` (new detail design), `src/routes/auth.tsx` (capture name/pincode), `src/routes/_authenticated/checkout.tsx` (gate), `src/components/Footer.tsx` (build line), `vite.config.ts` (plugin).
- Deleted: `src/routes/_authenticated/admin/addons.tsx`.
- Out of scope: payment provider swap, customer dashboard nutrition totals, scheduled delivery automation.

Reply "go" and I run the migration + ship everything; reply with edits if anything should change.
