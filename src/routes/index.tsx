import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { MealImage } from "@/components/MealImage";
import { Card } from "@/components/ui/card";
import { Phone, ChefHat, Dumbbell, Star } from "lucide-react";
import { BuildBowlCard } from "@/components/BuildBowlCard";
import { planMeta } from "@/lib/planValue";

const TESTIMONIALS = [
  { name: "Aarav Mehta", tag: "Muscle Gain", quote: "The high-protein bowls keep me full and on-track. Delivery is always on time and genuinely fresh." },
  { name: "Priya Nair", tag: "Weight Loss", quote: "Down 4 kg in two months without feeling like I'm dieting. Portions are perfectly controlled." },
  { name: "Rohan Shah", tag: "Busy Professional", quote: "I pick a plan and forget it — real, home-style food simply shows up at my door every day." },
];
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

const CYCLE_SUFFIX: Record<string, string> = {
  daily: "day", weekly: "week", biweekly: "2 wks", monthly: "month", custom_dates: "plan",
};
const cycleSuffix = (c: string) => CYCLE_SUFFIX[c] ?? c;

function Home() {
  const { data: settings } = useSiteSettings();
  const whatsapp = settings?.whatsapp_number ?? "919999999999";
  const phone = settings?.phone_number ?? "+919999999999";
  const prefill = encodeURIComponent(settings?.whatsapp_prefill ?? "Hi! I have a question about my meal subscription.");
  const featured = useQuery({
    queryKey: ["home-meals"],
    queryFn: async () => {
      const { data } = await supabase.from("menu_items").select("*").eq("status", "active")
        .order("calories", { ascending: false }).limit(8);
      return data ?? [];
    },
  });
  const plans = useQuery({
    queryKey: ["home-plans-with-items"],
    queryFn: async () => {
      const { data } = await supabase
        .from("plans")
        .select("*, plan_items(menu_items(id,name,image_url,food_type,calories,protein_g))")
        .eq("status", "active")
        .order("is_popular" as any, { ascending: false })
        .order("price_inr", { ascending: true })
        .limit(4);
      return data ?? [];
    },
  });


  return (
    <div className="min-h-screen">
      <SiteHeader />
      <h1 className="sr-only">Amrutam Bowl — Healthy Meal Subscriptions in India</h1>

      {/* Build My Own Bowl — shared compact card with steps */}
      <section className="mx-auto max-w-6xl px-4 py-4">
        <BuildBowlCard />
      </section>

      {/* Popular plans */}
      {(plans.data?.length ?? 0) > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <div className="flex items-end justify-between flex-wrap gap-2">
            <h2 className="font-display text-2xl md:text-3xl">Popular Bowl Plans</h2>
            <Link to="/plans" className="text-sm text-primary font-medium hover:underline">See all</Link>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {plans.data?.map((p: any) => {
              const items = Array.from(new Map(((p.plan_items ?? [])
                .map((pi: any) => pi.menu_items).filter((m: any) => m))
                .map((m: any) => [m.id, m])).values()) as any[];
              const meta = planMeta(p);
              return (
                <Link key={p.id} to="/plans/$id" params={{ id: p.id }} className="group">
                  <Card className="overflow-hidden hover:shadow-lg transition h-full flex flex-col">
                    <MealImage path={p.image_url} alt={p.name} className="h-28 w-full object-cover" />
                    <div className="p-3 flex-1 flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{String(p.goal_type).replace("-", " ")}</div>
                        <div className="text-[10px] uppercase tracking-wide text-primary font-semibold">{p.billing_cycle}</div>
                      </div>
                      <div className="font-semibold text-sm leading-tight">{p.name}</div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                        <span>{p.meals_per_day} meal{p.meals_per_day === 1 ? "" : "s"}/day · {p.days_per_week} d/wk</span>
                        {meta.avgProtein > 0 && (
                          <span className="inline-flex items-center gap-0.5 font-semibold text-primary"><Dumbbell className="h-3 w-3" /> ~{meta.avgProtein}g</span>
                        )}
                      </div>

                      {items.length > 0 && (
                        <div className="rounded-md bg-secondary/40 p-2 space-y-1.5">
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">What's inside · {items.length} dishes</div>
                          <div className="flex flex-col gap-1.5">
                            {items.map((m: any) => (
                              <div key={m.id} className="flex items-center gap-2 rounded-md border bg-card/70 p-1 pr-2">
                                <MealImage path={m.image_url} alt={m.name}
                                  className="h-8 w-8 shrink-0 rounded object-cover" />
                                <div className="min-w-0 flex items-center gap-1.5">
                                  <span className={m.food_type === "veg" || m.food_type === "jain" ? "veg-dot shrink-0" : "nonveg-dot shrink-0"} aria-hidden />
                                  <span className="truncate text-[11px] font-medium leading-tight">{m.name}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-auto pt-2 flex items-center justify-between border-t">
                        <div className="font-bold text-lg leading-none">₹{Number(p.price_inr).toFixed(0)}
                          <span className="text-[10px] font-normal text-muted-foreground">/{cycleSuffix(p.billing_cycle)}</span>
                        </div>
                        <span className="text-xs font-medium text-primary group-hover:underline">View</span>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>

        </section>
      )}


      {(featured.data?.length ?? 0) > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex items-end justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold">Explore Our Menu</h2>
              <p className="mt-1 text-sm text-muted-foreground">Fresh dishes you can mix &amp; match into your own bowl.</p>
            </div>
            <Link to="/bowl" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"><ChefHat className="h-4 w-4" /> Build My Own Bowl</Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {featured.data?.map((it: any) => {
              const cals = Number(it.calories) || 0;
              const pcf = [
                Number(it.protein_g) > 0 ? `P ${Number(it.protein_g)}g` : null,
                Number(it.carbs_g) > 0 ? `C ${Number(it.carbs_g)}g` : null,
                Number(it.fat_g) > 0 ? `F ${Number(it.fat_g)}g` : null,
              ].filter(Boolean).join(" · ");
              return (
                <Link key={it.id} to="/bowl"
                  className="group block overflow-hidden rounded-xl border bg-card transition hover:-translate-y-0.5 hover:shadow-md">
                  <MealImage path={it.image_url} alt={it.name} className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105" />
                  <div className="p-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className={it.food_type === "veg" || it.food_type === "jain" ? "veg-dot shrink-0" : "nonveg-dot shrink-0"} aria-hidden />
                      <span className="truncate text-sm font-medium leading-tight">{it.name}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      {Number(it.price_inr) > 0 ? (
                        <span className="text-xs font-semibold text-primary">₹{Number(it.price_inr).toFixed(0)}</span>
                      ) : <span />}
                      {cals > 0 && <span className="text-[10px] font-medium text-muted-foreground">{cals} kcal</span>}
                    </div>
                    {pcf && <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{pcf}</div>}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Testimonials */}
      <section className="py-12 md:py-14" style={{ background: "var(--color-cream)" }}>
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <h2 className="font-display text-2xl md:text-3xl font-bold">Loved by Our Customers</h2>
            <p className="mt-2 text-sm text-muted-foreground">Real food, real results — here's what they say.</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)]">
                <div className="flex gap-0.5 text-[var(--color-saffron)]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-foreground">"{t.quote}"</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold leading-tight">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.tag}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

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
