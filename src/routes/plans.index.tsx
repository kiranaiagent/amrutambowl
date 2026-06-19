import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { MealImage } from "@/components/MealImage";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/plans/")({
  head: () => ({
    meta: [
      { title: "Meal Plans — Amrutam" },
      { name: "description", content: "Weekly chef-crafted meal plans for weight loss, muscle gain, balanced and keto goals." },
    ],
  }),
  component: PlansPage,
  errorComponent: ({ error }) => <div className="p-8">Couldn't load plans: {error.message}</div>,
});

function PlansPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["plans-public"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("*").eq("is_active", true).order("price_inr");
      if (error) throw error;
      return data;
    },
  });
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <h1 className="font-display text-3xl md:text-4xl font-bold">Choose your plan</h1>
        <p className="text-muted-foreground mt-1">Fresh, macro-balanced tiffins delivered to your door.</p>
        {isLoading && <div className="mt-6 text-muted-foreground">Loading…</div>}
        {!isLoading && (data?.length ?? 0) === 0 && (
          <Card className="p-8 mt-6 text-center text-muted-foreground">No plans available yet.</Card>
        )}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data?.map((p: any) => (
            <Card key={p.id} className="overflow-hidden flex flex-col">
              <MealImage path={p.image_url} alt={p.name} className="h-44 w-full object-cover" />
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">{p.goal_type.replace("-", " ")}</Badge>
                  <Badge variant="outline">{p.billing_cycle}</Badge>
                </div>
                <h3 className="mt-2 font-display text-xl font-bold">{p.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                <div className="mt-3 text-sm text-muted-foreground">
                  {p.meals_per_day} meals/day · {p.days_per_week} days/week
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-2xl font-bold">₹{Number(p.price_inr).toFixed(0)}<span className="text-xs font-normal text-muted-foreground">/{p.billing_cycle === "weekly" ? "wk" : "mo"}</span></div>
                  <Link to="/plans/$id" params={{ id: p.id }}>
                    <Button>View</Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
