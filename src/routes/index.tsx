import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { MealImage } from "@/components/MealImage";
import { PlanCard } from "@/components/PlanCard";
import {
  Phone, ChefHat, Dumbbell, Star, Salad, Flame, Leaf,
  Users, ArrowRight, Target,
} from "lucide-react";
import { BuildBowlCard } from "@/components/BuildBowlCard";
import { QuickCustomize } from "@/components/QuickCustomize";
import { Reveal } from "@/components/Reveal";
import { useSiteSettings } from "@/lib/settings";

const TESTIMONIALS = [
  { name: "Aarav Mehta", tag: "Muscle Gain", quote: "The high-protein bowls keep me full and on-track. Delivery is always on time and genuinely fresh." },
  { name: "Priya Nair", tag: "Weight Loss", quote: "Down 4 kg in two months without feeling like I'm dieting. Portions are perfectly controlled." },
  { name: "Rohan Shah", tag: "Busy Professional", quote: "I pick a plan and forget it — real, home-style food simply shows up at my door every day." },
];

const GOALS = [
  { v: "weight-loss", label: "Weight Loss" },
  { v: "muscle-gain", label: "Muscle Gain" },
  { v: "balanced", label: "Balanced" },
  { v: "keto", label: "Keto" },
];

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
  const corporatePrefill = encodeURIComponent("Hi! I'd like to enquire about corporate meal plans for my team.");

  const featured = useQuery({
    queryKey: ["home-meals"],
    queryFn: async () => {
      const { data } = await supabase.from("menu_items")
        .select("*, bowl_components!bowl_components_bowl_id_fkey(ingredient:menu_items!bowl_components_ingredient_id_fkey(name))")
        .eq("status", "active")
        .order("calories", { ascending: false }).limit(16);
      const all = data ?? [];
      // Prefer sellable Bowls; fall back to whatever's active if none are tagged yet.
      const bowls = all.filter((m: any) => m.kind === "bowl");
      return (bowls.length ? bowls : all).slice(0, 8);
    },
  });
  const plans = useQuery({
    queryKey: ["home-plans-with-items"],
    queryFn: async () => {
      const { data } = await supabase
        .from("plans")
        .select("*, plan_items(menu_items(id,name,image_url,food_type,calories,protein_g,fiber_g,glycemic_index,sodium_mg))")
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

      {/* Hero — Panera-inspired warm editorial */}
      <section className="relative overflow-hidden" style={{ background: "var(--gradient-warm)" }}>
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="float-slow absolute -top-24 -right-16 h-80 w-80 rounded-full opacity-40 blur-3xl" style={{ background: "var(--color-saffron)" }} />
          <div className="float-slower absolute -bottom-24 -left-16 h-80 w-80 rounded-full opacity-30 blur-3xl" style={{ background: "var(--color-primary)" }} />
        </div>
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-[1.05fr_1fr] md:py-20">
          <Reveal>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-paprika)]/12 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-paprika)]">
              <Flame className="h-3.5 w-3.5" /> Warm · Wholesome · Fresh Daily
            </span>
            <h2 className="mt-4 font-display text-4xl md:text-6xl font-bold leading-[1.02] tracking-tight">
              Real food.<br/>
              <span className="text-primary">Made with love,</span><br/>
              delivered warm.
            </h2>
            <p className="mt-4 max-w-lg text-base md:text-lg text-muted-foreground">
              Chef-crafted bowls, salads and thalis — clean ingredients, honest macros, at your door every day.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/plans" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-lg">
                Explore Meal Plans <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/bowl" className="inline-flex items-center gap-1.5 rounded-full border-2 border-primary bg-card px-7 py-3.5 text-sm font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground">
                <ChefHat className="h-4 w-4" /> Build My Own Bowl
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Leaf className="h-3.5 w-3.5 text-primary" /> FSSAI certified</span>
              <span className="inline-flex items-center gap-1.5"><Flame className="h-3.5 w-3.5 text-[var(--color-terracotta)]" /> Never frozen</span>
              <span className="inline-flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-[var(--color-saffron)] fill-current" /> Loved by 2,400+ eaters</span>
            </div>
          </Reveal>
          <Reveal delay={140} className="relative mx-auto w-full max-w-md">
            <div className="float-slow relative overflow-hidden rounded-[2.5rem] border-4 border-card bg-card shadow-[var(--shadow-warm)]">
              <img src="/brand/amrutam-bowl.jpg" alt="A warm, wholesome Amrutam bowl" className="aspect-square w-full object-cover" />
              <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent" />
            </div>
            <span className="float-slower absolute -left-3 top-8 inline-flex items-center gap-1.5 rounded-full border bg-card px-3.5 py-2 text-xs font-bold shadow-[var(--shadow-card)]">
              <Dumbbell className="h-3.5 w-3.5 text-primary" /> 28g protein
            </span>
            <span className="float-slow absolute -right-3 bottom-14 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-paprika)] px-3.5 py-2 text-xs font-bold text-[var(--color-paprika-foreground)] shadow-[var(--shadow-card)]">
              <Flame className="h-3.5 w-3.5" /> Served warm
            </span>
            <span className="float-slower absolute -top-3 right-8 inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-[var(--shadow-card)]">
              <Leaf className="h-3.5 w-3.5" /> Real ingredients
            </span>
          </Reveal>
        </div>
      </section>

      {/* Craveable Categories — Panera-style category strip */}
      <section className="border-y bg-card">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden md:grid-cols-4" style={{ background: "var(--color-border)" }}>
          {[
            { to: "/plans", label: "Meal Plans", sub: "Subscribe & save", Icon: Salad, tint: "var(--color-primary)" },
            { to: "/bowl", label: "Build a Bowl", sub: "Your rules", Icon: ChefHat, tint: "var(--color-paprika)" },
            { to: "/plans", label: "High Protein", sub: "25g+ per meal", Icon: Dumbbell, tint: "var(--color-terracotta)", search: { goal: "muscle-gain" as const } },
            { to: "/plans", label: "Light & Lean", sub: "Under 450 kcal", Icon: Leaf, tint: "var(--color-saffron)", search: { goal: "weight-loss" as const } },
          ].map((c) => (
            <Link key={c.label} to={c.to} search={c.search as any} className="group flex items-center gap-3 bg-card px-5 py-5 transition hover:bg-secondary/60">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-primary-foreground" style={{ background: c.tint }}>
                <c.Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="font-display text-base font-semibold leading-tight">{c.label}</div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{c.sub}</div>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          ))}
        </div>
      </section>

      {/* Build My Own Bowl */}
      <section className="mx-auto max-w-6xl px-4 py-10 md:py-12">
        <BuildBowlCard />
      </section>


      {/* Bowl Plans */}
      {(plans.isLoading || (plans.data?.length ?? 0) > 0) && (
        <section className="mx-auto max-w-6xl px-4 py-6 md:py-10">
          <Reveal className="flex items-end justify-between flex-wrap gap-2">
            <h2 className="font-display text-2xl md:text-3xl inline-flex items-center gap-2"><Salad className="h-6 w-6 text-primary" /> Bowl Plans</h2>
            <Link to="/plans" className="text-sm text-primary font-medium hover:underline">See all</Link>
          </Reveal>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {plans.isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                    <div className="skeleton h-56 w-full" />
                    <div className="space-y-2 p-3.5">
                      <div className="skeleton h-4 w-3/4 rounded" />
                      <div className="skeleton h-3 w-full rounded" />
                      <div className="skeleton mt-3 h-9 w-full rounded-full" />
                    </div>
                  </div>
                ))
              : plans.data?.map((p: any, i: number) => (
                  <Reveal key={p.id} delay={i * 70} className="h-full">
                    <PlanCard p={p} />
                  </Reveal>
                ))}
          </div>
        </section>
      )}

      {/* Explore Our Menu — Bowlify-style item cards */}
      {(featured.isLoading || (featured.data?.length ?? 0) > 0) && (
        <section id="menu" className="mx-auto max-w-6xl px-4 py-6 md:py-10 scroll-mt-24">
          <Reveal className="flex items-end justify-between flex-wrap gap-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-primary">Featured</span>
              <h2 className="font-display text-2xl md:text-3xl font-bold">Explore Our Menu</h2>
            </div>
            <Link to="/bowl" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"><ChefHat className="h-4 w-4" /> Build My Own Bowl</Link>
          </Reveal>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                    <div className="skeleton h-60 w-full" />
                    <div className="space-y-2 p-3.5">
                      <div className="skeleton h-4 w-2/3 rounded" />
                      <div className="skeleton h-3 w-full rounded" />
                      <div className="skeleton mt-3 h-9 w-full rounded-full" />
                    </div>
                  </div>
                ))
              : featured.data?.map((it: any, i: number) => {
              const cals = Number(it.calories) || 0;
              const protein = Number(it.protein_g) || 0;
              const isVeg = it.food_type === "veg" || it.food_type === "jain";
              const recipe = (it.bowl_components ?? []).map((c: any) => c.ingredient?.name).filter(Boolean).join(" · ");
              const badge = it.is_popular
                ? { label: "Bestseller", cls: "bg-[var(--color-saffron)] text-[var(--color-saffron-foreground)]" }
                : protein >= 25
                  ? { label: "High Protein", cls: "bg-primary text-primary-foreground" }
                  : isVeg
                    ? { label: "Veg", cls: "bg-primary text-primary-foreground" }
                    : { label: "Non-Veg", cls: "bg-[var(--color-terracotta)] text-white" };
              return (
                <Reveal key={it.id} delay={i * 70} className="h-full">
                <div className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="relative">
                    <MealImage path={it.image_url} alt={it.name} className="h-60 w-full object-cover" />
                    <span className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shadow ${badge.cls}`}>{badge.label}</span>
                    {Number(it.price_inr) > 0 && (
                      <span className="absolute right-2.5 top-2.5 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground shadow">₹{Number(it.price_inr).toFixed(0)}</span>
                    )}
                    {protein > 0 && (
                      <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground shadow"><Leaf className="h-3 w-3" /> {protein}g protein</span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className={isVeg ? "veg-dot shrink-0" : "nonveg-dot shrink-0"} aria-hidden />
                      <h3 className="font-semibold leading-tight line-clamp-1">{it.name}</h3>
                    </div>
                    {(recipe || it.description) && (
                      <p className="text-xs leading-snug text-muted-foreground line-clamp-2">{recipe || it.description}</p>
                    )}
                    {cals > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground"><Flame className="h-3 w-3 text-[var(--color-terracotta)]" /> {cals} kcal</span>
                        {protein >= 25 && (
                          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">High Protein</span>
                        )}
                      </div>
                    )}
                    <div className="mt-auto">
                      <QuickCustomize item={it} recipe={recipe} triggerClassName="flex w-full items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:shadow-md" />
                    </div>
                  </div>
                </div>
                </Reveal>
              );
            })}
          </div>
        </section>
      )}

      {/* CTA band */}
      <section className="py-12 md:py-14 text-center" style={{ background: "var(--color-primary)", color: "var(--color-primary-foreground)" }}>
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="font-display text-2xl md:text-4xl font-bold">Eat Real. Feel Amazing. Live Better.</h2>
          <p className="mt-2 text-sm opacity-90">Fresh, chef-crafted meals delivered to your door every day.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/plans" className="inline-flex items-center gap-1.5 rounded-full bg-background px-6 py-3 text-sm font-semibold text-primary transition hover:shadow-md">
              Explore Plans <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/bowl" className="inline-flex items-center gap-1.5 rounded-full border-2 border-primary-foreground/70 px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary-foreground hover:text-primary">
              <ChefHat className="h-4 w-4" /> Build My Own Bowl
            </Link>
          </div>
        </div>
      </section>

      {/* Goal finder */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="rounded-3xl border bg-card p-6 text-center shadow-[var(--shadow-card)] md:p-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Target className="h-3.5 w-3.5" /> Eating for a goal?
          </span>
          <h2 className="mt-3 font-display text-2xl md:text-3xl font-bold">Tell us your goal — we'll match your bowl.</h2>
          <p className="mt-2 text-sm text-muted-foreground">Weight loss, muscle gain, balanced or keto — find a plan tuned to you.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {GOALS.map((g) => (
              <Link key={g.v} to="/plans" search={{ goal: g.v }}
                className="rounded-full border px-4 py-2 text-sm font-medium transition hover:border-primary hover:bg-primary/5">
                {g.label}
              </Link>
            ))}
          </div>
          <div className="mt-6">
            <Link to="/bowl" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:shadow-md">
              <ChefHat className="h-4 w-4" /> Build My Own Bowl
            </Link>
          </div>
        </div>
      </section>

      {/* Corporate orders */}
      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="flex flex-col items-center gap-4 rounded-3xl border p-6 text-center md:flex-row md:justify-between md:p-8 md:text-left" style={{ background: "var(--color-cream)" }}>
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-xl md:text-2xl font-bold">Healthy Meals for Your Whole Team</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">Breakfast, lunch & full-day corporate meal plans for offices. Tell us your team size and we'll tailor a plan.</p>
            </div>
          </div>
          <a href={`https://wa.me/${whatsapp}?text=${corporatePrefill}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:shadow-md">
            Enquire for Corporate <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-12 md:py-14" style={{ background: "var(--color-cream)" }}>
        <div className="mx-auto max-w-6xl px-4">
          <Reveal className="text-center">
            <h2 className="font-display text-2xl md:text-3xl font-bold">Loved by Our Customers</h2>
            <p className="mt-2 text-sm text-muted-foreground">Real food, real results — here's what they say.</p>
          </Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 80} className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)]">
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
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Contact / questions */}
      <section id="contact" className="bg-secondary/30 py-12 border-t scroll-mt-24">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold">Questions? Talk to Us</h2>
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
