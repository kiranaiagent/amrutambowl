import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { MealImage } from "@/components/MealImage";
import { Dumbbell, Flame, Leaf, Wheat, BadgePercent, Activity, Droplet } from "lucide-react";
import { planMeta } from "@/lib/planValue";
import { tagLabel } from "@/lib/tags";

const CYCLE_SUFFIX: Record<string, string> = {
  daily: "day", weekly: "week", biweekly: "2 wks", monthly: "month", custom_dates: "plan",
};
const cycleSuffix = (c: string) => CYCLE_SUFFIX[c] ?? c;

/** Unified plan card — Bowlify-style, used on both the home and /plans pages. */
export function PlanCard({ p, bestValue = false }: { p: any; bestValue?: boolean }) {
  const items = Array.from(
    new Map(((p.plan_items ?? []).map((pi: any) => pi.menu_items).filter((m: any) => m))
      .map((m: any) => [m.id, m])).values(),
  ) as any[];
  const meta = planMeta(p);
  const ingredients = items.map((m: any) => m.name).join(" · ");

  return (
    <Link to="/plans/$id" params={{ id: p.id }} className="group block h-full">
      <Card className="relative flex h-full flex-col overflow-hidden rounded-2xl border shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
        <div className="relative">
          <MealImage path={p.image_url} alt={p.name} className="h-52 w-full object-cover transition duration-500 group-hover:scale-105" />
          {p.is_popular ? (
            <span className="absolute left-2.5 top-2.5 rounded-full bg-[var(--color-saffron)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--color-saffron-foreground)] shadow">Popular</span>
          ) : (
            <span className="absolute left-2.5 top-2.5 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary-foreground shadow capitalize">{String(p.goal_type).replace("-", " ")}</span>
          )}
          <span className="absolute right-2.5 top-2.5 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground shadow">₹{Number(p.price_inr).toFixed(0)}<span className="font-normal opacity-80">/{cycleSuffix(p.billing_cycle)}</span></span>
          {bestValue && (
            <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-bold text-primary shadow backdrop-blur"><BadgePercent className="h-3 w-3" /> Best Value</span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2.5 p-3.5">
          <h3 className="font-semibold leading-tight line-clamp-1">{p.name}</h3>
          {Array.isArray(p.tags) && p.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {p.tags.slice(0, 3).map((t: string) => (
                <span key={t} className="rounded-full bg-[var(--color-saffron)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-saffron-foreground)]">{tagLabel(t)}</span>
              ))}
            </div>
          )}
          {ingredients && (
            <p className="text-xs leading-snug text-muted-foreground line-clamp-2">{ingredients}</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {meta.avgCal > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground"><Flame className="h-3 w-3 text-[var(--color-terracotta)]" /> ~{meta.avgCal} kcal</span>
            )}
            {meta.avgProtein > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary"><Dumbbell className="h-3 w-3" /> ~{meta.avgProtein}g protein</span>
            )}
            {meta.pureVeg && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-veg)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--color-veg)]"><Leaf className="h-3 w-3" /> Pure Veg</span>
            )}
            {meta.highFiber && (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground"><Wheat className="h-3 w-3" /> High Fibre</span>
            )}
            {meta.lowCalorie && (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground"><Flame className="h-3 w-3 text-[var(--color-terracotta)]" /> Low Cal</span>
            )}
            {meta.lowGI && (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground"><Activity className="h-3 w-3" /> Low GI</span>
            )}
            {meta.lowSodium && (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground"><Droplet className="h-3 w-3" /> Low Sodium</span>
            )}
          </div>
          {meta.savingsPct >= 5 && (
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[var(--color-saffron)]/15 px-2.5 py-0.5 text-[11px] font-bold text-[var(--color-saffron-foreground)]"><BadgePercent className="h-3 w-3" /> Save {meta.savingsPct}%</span>
          )}
          <span className="mt-auto flex items-center justify-center gap-1 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition group-hover:shadow-md">
            View Plan
          </span>
        </div>
      </Card>
    </Link>
  );
}
