/** Derived value/nutrition/diet metrics for a plan, used on plan cards & filters. */
const CYCLE_WEEKS: Record<string, number> = { daily: 0, weekly: 1, biweekly: 2, monthly: 4 };

// Per-meal thresholds for the derived "health" facets.
const HIGH_PROTEIN = 12; // g
const HIGH_FIBER = 4;    // g
const LOW_CALORIE = 300; // kcal

export type PlanMeta = {
  perMeal: number;        // rounded ₹ per meal
  mealsPerCycle: number;  // meals delivered in one billing cycle
  savingsPct: number;     // % cheaper than buying the same dishes à la carte (0 if none)
  avgProtein: number;     // avg grams of protein per meal (0 if unknown)
  avgFiber: number;       // avg grams of fibre per meal (0 if unknown)
  avgCal: number;         // avg calories per meal (0 if unknown)
  // diet classification
  containsNonVeg: boolean;
  containsEgg: boolean;
  pureVeg: boolean;       // no egg, no non-veg, at least one item
  // derived health facets
  highProtein: boolean;
  highFiber: boolean;
  lowCalorie: boolean;
};

const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

export function planMeta(p: any): PlanMeta {
  const items = (p?.plan_items ?? []).map((pi: any) => pi.menu_items).filter(Boolean);

  const weeks = CYCLE_WEEKS[p?.billing_cycle] ?? 1;
  const deliveryDays = p?.billing_cycle === "daily" ? 1 : (p?.days_per_week ?? 7) * weeks;
  const mealsPerCycle = Math.max(1, (p?.meals_per_day ?? 1) * deliveryDays);
  const perMeal = Number(p?.price_inr ?? 0) / mealsPerCycle;

  const prices = items.map((m: any) => Number(m.price_inr)).filter((n: number) => n > 0);
  const avgItem = prices.length ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : 0;
  const savingsPct = avgItem > 0 && perMeal < avgItem ? Math.round((1 - perMeal / avgItem) * 100) : 0;

  const avgProtein = avg(items.map((m: any) => Number(m.protein_g)).filter((n: number) => n > 0));
  const avgFiber = avg(items.map((m: any) => Number(m.fiber_g)).filter((n: number) => n > 0));
  const avgCal = avg(items.map((m: any) => Number(m.calories)).filter((n: number) => n > 0));

  const types: string[] = items.map((m: any) => String(m.food_type ?? ""));
  const containsNonVeg = types.some((t) => t === "non-veg" || t === "nonveg");
  const containsEgg = types.some((t) => t === "egg");
  const pureVeg = items.length > 0 && !containsNonVeg && !containsEgg;

  return {
    perMeal: Math.round(perMeal), mealsPerCycle, savingsPct,
    avgProtein, avgFiber, avgCal,
    containsNonVeg, containsEgg, pureVeg,
    highProtein: avgProtein >= HIGH_PROTEIN,
    highFiber: avgFiber >= HIGH_FIBER,
    lowCalorie: avgCal > 0 && avgCal <= LOW_CALORIE,
  };
}
