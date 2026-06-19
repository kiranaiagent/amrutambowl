import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { MealImage } from "@/components/MealImage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Leaf, Dumbbell, Flame, Heart, Sparkles, Truck, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ruchi Bowl — Healthy Meal Subscriptions in India" },
      { name: "description", content: "Chef-crafted, macro-balanced tiffins delivered daily. Veg & non-veg plans for weight loss, muscle gain, balanced and keto." },
    ],
  }),
  component: Home,
});

function Home() {
  const featured = useQuery({
    queryKey: ["home-meals"],
    queryFn: async () => {
      const { data } = await supabase.from("menu_items").select("*").eq("is_active", true).limit(6);
      return data ?? [];
    },
  });
  const plans = useQuery({
    queryKey: ["home-plans"],
    queryFn: async () => {
      const { data } = await supabase.from("plans").select("*").eq("is_active", true).limit(4);
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24 text-primary-foreground">
          <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight max-w-2xl">
            Ghar jaisa khaana. <br /> Built for your goals.
          </h1>
          <p className="mt-4 max-w-xl text-lg opacity-90">
            Macro-balanced tiffins, chef-crafted with Telugu &amp; pan-Indian flavours. Subscribe weekly or build your own bowl.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/plans" className="rounded-full bg-background px-6 py-3 font-semibold text-primary shadow-lg hover:scale-[1.02] transition">Browse Plans</Link>
            <Link to="/bowl" className="rounded-full border border-primary-foreground/40 px-6 py-3 font-semibold">Build a Bowl</Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-6 text-sm opacity-90">
            <div className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4" /> Fresh, never frozen</div>
            <div className="inline-flex items-center gap-2"><Truck className="h-4 w-4" /> Daily delivery</div>
            <div className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> FSSAI certified</div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-3xl font-bold text-center">Goals we cook for</h2>
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { i: Flame, l: "Weight Loss", d: "Calorie-deficit, high fiber" },
            { i: Dumbbell, l: "Muscle Gain", d: "High-protein, lean carbs" },
            { i: Heart, l: "Balanced", d: "Everyday nutrition" },
            { i: Leaf, l: "Keto", d: "Low-carb, high-fat" },
          ].map(({ i: Icon, l, d }) => (
            <div key={l} className="rounded-2xl bg-card p-6 shadow-[var(--shadow-card)] border">
              <Icon className="h-8 w-8 text-primary" />
              <div className="mt-3 font-semibold">{l}</div>
              <div className="text-sm text-muted-foreground">{d}</div>
            </div>
          ))}
        </div>
      </section>

      {(plans.data?.length ?? 0) > 0 && (
        <section className="bg-secondary/30 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex items-end justify-between flex-wrap gap-2">
              <h2 className="font-display text-3xl font-bold">Popular plans</h2>
              <Link to="/plans" className="text-sm text-primary font-medium">See all →</Link>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {plans.data?.map((p: any) => (
                <Link key={p.id} to="/plans/$id" params={{ id: p.id }}>
                  <Card className="overflow-hidden hover:shadow-lg transition h-full">
                    <MealImage path={p.image_url} alt={p.name} className="h-32 w-full object-cover" />
                    <div className="p-4">
                      <div className="text-xs text-muted-foreground capitalize">{p.goal_type.replace("-", " ")}</div>
                      <div className="font-semibold">{p.name}</div>
                      <div className="mt-1 font-bold">₹{Number(p.price_inr).toFixed(0)}<span className="text-xs font-normal text-muted-foreground">/{p.billing_cycle === "weekly" ? "wk" : "mo"}</span></div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {(featured.data?.length ?? 0) > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex items-end justify-between flex-wrap gap-2">
            <h2 className="font-display text-3xl font-bold">From our kitchen</h2>
            <Link to="/bowl" className="text-sm text-primary font-medium">Build your bowl →</Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {featured.data?.map((it: any) => (
              <Card key={it.id} className="overflow-hidden">
                <MealImage path={it.image_url} alt={it.name} className="h-40 w-full object-cover" />
                <div className="p-4">
                  <div className="flex items-center gap-1.5">
                    <span className={it.food_type === "veg" || it.food_type === "jain" ? "veg-dot" : "nonveg-dot"} aria-hidden />
                    <span className="font-semibold">{it.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{it.calories} kcal · P {it.protein_g}g · C {it.carbs_g}g · F {it.fat_g}g</div>
                </div>
              </Card>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link to="/bowl"><Button size="lg">Build Your Own Bowl</Button></Link>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
