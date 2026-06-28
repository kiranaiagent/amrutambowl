import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { MealImage } from "@/components/MealImage";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ChefHat, Dumbbell, BadgePercent, Leaf, Wheat, Flame } from "lucide-react";
import { BuildBowlCard } from "@/components/BuildBowlCard";
import { Reveal } from "@/components/Reveal";
import { planMeta, type PlanMeta } from "@/lib/planValue";

const CYCLE_SUFFIX: Record<string, string> = {
  daily: "day", weekly: "week", biweekly: "2 wks", monthly: "month", custom_dates: "plan",
};
const cycleSuffix = (c: string) => CYCLE_SUFFIX[c] ?? c;

const GOALS = [
  { v: "all", label: "All" },
  { v: "weight-loss", label: "Weight Loss" },
  { v: "muscle-gain", label: "Muscle Gain" },
  { v: "balanced", label: "Balanced" },
  { v: "keto", label: "Keto" },
];

// Derived dietary + health facets (computed from each plan's dishes — no schema needed).
const FACETS: { v: string; label: string; Icon: any; test: (m: PlanMeta) => boolean }[] = [
  { v: "pureVeg", label: "Pure Veg", Icon: Leaf, test: (m) => m.pureVeg },
  { v: "highProtein", label: "High Protein", Icon: Dumbbell, test: (m) => m.highProtein },
  { v: "highFiber", label: "High Fibre", Icon: Wheat, test: (m) => m.highFiber },
  { v: "lowCalorie", label: "Low Calorie", Icon: Flame, test: (m) => m.lowCalorie },
];

export const Route = createFileRoute("/plans/")({
  validateSearch: (s: Record<string, unknown>) => ({ goal: typeof s.goal === "string" ? s.goal : undefined }),
  head: () => ({
    meta: [
      { title: "Popular Food Bowl Plans — Amrutam Bowl" },
      { name: "description", content: "Chef-crafted weekly, biweekly and monthly bowl plans with macro balance for every goal." },
    ],
  }),
  component: PlansPage,
  errorComponent: ({ error }) => <div className="p-8">Couldn't load plans: {error.message}</div>,
});

