import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { MealImage } from "@/components/MealImage";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";
import { Plus, Minus, Filter } from "lucide-react";

export const Route = createFileRoute("/bowl")({
  head: () => ({ meta: [{ title: "Build a Bowl — Ruchi Bowl" }, { name: "description", content: "Pick your own healthy meals. Add to bowl, customize portion, checkout." }] }),
  component: BowlPage,
  errorComponent: ({ error }) => <div className="p-8">Couldn't load menu: {error.message}</div>,
});

const FOOD_FILTERS = ["all", "veg", "non-veg", "egg", "jain"] as const;

function BowlPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FOOD_FILTERS)[number]>("all");
  const { add, lines, setQty, total, count } = useCart();

  const itemsQ = useQuery({
    queryKey: ["menu-public"],
    queryFn: async () => {
      const { data, error } = await supabase.from("menu_items").select("*").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const items = useMemo(() => {
    return (itemsQ.data ?? []).filter((it: any) => {
      if (filter !== "all" && it.food_type !== filter) return false;
      if (q && !it.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [itemsQ.data, q, filter]);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section>
          <h1 className="font-display text-3xl font-bold">Build Your Bowl</h1>
          <p className="text-muted-foreground">Pick what you love. We deliver fresh, never frozen.</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Input placeholder="Search meals…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
            <div className="flex items-center gap-1 ml-auto">
              <Filter className="h-4 w-4 text-muted-foreground" />
              {FOOD_FILTERS.map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`rounded-full border px-3 py-1 text-xs capitalize ${filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-secondary"}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {itemsQ.isLoading && <div className="mt-6 text-muted-foreground">Loading menu…</div>}
          {!itemsQ.isLoading && items.length === 0 && (
            <Card className="mt-6 p-8 text-center text-muted-foreground">No meals match your filter.</Card>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {items.map((it: any) => {
              const inCart = lines.find((l) => l.id === it.id)?.qty ?? 0;
              return (
                <Card key={it.id} className="overflow-hidden flex">
                  <MealImage path={it.image_url} alt={it.name} className="h-32 w-32 object-cover shrink-0" />
                  <div className="p-3 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={it.food_type === "veg" || it.food_type === "jain" ? "veg-dot" : "nonveg-dot"} aria-hidden />
                          <h3 className="font-semibold leading-tight">{it.name}</h3>
                        </div>
                        {it.category && <div className="text-[11px] text-muted-foreground">{it.category}</div>}
                      </div>
                      <div className="text-right font-bold">₹{Number(it.price_inr).toFixed(0)}</div>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{it.description}</p>
                    <div className="mt-1.5 text-[11px] text-muted-foreground">
                      {it.calories} kcal · P {it.protein_g}g · C {it.carbs_g}g · F {it.fat_g}g
                    </div>
                    {it.allergens?.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {it.allergens.map((a: string) => <Badge key={a} variant="outline" className="text-[10px] py-0">⚠ {a}</Badge>)}
                      </div>
                    )}
                    <div className="mt-auto pt-2 flex items-center justify-end gap-2">
                      {inCart > 0 ? (
                        <>
                          <Button size="icon" variant="outline" onClick={() => setQty(it.id, inCart - 1)}><Minus className="h-3.5 w-3.5" /></Button>
                          <span className="w-6 text-center text-sm font-semibold">{inCart}</span>
                          <Button size="icon" variant="outline" onClick={() => setQty(it.id, inCart + 1)}><Plus className="h-3.5 w-3.5" /></Button>
                        </>
                      ) : (
                        <Button size="sm" onClick={() => { add({ id: it.id, name: it.name, price_inr: it.price_inr, image_url: it.image_url }); toast.success(`${it.name} added`); }}>
                          <Plus className="h-3.5 w-3.5 mr-1" /> Add
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        <aside className="lg:sticky lg:top-20 self-start">
          <Card className="p-5">
            <h2 className="font-display text-lg font-bold">Your Bowl</h2>
            <div className="mt-3 space-y-2 max-h-80 overflow-auto">
              {lines.length === 0 && <div className="text-sm text-muted-foreground">Your bowl is empty. Add meals to get started.</div>}
              {lines.map((l) => (
                <div key={l.id} className="flex items-center gap-2 text-sm">
                  <div className="flex-1 truncate">{l.name}</div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setQty(l.id, l.qty - 1)} className="h-6 w-6 rounded border">−</button>
                    <span className="w-5 text-center">{l.qty}</span>
                    <button onClick={() => setQty(l.id, l.qty + 1)} className="h-6 w-6 rounded border">+</button>
                  </div>
                  <div className="w-14 text-right font-medium">₹{(l.price_inr * l.qty).toFixed(0)}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t pt-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Subtotal ({count})</span>
              <span className="font-bold text-lg">₹{total.toFixed(0)}</span>
            </div>
            <Link to="/cart" className="block">
              <Button className="w-full mt-3" disabled={lines.length === 0}>Review & Checkout</Button>
            </Link>
          </Card>
        </aside>
      </main>
      <Footer />
    </div>
  );
}
