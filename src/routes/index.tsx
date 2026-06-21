import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { MealImage } from "@/components/MealImage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Leaf, Dumbbell, Flame, Heart, Sparkles, Truck, ShieldCheck, ArrowRight } from "lucide-react";
import bowlAsset from "@/assets/brand/amrutam-bowl.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Amrutam — Healthy Meal Subscriptions in India" },
      { name: "description", content: "Chef-crafted, macro-balanced tiffins delivered daily. Veg & non-veg plans for weight loss, muscle gain, balanced and keto." },
    ],
  }),
  component: Home,
});

function Home() {
  const featured = useQuery({
    queryKey: ["home-meals"],
    queryFn: async () => {
      const { data } = await supabase.from("menu_items").select("*").eq("status", "active").limit(6);
      return data ?? [];
    },
  });
  const plans = useQuery({
    queryKey: ["home-plans"],
    queryFn: async () => {
      const { data } = await supabase
        .from("plans")
        .select("*")
        .eq("status", "active")
        .order("price_inr", { ascending: true })
        .limit(4);
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Compact hero: brand + CTAs, no marketing copy */}
      <section className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <div className="mx-auto max-w-6xl px-4 py-8 md:py-12 text-primary-foreground">
          <div className="flex items-center gap-4">
            <img src={bowlAsset.url} alt="Amrutam" className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-white/90 p-1 shadow-lg" />
            <div>
              <div className="font-display text-3xl md:text-4xl font-bold leading-none">Amrutam</div>
              <div className="text-sm md:text-base opacity-90 mt-1">Fresh &amp; Healthy food bowls delivered daily</div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/plans" className="rounded-full bg-background px-5 py-2.5 font-semibold text-primary shadow-lg hover:scale-[1.02] transition">Order a Plan</Link>
            <Link to="/bowl" className="rounded-full border border-primary-foreground/50 px-5 py-2.5 font-semibold">Build a Bowl</Link>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs md:text-sm opacity-90">
            <div className="inline-flex items-center gap-1.5"><Sparkles className="h-4 w-4" /> Fresh, never frozen</div>
            <div className="inline-flex items-center gap-1.5"><Truck className="h-4 w-4" /> Daily delivery</div>
            <div className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> FSSAI certified</div>
          </div>
        </div>
      </section>

      {/* Popular plans first — primary action */}
      {(plans.data?.length ?? 0) > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <div className="flex items-end justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold">Popular plans</h2>
              <p className="text-sm text-muted-foreground mt-1">Pick a plan and start tomorrow.</p>
            </div>
            <Link to="/plans" className="text-sm text-primary font-medium inline-flex items-center gap-1">See all <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {plans.data?.map((p: any) => (
              <Link key={p.id} to="/plans/$id" params={{ id: p.id }} className="group">
                <Card className="overflow-hidden hover:shadow-lg transition h-full flex flex-col">
                  <MealImage path={p.image_url} alt={p.name} className="h-36 w-full object-cover" />
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{String(p.goal_type).replace("-", " ")}</div>
                    <div className="font-semibold mt-0.5">{p.name}</div>
                    <div className="mt-auto pt-3 flex items-center justify-between">
                      <div className="font-bold text-lg">₹{Number(p.price_inr).toFixed(0)}
                        <span className="text-xs font-normal text-muted-foreground">/{p.billing_cycle === "weekly" ? "wk" : "mo"}</span>
                      </div>
                      <span className="text-xs font-medium text-primary group-hover:underline">Order →</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="bg-secondary/30 py-12">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center">Goals we cook for</h2>
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[
              { i: Flame, l: "Weight Loss", d: "Calorie-deficit, high fiber" },
              { i: Dumbbell, l: "Muscle Gain", d: "High-protein, lean carbs" },
              { i: Heart, l: "Balanced", d: "Everyday nutrition" },
              { i: Leaf, l: "Keto", d: "Low-carb, high-fat" },
            ].map(({ i: Icon, l, d }) => (
              <Link key={l} to="/plans" className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)] border hover:shadow-md transition">
                <Icon className="h-7 w-7 text-primary" />
                <div className="mt-2 font-semibold">{l}</div>
                <div className="text-xs text-muted-foreground">{d}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {(featured.data?.length ?? 0) > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12">
          <div className="flex items-end justify-between flex-wrap gap-2">
            <h2 className="font-display text-2xl md:text-3xl font-bold">From our kitchen</h2>
            <Link to="/bowl" className="text-sm text-primary font-medium">Build your bowl →</Link>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
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
