import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { MealImage } from "@/components/MealImage";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/plans/")({
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
  const plansQ = useQuery({
    queryKey: ["plans-public-with-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*, plan_items(menu_items(id,name,image_url,food_type))")
        .eq("status", "active").order("is_popular" as any, { ascending: false }).order("price_inr");
      if (error) throw error;
      return data as any[];
    },
  });
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold">Popular Food Bowl Plans</h1>
            <p className="text-muted-foreground mt-1">Pick a ready plan — or <Link to="/bowl" className="text-primary underline">build your own bowl</Link>.</p>
          </div>
        </div>
        {plansQ.isLoading && <div className="mt-6 text-muted-foreground">Loading…</div>}
        {!plansQ.isLoading && (plansQ.data?.length ?? 0) === 0 && (
          <Card className="p-8 mt-6 text-center text-muted-foreground">No plans available yet.</Card>
        )}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {plansQ.data?.map((p: any) => {
            const items = (p.plan_items ?? [])
              .map((pi: any) => pi.menu_items)
              .filter((m: any) => m);
            const uniq = Array.from(new Map(items.map((m: any) => [m.id, m])).values()) as any[];
            return (
              <Card key={p.id} className="overflow-hidden flex flex-col">
                <MealImage path={p.image_url} alt={p.name} className="h-44 w-full object-cover" />
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 flex-wrap">
                    {p.is_popular && (
                      <Badge className="bg-primary text-primary-foreground gap-1"><Sparkles className="h-3 w-3" /> Popular</Badge>
                    )}
                    <Badge variant="secondary" className="capitalize">{p.goal_type.replace("-", " ")}</Badge>
                    <Badge variant="outline" className="capitalize">{p.billing_cycle}</Badge>
                  </div>
                  <h3 className="mt-2 font-display text-xl font-bold">{p.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                  <div className="mt-3 text-sm text-muted-foreground">
                    {p.meals_per_day} meals/day · {p.days_per_week} days/week
                  </div>
                  {uniq.length > 0 && (
                    <div className="mt-3">
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">What's inside</div>
                      <div className="flex -space-x-2">
                        {uniq.slice(0, 5).map((m: any) => (
                          <MealImage key={m.id} path={m.image_url} alt={m.name}
                            className="h-10 w-10 rounded-full border-2 border-background object-cover" />
                        ))}
                        {uniq.length > 5 && (
                          <div className="h-10 w-10 rounded-full border-2 border-background bg-secondary grid place-items-center text-[11px] font-semibold">
                            +{uniq.length - 5}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-2xl font-bold">₹{Number(p.price_inr).toFixed(0)}
                      <span className="text-xs font-normal text-muted-foreground">/{p.billing_cycle === "weekly" ? "wk" : p.billing_cycle === "monthly" ? "mo" : p.billing_cycle}</span>
                    </div>
                    <Link to="/plans/$id" params={{ id: p.id }}>
                      <Button>View</Button>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}
