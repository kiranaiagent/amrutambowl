import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { MealImage } from "@/components/MealImage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Leaf, Dumbbell, Flame, Heart, Sparkles, Truck, ShieldCheck, ArrowRight, Phone } from "lucide-react";
import { useSiteSettings } from "@/lib/settings";

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
  const { data: settings } = useSiteSettings();
  const whatsapp = settings?.whatsapp_number ?? "919999999999";
  const phone = settings?.phone_number ?? "+919999999999";
  const prefill = encodeURIComponent(settings?.whatsapp_prefill ?? "Hi! I have a question about my meal subscription.");
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

      {/* Slim hero banner */}
      <section className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <div className="mx-auto max-w-6xl px-4 py-6 md:py-8 text-primary-foreground">
          <h1 className="font-display text-xl md:text-2xl font-semibold">Personalized Healthy Food Bowls Delivered Daily</h1>
        </div>
      </section>

      {/* Primary CTAs */}
      <section className="mx-auto max-w-6xl px-4 pt-6 md:pt-8">
        <div className="flex flex-wrap gap-3">
          <Link to="/plans"><Button size="lg">Popular Food Bowl Plans</Button></Link>
          <Link to="/bowl"><Button size="lg" variant="outline">Build My Own Bowl</Button></Link>
        </div>
      </section>

      {/* Popular plans */}
      {(plans.data?.length ?? 0) > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <div className="flex items-end justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold">Popular Food Bowl Plans</h2>
              <p className="text-sm text-muted-foreground mt-1">Pick a plan and start Healthy Food Bowls Journey</p>
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

      {/* Contact / questions */}
      <section className="bg-secondary/30 py-12 border-t">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold">Questions? Talk to us</h2>
          <p className="mt-2 text-sm text-muted-foreground">We're happy to help with plans, delivery, dietary preferences, or anything else.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href={`https://wa.me/${whatsapp}?text=${prefill}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-3 font-semibold text-white shadow hover:scale-[1.02] transition"
            >
              <svg viewBox="0 0 32 32" className="h-5 w-5" fill="currentColor" aria-hidden>
                <path d="M16.225 1.875c-7.97 0-14.5 6.602-14.5 14.578a14.55 14.55 0 0 0 2.522 8.218l-1.736 5.115 5.349-1.706a14.54 14.54 0 0 0 8.336 2.612C24.196 30.692 30.725 24.09 30.725 16.45c0-3.892-1.516-7.555-4.27-10.31a14.48 14.48 0 0 0-10.23-4.265zm5.964 20.785c-.254.71-1.49 1.36-2.07 1.402-.527.038-1.193.052-1.925-.122-.444-.106-1.014-.296-1.742-.61-3.068-1.324-5.072-4.413-5.225-4.617-.153-.203-1.255-1.665-1.255-3.177 0-1.51.792-2.255 1.073-2.563.28-.305.612-.382.815-.382.203 0 .407.002.585.01.187.01.438-.07.685.522.255.61.866 2.118.943 2.272.077.153.128.331.025.534-.102.203-.153.33-.305.508-.153.178-.32.398-.458.534-.153.153-.31.32-.133.624.178.305.79 1.305 1.697 2.114 1.165 1.04 2.148 1.36 2.452 1.513.305.153.483.127.661-.076.178-.204.763-.89.967-1.196.203-.305.407-.254.687-.153.28.102 1.78.84 2.085.992.305.153.508.229.585.357.077.127.077.737-.178 1.448z"/>
              </svg>
              Chat on WhatsApp
            </a>
            <a
              href={`tel:${phone}`}
              className="inline-flex items-center gap-2 rounded-full border-2 border-primary px-6 py-3 font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition"
            >
              <Phone className="h-5 w-5" /> Call {phone}
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
