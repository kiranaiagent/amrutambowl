import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { PlanCard } from "@/components/PlanCard";
import { ChefHat, Dumbbell, Leaf, Wheat, Flame, Wallet, Salad } from "lucide-react";
import { BuildBowlCard } from "@/components/BuildBowlCard";
import { Reveal } from "@/components/Reveal";
import { planMeta, type PlanMeta } from "@/lib/planValue";

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

// Curated collections — marketing-friendly groupings, derived from existing data.
const BUDGET_PER_MEAL = 250; // ₹/meal threshold for value picks
const COLLECTIONS: { v: string; label: string; Icon: any; test: (p: any, m: PlanMeta) => boolean }[] = [
  { v: "protein", label: "Protein Packs", Icon: Dumbbell, test: (_p, m) => m.highProtein },
  { v: "light", label: "Light & High-Fibre", Icon: Wheat, test: (_p, m) => m.lowCalorie && m.highFiber },
  { v: "veg", label: "Pure Veg", Icon: Leaf, test: (_p, m) => m.pureVeg },
  { v: "budget", label: "Budget Picks", Icon: Wallet, test: (_p, m) => m.perMeal > 0 && m.perMeal <= BUDGET_PER_MEAL },
  { v: "keto", label: "Keto-Friendly", Icon: Salad, test: (p) => p.goal_type === "keto" },
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
  const [collection, setCollection] = useState<string | null>(null);
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
  const activeCollection = COLLECTIONS.find((c) => c.v === collection) ?? null;
  const visible = plans.filter((p) => {
    if (goal !== "all" && p.goal_type !== goal) return false;
    const m = metas.get(p.id)!;
    if (activeCollection && !activeCollection.test(p, m)) return false;
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
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Collections</div>
              <div className="flex flex-wrap gap-2">
                {COLLECTIONS.map((c) => {
                  const on = collection === c.v;
                  return (
                    <button key={c.v} type="button" onClick={() => setCollection(on ? null : c.v)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${on ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-primary/5 border-primary/20 text-primary hover:bg-primary/10"}`}>
                      <c.Icon className="h-4 w-4" /> {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
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
                {(facets.size > 0 || goal !== "all" || collection) && (
                  <button type="button" onClick={() => { setFacets(new Set()); setGoal("all"); setCollection(null); }}
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
          {visible.map((p: any, i: number) => (
            <Reveal key={p.id} delay={i * 60} className="h-full">
              <PlanCard p={p} bestValue={bestValueId === p.id} />
            </Reveal>
          ))}
        </div>

        <div className="mt-5">
          <BuildBowlCard />
        </div>
      </main>
      <Footer />
    </div>
  );
}
