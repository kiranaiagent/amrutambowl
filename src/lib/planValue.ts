/** Derived value/nutrition metrics for a plan, used on plan cards. */
const CYCLE_WEEKS: Record<string, number> = { daily: 0, weekly: 1, biweekly: 2, monthly: 4 };

export type PlanMeta = {
  perMeal: number;        // rounded ₹ per meal
  mealsPerCycle: number;  // meals delivered in one billing cycle
  savingsPct: number;     // % cheaper than buying the same dishes à la carte (0 if none)
  avgProtein: number;     // avg grams of protein per meal (0 if unknown)
};

export function planMeta(p: any): PlanMeta {
  const items = (p?.plan_items ?? []).map((pi: any) => pi.menu_items).filter(Boolean);

  const weeks = CYCLE_WEEKS[p?.billing_cycle] ?? 1;
  const deliveryDays = p?.billing_cycle === "daily" ? 1 : (p?.days_per_week ?? 7) * weeks;
  const mealsPerCycle = Math.max(1, (p?.meals_per_day ?? 1) * deliveryDays);
  const perMeal = Number(p?.price_inr ?? 0) / mealsPerCycle;

  const prices = items.map((m: any) => Number(m.price_inr)).filter((n: number) => n > 0);
  const avgItem = prices.length ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : 0;
  const savingsPct = avgItem > 0 && perMeal < avgItem ? Math.round((1 - perMeal / avgItem) * 100) : 0;

  const proteins = items.map((m: any) => Number(m.protein_g)).filter((n: number) => n > 0);
  const avgProtein = proteins.length ? Math.round(proteins.reduce((a: number, b: number) => a + b, 0) / proteins.length) : 0;

  return { perMeal: Math.round(perMeal), mealsPerCycle, savingsPct, avgProtein };
}
