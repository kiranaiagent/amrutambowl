
# Amrutam — Big Expansion Plan

Building everything you selected, in 4 sequential batches. Each batch ends in a usable state so you can test as we go.

---

## Batch 1 — Status lifecycle (replaces destructive delete)

**Schema**
- Add `status` enum (`active`, `inactive`, `archived`) to `plans`, `menu_items`, `add_ons`.
  - `active` → visible to customers
  - `inactive` → hidden from customers, still editable, existing subs continue
  - `archived` → read-only, hidden everywhere except in admin "Archive" filter
- Backfill from existing `is_active` boolean, keep boolean as a generated/synced column for compatibility, then drop later.

**Admin UI**
- Replace trash icon with a status dropdown (Active / Inactive / Archived) on every card.
- Status filter tabs at the top of Plans, Menu Items, Add-ons pages.
- Confirm dialog only when archiving.

**Customer site**
- Public queries already filter by `is_active`; switch to `status = 'active'`.

---

## Batch 2 — Flexible pricing engine

**Schema**
- `menu_items.base_price_inr` (already exists as `price_inr`) + new `upcharge_inr` for premium swaps.
- `plans.slot_prices jsonb` → `{ breakfast: 0, lunch: 180, dinner: 200 }` per-meal base price inside a plan.
- `add_ons.price_inr` already exists; add `category` (`drink`, `dessert`, `extra-roti`, `protein-boost`, etc.) and `max_per_order`.
- New `pricing_rules` view computing live order total.

**Customize page (`/plans/$id`)**
- Each day/slot cell shows its base price.
- Swapping to a premium item shows `+₹40` upcharge live.
- Add-ons section per delivery (e.g. extra roti +₹15, lassi +₹60).
- Running total recalculates instantly; breakdown shown in side panel.

**Checkout**
- Order total = sum(slot base + swap upcharges + add-ons) × delivery dates − discounts.
- Persisted into `orders.subtotal_inr`, `discount_inr`, `total_inr` (new columns).

---

## Batch 3 — Promo codes, referrals, offers

**Schema**
- New `promo_codes` table: `code`, `type` (`percent`/`flat`), `value`, `min_order_inr`, `max_discount_inr`, `starts_at`, `expires_at`, `usage_limit`, `usage_count`, `first_order_only`, `status`.
- New `promo_redemptions` table (per user per code, enforces single-use rules).
- `profiles.referral_code` (auto-generated short code) + `profiles.referred_by` + `profiles.wallet_credit_inr`.
- New `featured_items` boolean on `menu_items` for "Chef's Special" / "Festival Special" + `feature_label` text.

**Admin UI**
- New `/admin/promos` page: CRUD coupons, see redemption stats.
- Star/feature toggle on each menu item; optional banner text.

**Customer UI**
- Promo code input on `/checkout` with live validation + applied discount line.
- "Featured this week" rail on home + plan detail pages.
- Account page shows: referral code + share link, wallet credit balance, past redemptions.
- First-order banner: "Use WELCOME200 for ₹200 off your first order".

---

## Batch 4 — Customer extras + admin power tools

**Customer**
- Per-slot **special notes** textbox in customize (e.g. "less spicy", "no coriander"); persisted to `order_items.notes`.
- **Delivery time-slot preference** on profile + per-subscription override (e.g. lunch 12:30–1:30).
- **Allergens & dietary tags** on profile (nuts, dairy, gluten, jain, vegan) — surfaced as warnings when swapping into a conflicting item.
- **Pause / skip days** on `/my-subscription`: pick dates to skip; credits roll to wallet or extend end date.

**Admin power tools**
- **Daily specials**: toggle + label per menu item, shows banner site-wide.
- **Duplicate week**: button on Plan menu builder to copy current week into next, or copy from another plan.
- **Per-day capacity caps**: `menu_items.daily_cap` int; checkout decrements and blocks when full; admin sees today's remaining stock.
- **Analytics dashboard** at `/admin`: cards for revenue (today/week/month), active subscriptions, top 5 items, churn rate, promo redemptions.

---

## Technical notes

- All new tables: GRANT to `authenticated` + `service_role`, RLS enabled, admin-write via `has_role(auth.uid(),'admin')`.
- Promo validation is a `validate_promo(code, user_id, subtotal)` SECURITY DEFINER function returning discount amount + error reason — keeps logic atomic and prevents client tampering.
- Pricing recalculated server-side on checkout; client total is display-only.
- Capacity decrement uses a row-level lock in a server function to prevent race conditions.
- Customizations and notes already use `sessionStorage` bridge; extending the same `ruchi.plan.overrides.v1` schema.
- Status enum migration is non-destructive — `is_active` stays in sync via trigger until all UI is migrated.

---

## Out of scope (this round)

- Razorpay (deferred per your answer).
- SMS/WhatsApp notifications.
- Driver/delivery routing app.

Reply **go** to start with Batch 1, or tell me to reorder.
