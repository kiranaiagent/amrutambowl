# Amrutam Bowl — Functionality Rework

Four slices, shipped in order. Each slice is reviewable on its own.

## Slice 1 — Schema + Menu Item form

### Schema changes (single migration)
- `menu_items`: add `meal_type` (enum: breakfast, lunch, dinner, snack), `serving_size text`, `is_available boolean default true` (sold-out toggle), `is_addon boolean default false`. Drop `category` after backfilling `meal_type` from existing values where possible.
- Backfill: copy every row in `add_ons` into `menu_items` with `is_addon = true`. Keep `add_ons` table but mark deprecated; UI no longer reads/writes it.
- Add unique constraint and trigger to enforce R4 (sold-out independent of active).
- Block plan activation via trigger when no `plan_items` exist (R1).
- `order_items`: ensure name + price snapshot on insert (R2) — add NOT NULL where missing and a trigger that fills from `menu_items` if blank.

### Admin → Menu Items page
- New columns and filters: Meal type, Available toggle, Add-on flag.
- Delete button per row (with confirm).
- Edit form: serving size text input, meal type dropdown, available/sold-out switch, "Also available as an add-on" checkbox.

### Add-ons admin page
- Becomes a read-only filtered view: lists menu items where `is_addon = true`. Removes the separate create form.

## Slice 2 — Plan editor

- Plan edit page gets a "Menu items in this plan" section with two modes:
  - **Fixed menu**: multi-select of menu items, used for every delivery.
  - **Weekly rotation**: grid Mon–Sun × meal slots; assign menu items per cell. Reuses existing `plan_items.day_of_week` + `slot`.
- Billing cycle dropdown: daily, weekly, monthly.
- Status control: "Active" is disabled until the plan has ≥1 plan_item. Surface inline error.
- Plan list: show item count badge per plan.

## Slice 3 — Customer flow

- `/plans/$id` (plan detail): show included menu items grid with photo, serving size, calories, P/C/F, veg/non-veg dot.
- Two CTAs: **Take this plan as-is** | **Customize**.
- Customize: for each included item, an "Swap" button opens a picker of menu items with the same `meal_type`; price delta shown inline; new total updates live.
- Build-a-Bowl page (`/bowl`): unchanged à-la-carte flow but now sources from `menu_items` (already does).
- On both paths: an "Add extras" section listing `is_addon = true` items; checkbox + qty; live total.
- Cart/checkout carries the resolved menu_items + add-ons + price snapshots.

## Slice 4 — Signup + customer record

- `/auth` phone-OTP: capture name and delivery pincode on first sign-in (one extra step after OTP).
- Pincode validated against `serviceable_pincodes`; non-serviceable users still register but get a "we'll notify you" notice.
- `handle_new_user` trigger updated to insert `profiles` row with phone + pincode from `raw_user_meta_data`.
- Checkout: if profile is missing phone or pincode, prompt before payment and persist.
- Admin → Users → Customers: query joins `profiles` so newly subscribed users appear with phone and pincode.

## Technical notes

- All schema work goes through one migration per slice (4 total).
- Use `supabase--migration` for structure, `supabase--insert` to backfill add_ons → menu_items.
- New enum `meal_type` added with safe default.
- Triggers: `enforce_plan_has_items_before_active`, `snapshot_order_item_from_menu`.
- RLS: new columns inherit existing policies; no new policies needed.
- Existing routes touched: `src/routes/_authenticated/admin/menu.tsx`, `admin/plans.tsx`, `admin/addons.tsx`, `admin/users.tsx`, `plans.$id.tsx`, `bowl.tsx`, `cart.tsx`, `checkout.tsx`, `auth.tsx`. New component: `MenuItemSwapPicker`.

## Out of scope this round
- Payment provider swap, delivery scheduling logic, nutrition daily totals on the customer dashboard. Can come after slice 4 lands.

I'll start on Slice 1 (schema + Menu Item form) once you approve.
