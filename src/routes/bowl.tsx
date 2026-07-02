import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { MealImage } from "@/components/MealImage";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { QuickCustomize } from "@/components/QuickCustomize";
import { useCart } from "@/lib/cart";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Salad, Coffee, Cookie, Utensils, Search, Plus, Flame, Leaf, Dumbbell, Filter } from "lucide-react";

/**
 * Menu — Panera-style: category tabs, quick-add + customize per item.
 * Replaces the multi-step wizard with a familiar restaurant-style browse.
 */
export const Route = createFileRoute("/bowl")({
  head: () => ({
    meta: [
      { title: "Menu — Amrutam Bowl" },
      { name: "description", content: "Browse our full menu of bowls, beverages, snacks and sauces. Add or customise, then check out." },
    ],
  }),
  component: MenuPage,
});

type Cat = "all" | "bowl" | "beverage" | "snack" | "sauce";
const CATS: { v: Cat; label: string; Icon: any; sub: string }[] = [
  { v: "all", label: "All", Icon: Utensils, sub: "" },
  { v: "bowl", label: "Bowls", Icon: Salad, sub: "Signature" },
  { v: "beverage", label: "Beverages", Icon: Coffee, sub: "Add a drink" },
  { v: "snack", label: "Snacks", Icon: Cookie, sub: "Munchies" },
  { v: "sauce", label: "Sauces", Icon: Filter, sub: "Extras" },
];

function MenuPage() {
  const { add } = useCart();
  const [cat, setCat] = useState<Cat>("all");
  const [q, setQ] = useState("");
  const [vegOnly, setVegOnly] = useState(false);

  const menuQ = useQuery({
    queryKey: ["menu-browse"],
    queryFn: async () => {
      const { data, error } = await supabase.from("menu_items")
        .select("id,name,description,image_url,price_inr,food_type,calories,protein_g,fiber_g,kind,is_addon,component_role,is_popular")
        .eq("status", "active").eq("is_available", true)
        .order("is_popular" as any, { ascending: false }).order("name");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const items = useMemo(() => {
    const all = menuQ.data ?? [];
    const filtered = all.filter((m) => {
      if (vegOnly && !(m.food_type === "veg" || m.food_type === "jain")) return false;
      if (q && !`${m.name} ${m.description ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (cat === "all") return true;
      if (cat === "sauce") return m.component_role === "sauce";
      if (cat === "beverage") return m.kind === "beverage";
      if (cat === "snack") return m.kind === "snack";
      if (cat === "bowl") return m.kind === "bowl" || (!m.is_addon && m.component_role !== "sauce" && m.kind !== "beverage" && m.kind !== "snack");
      return true;
    });
    return filtered;
  }, [menuQ.data, cat, q, vegOnly]);

  const counts = useMemo(() => {
    const all = menuQ.data ?? [];
    return {
      all: all.length,
      bowl: all.filter((m) => m.kind === "bowl" || (!m.is_addon && m.component_role !== "sauce" && m.kind !== "beverage" && m.kind !== "snack")).length,
      beverage: all.filter((m) => m.kind === "beverage").length,
      snack: all.filter((m) => m.kind === "snack").length,
      sauce: all.filter((m) => m.component_role === "sauce").length,
    } as Record<Cat, number>;
  }, [menuQ.data]);

  const quickAdd = (m: any) => {
    add({ id: m.id, name: m.name, price_inr: Number(m.price_inr), image_url: m.image_url ?? null });
    toast.success(`${m.name} added to your bowl`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:py-10">
        {/* Header */}
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Our Kitchen</span>
            <h1 className="mt-1 font-display text-3xl md:text-4xl font-bold">The Menu</h1>
            <p className="text-sm text-muted-foreground">Signature bowls, drinks, snacks & sauces. Tap Add — or Customize to make it yours.</p>
          </div>
          <Link to="/plans" className="text-sm font-medium text-primary hover:underline">Prefer a subscription? See plans →</Link>
        </div>

        {/* Search + veg filter */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search bowls, drinks…" className="pl-9" />
          </div>
          <button
            onClick={() => setVegOnly((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition ${vegOnly ? "border-primary bg-primary/5 text-primary" : "hover:bg-secondary"}`}
          >
            <Leaf className="h-4 w-4" /> Veg only
          </button>
        </div>

        {/* Category tabs */}
        <div className="mt-5 -mx-4 overflow-x-auto px-4">
          <div className="flex min-w-max gap-2">
            {CATS.map((c) => {
              const on = cat === c.v;
              return (
                <button
                  key={c.v}
                  onClick={() => setCat(c.v)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${on ? "border-primary bg-primary text-primary-foreground shadow-sm" : "hover:bg-secondary"}`}
                >
                  <c.Icon className="h-4 w-4" />
                  {c.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${on ? "bg-primary-foreground/20 text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{counts[c.v] ?? 0}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {menuQ.isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                  <div className="skeleton h-52 w-full" />
                  <div className="space-y-2 p-3.5">
                    <div className="skeleton h-4 w-2/3 rounded" />
                    <div className="skeleton h-3 w-full rounded" />
                    <div className="skeleton mt-3 h-9 w-full rounded-full" />
                  </div>
                </div>
              ))
            : items.length === 0 ? (
              <Card className="col-span-full p-10 text-center">
                <p className="text-muted-foreground">No items match — try clearing filters.</p>
              </Card>
            ) : items.map((m) => {
              const isVeg = m.food_type === "veg" || m.food_type === "jain";
              const cals = Number(m.calories) || 0;
              const protein = Number(m.protein_g) || 0;
              const canCustomize = m.kind === "bowl" || (!m.is_addon && m.component_role !== "sauce");
              return (
                <div key={m.id} className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="relative">
                    <MealImage path={m.image_url} alt={m.name} className="h-52 w-full object-cover transition duration-500 group-hover:scale-105" />
                    {m.is_popular && (
                      <span className="absolute left-2.5 top-2.5 rounded-full bg-[var(--color-saffron)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--color-saffron-foreground)] shadow">Popular</span>
                    )}
                    <span className="absolute right-2.5 top-2.5 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground shadow">₹{Number(m.price_inr).toFixed(0)}</span>
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className={isVeg ? "veg-dot shrink-0" : "nonveg-dot shrink-0"} aria-hidden />
                      <h3 className="font-semibold leading-tight line-clamp-1">{m.name}</h3>
                    </div>
                    {m.description && <p className="text-xs leading-snug text-muted-foreground line-clamp-2">{m.description}</p>}
                    <div className="flex flex-wrap gap-1.5">
                      {cals > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground"><Flame className="h-3 w-3 text-[var(--color-terracotta)]" /> {cals} kcal</span>
                      )}
                      {protein > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary"><Dumbbell className="h-3 w-3" /> {protein}g protein</span>
                      )}
                    </div>
                    <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => quickAdd(m)}
                        className="inline-flex items-center justify-center gap-1 rounded-full bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground transition hover:shadow-md"
                      >
                        <Plus className="h-4 w-4" /> Add
                      </button>
                      {canCustomize ? (
                        <QuickCustomize item={m} triggerClassName="inline-flex items-center justify-center gap-1 rounded-full border-2 border-primary bg-background px-3 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/5" />
                      ) : (
                        <button
                          onClick={() => quickAdd(m)}
                          className="inline-flex items-center justify-center gap-1 rounded-full border-2 border-primary bg-background px-3 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/5"
                        >
                          + Another
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </main>
      <Footer />
    </div>
  );
}