function PlansPage() {
  const { goal: goalParam } = Route.useSearch();
  const [goal, setGoal] = useState(goalParam ?? "all");
  const [facets, setFacets] = useState<Set<string>>(new Set());
  const toggleFacet = (v: string) =>
    setFacets((cur) => {
      const next = new Set(cur);
      next.has(v) ? next.delete(v) : next.add(v);
      return next;
    });
  const plansQ = useQuery({
    queryKey: ["plans-public-with-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*, plan_items(menu_items(id,name,image_url,food_type,price_inr,protein_g,fiber_g,calories))")
        .eq("status", "active").order("is_popular" as any, { ascending: false }).order("price_inr");
      if (error) throw error;
      return data as any[];
    },
  });

  const plans = plansQ.data ?? [];
  const metas = new Map(plans.map((p) => [p.id, planMeta(p)]));

  // "Best Value" = the uniquely lowest per-meal price among multi-meal bundles.
  let bestValueId: string | null = null;
  const valued = plans.filter((p) => (metas.get(p.id)?.mealsPerCycle ?? 1) > 1);
  if (valued.length > 1) {
    const sorted = [...valued].sort((a, b) => metas.get(a.id)!.perMeal - metas.get(b.id)!.perMeal);
    if (metas.get(sorted[0].id)!.perMeal < metas.get(sorted[1].id)!.perMeal) bestValueId = sorted[0].id;
  }

  const activeFacets = FACETS.filter((f) => facets.has(f.v));
  const visible = plans.filter((p) => {
    if (goal !== "all" && p.goal_type !== goal) return false;
    const m = metas.get(p.id)!;
    return activeFacets.every((f) => f.test(m));
  });

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="relative mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:py-8">
        <div aria-hidden className="pointer-events-none absolute -top-10 right-0 -z-10 h-56 w-72 rounded-full opacity-30 blur-3xl" style={{ background: "var(--color-saffron)" }} />
        <Reveal>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Macro-Balanced · Chef-Crafted</span>
          <h1 className="mt-2.5 font-display text-2xl md:text-3xl font-bold tracking-tight">Bowl Plans for Every Goal</h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">Ready-made, nutritionist-designed plans — subscribe in a tap, or <Link to="/bowl" className="inline-flex items-center gap-1 align-bottom text-primary font-medium underline underline-offset-2"><ChefHat className="h-4 w-4" /> Build My Own Bowl</Link>.</p>
        </Reveal>

        {/* Goal finder + dietary/health filters */}
        {plans.length > 0 && (
          <Reveal className="mt-5 space-y-3 rounded-2xl border bg-card/70 p-4 shadow-sm backdrop-blur">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">What's your goal?</div>
              <div className="flex flex-wrap gap-2">
                {GOALS.map((g) => (
                  <button key={g.v} type="button" onClick={() => setGoal(g.v)}
                    className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${goal === g.v ? "bg-primary text-primary-foreground border-primary" : "hover:bg-secondary"}`}>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Refine</div>
              <div className="flex flex-wrap gap-2">
                {FACETS.map((f) => {
                  const on = facets.has(f.v);
                  return (
                    <button key={f.v} type="button" onClick={() => toggleFacet(f.v)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${on ? "bg-primary text-primary-foreground border-primary" : "hover:bg-secondary"}`}>
                      <f.Icon className="h-3.5 w-3.5" /> {f.label}
                    </button>
                  );
                })}
                {(facets.size > 0 || goal !== "all") && (
                  <button type="button" onClick={() => { setFacets(new Set()); setGoal("all"); }}
                    className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground">
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div className="border-t pt-2.5 text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{visible.length}</span> of {plans.length} plan{plans.length === 1 ? "" : "s"}
            </div>
          </Reveal>
        )}

        {plansQ.isLoading && <div className="mt-6 text-muted-foreground">Loading…</div>}
        {!plansQ.isLoading && plans.length === 0 && (
          <Card className="p-8 mt-6 text-center text-muted-foreground">No plans available yet.</Card>
        )}
        {!plansQ.isLoading && plans.length > 0 && visible.length === 0 && (
          <Card className="p-8 mt-6 text-center text-muted-foreground">
            No plans match these filters — <Link to="/bowl" className="inline-flex items-center gap-1 align-bottom text-primary font-medium underline"><ChefHat className="h-4 w-4" /> Build My Own Bowl</Link> instead.
          </Card>
        )}

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {visible.map((p: any, i: number) => {
            const items = (p.plan_items ?? []).map((pi: any) => pi.menu_items).filter((m: any) => m);
            const uniq = Array.from(new Map(items.map((m: any) => [m.id, m])).values()) as any[];
            const meta = metas.get(p.id)!;
            return (
              <Reveal key={p.id} delay={i * 60} className="h-full">
                <Link to="/plans/$id" params={{ id: p.id }} className="group block h-full">
                <Card className="relative overflow-hidden flex flex-col h-full transition hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]">
                  {p.is_popular && (
                    <div className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-[var(--color-saffron)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-saffron-foreground)] shadow">
                      <Sparkles className="h-3 w-3" /> Popular
                    </div>
                  )}
                  {bestValueId === p.id && (
                    <div className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground shadow">
                      <BadgePercent className="h-3 w-3" /> Best Value
                    </div>
                  )}
                  <div className="relative overflow-hidden">
                    <MealImage path={p.image_url} alt={p.name} className="h-48 w-full object-cover transition duration-500 group-hover:scale-105" />
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent" />
                    <div className="absolute bottom-2.5 left-3 flex gap-1.5">
                      <Badge variant="secondary" className="capitalize bg-card/90 backdrop-blur">{p.goal_type.replace("-", " ")}</Badge>
                      <Badge variant="secondary" className="capitalize bg-card/90 backdrop-blur">{p.billing_cycle}</Badge>
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-display text-xl leading-tight">{p.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded-md bg-secondary px-2 py-1 font-medium text-secondary-foreground">{p.meals_per_day} meal{p.meals_per_day === 1 ? "" : "s"}/day</span>
                      <span className="rounded-md bg-secondary px-2 py-1 font-medium text-secondary-foreground">{p.days_per_week} day{p.days_per_week === 1 ? "" : "s"}/week</span>
                      {meta.avgProtein > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 font-semibold text-primary"><Dumbbell className="h-3 w-3" /> ~{meta.avgProtein}g protein</span>
                      )}
                      {meta.pureVeg && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-veg)]/10 px-2 py-1 font-semibold text-[var(--color-veg)]"><Leaf className="h-3 w-3" /> Pure Veg</span>
                      )}
                      {meta.highFiber && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 font-semibold text-secondary-foreground"><Wheat className="h-3 w-3" /> High Fibre</span>
                      )}
                      {meta.lowCalorie && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 font-semibold text-secondary-foreground"><Flame className="h-3 w-3 text-[var(--color-terracotta)]" /> Low Cal</span>
                      )}
                    </div>
                    {uniq.length > 0 && (
                      <div className="mt-4">
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">What's inside · {uniq.length} dishes</div>
                        <div className="flex flex-col gap-2">
                          {uniq.map((m: any) => (
                            <div key={m.id} className="flex items-center gap-2.5 rounded-lg border bg-card/60 p-1.5 pr-3">
                              <MealImage path={m.image_url} alt={m.name}
                                className="h-10 w-10 shrink-0 rounded-md object-cover" />
                              <div className="min-w-0 flex items-center gap-1.5">
                                <span className={m.food_type === "veg" || m.food_type === "jain" ? "veg-dot shrink-0" : "nonveg-dot shrink-0"} aria-hidden />
                                <span className="truncate text-sm font-medium leading-tight">{m.name}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="mt-5 border-t pt-4">
                      {meta.savingsPct >= 5 && (
                        <div className="mb-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-saffron)]/15 px-2.5 py-1 text-[11px] font-bold text-[var(--color-saffron-foreground)]">
                            <BadgePercent className="h-3 w-3" /> Save {meta.savingsPct}% vs à la carte
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="font-display text-2xl leading-none">₹{Number(p.price_inr).toFixed(0)}
                          <span className="text-xs font-sans font-normal text-muted-foreground">/{cycleSuffix(p.billing_cycle)}</span>
                          {meta.mealsPerCycle > 1 && (
                            <div className="mt-0.5 text-[11px] font-sans font-normal text-muted-foreground">≈ ₹{meta.perMeal}/meal</div>
                          )}
                        </div>
                        <span className="inline-flex items-center rounded-full bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition group-hover:shadow-md">
                          View
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
                </Link>
              </Reveal>
            );
          })}
        </div>

        <div className="mt-5">
          <BuildBowlCard />
        </div>
      </main>
      <Footer />
    </div>
  );
}
