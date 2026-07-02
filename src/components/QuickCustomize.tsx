import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MealImage } from "@/components/MealImage";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Flame, Leaf, Plus, X } from "lucide-react";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";

/**
 * Bowlify-style quick-customise sheet for a menu card.
 * Pick a sauce (if any sauce-role ingredients exist) + optional add-ons,
 * see a live total, then drop the bowl + add-ons into the /bowl subscription flow.
 */
export function QuickCustomize({
  item,
  recipe,
  triggerClassName,
}: {
  item: any;
  recipe?: string;
  triggerClassName?: string;
}) {
  const { add } = useCart();
  const [open, setOpen] = useState(false);
  const [sauceId, setSauceId] = useState<string | null>(null);
  const [addonIds, setAddonIds] = useState<string[]>([]);

  // Reset selections each time the sheet opens.
  useEffect(() => {
    if (open) { setSauceId(null); setAddonIds([]); }
  }, [open]);

  // Add-ons (beverages / snacks) + sauce-role ingredients — only fetched when opened.
  const optionsQ = useQuery({
    queryKey: ["quick-customize-options"],
    enabled: open,
    queryFn: async () => {
      const [addons, sauces] = await Promise.all([
        supabase.from("menu_items").select("id,name,price_inr,kind,food_type")
          .eq("is_addon", true).eq("status", "active").eq("is_available", true).order("price_inr"),
        supabase.from("menu_items").select("id,name,price_inr,food_type")
          .eq("component_role", "sauce").eq("status", "active").eq("is_available", true).order("name"),
      ]);
      if (addons.error) throw addons.error;
      return { addons: (addons.data ?? []) as any[], sauces: (sauces.error ? [] : sauces.data ?? []) as any[] };
    },
  });

  const sauces = optionsQ.data?.sauces ?? [];
  const addons = optionsQ.data?.addons ?? [];
  const addonById = useMemo(() => {
    const m = new Map<string, any>();
    [...addons, ...sauces].forEach((a) => m.set(a.id, a));
    return m;
  }, [addons, sauces]);

  const isVeg = item.food_type === "veg" || item.food_type === "jain";
  const basePrice = Number(item.price_inr) || 0;
  const extras = [sauceId, ...addonIds].filter(Boolean) as string[];
  const extrasPrice = extras.reduce((s, id) => s + Number(addonById.get(id)?.price_inr || 0), 0);
  const total = basePrice + extrasPrice;

  const toggleAddon = (id: string) =>
    setAddonIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const addToCart = () => {
    const extraNames = extras.map((id) => addonById.get(id)?.name).filter(Boolean);
    const lineId = extras.length
      ? `${item.id}#${[...extras].sort().join(",")}`
      : item.id;
    add({
      id: lineId,
      name: item.name,
      price_inr: total,
      image_url: item.image_url ?? null,
      note: extraNames.length ? `+ ${extraNames.join(" · + ")}` : undefined,
    });
    setOpen(false);
    toast.success(`${item.name} added to your bowl`);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName ?? "mt-auto flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:shadow-md"}
      >
        <Plus className="h-4 w-4" /> Customise &amp; Add
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:max-w-md">
          {/* Image header */}
          <div className="relative">
            <MealImage path={item.image_url} alt={item.name} className="h-44 w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-background/80 text-foreground shadow backdrop-blur transition hover:bg-background"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="absolute bottom-3 left-4 right-4">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-white drop-shadow">
                <span className={isVeg ? "veg-dot shrink-0" : "nonveg-dot shrink-0"} aria-hidden />
                <span className="truncate">{item.name}</span>
              </h2>
            </div>
          </div>

          <div className="max-h-[calc(85vh-11rem-4.5rem)] space-y-5 overflow-y-auto p-4">
            {(recipe || item.description) && (
              <p className="text-sm leading-snug text-muted-foreground">{recipe || item.description}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {Number(item.calories) > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                  <Flame className="h-3 w-3 text-[var(--color-terracotta)]" /> {Number(item.calories)} kcal
                </span>
              )}
              {Number(item.protein_g) > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                  <Leaf className="h-3 w-3 text-primary" /> {Number(item.protein_g)}g protein
                </span>
              )}
            </div>

            {/* Choose your sauce — only when sauce-role ingredients exist */}
            {sauces.length > 0 && (
              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold">Choose your sauce</h3>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Pick one</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {sauces.map((s) => {
                    const on = sauceId === s.id;
                    const up = Number(s.price_inr) || 0;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSauceId(on ? null : s.id)}
                        className={`flex items-center justify-between gap-1 rounded-lg border px-3 py-2 text-left text-sm transition ${on ? "border-primary bg-primary/5 font-medium" : "hover:border-primary/50"}`}
                      >
                        <span className="truncate">{s.name}</span>
                        {on ? <Check className="h-4 w-4 shrink-0 text-primary" /> : up > 0 ? <span className="shrink-0 text-xs text-muted-foreground">+₹{up}</span> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add-ons */}
            {optionsQ.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-12 w-full rounded-lg" />)}
              </div>
            ) : addons.length > 0 ? (
              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold">Add-ons</h3>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Optional</span>
                </div>
                <div className="space-y-2">
                  {addons.map((a) => {
                    const on = addonIds.includes(a.id);
                    return (
                      <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{a.name}</div>
                          <div className="text-xs text-muted-foreground">+₹{Number(a.price_inr).toFixed(0)}</div>
                        </div>
                        <Button
                          size="sm"
                          variant={on ? "default" : "outline"}
                          className="h-8 shrink-0 rounded-full px-4"
                          onClick={() => toggleAddon(a.id)}
                        >
                          {on ? <><Check className="mr-1 h-3.5 w-3.5" /> Added</> : "Add"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          {/* Sticky action bar */}
          <div className="border-t bg-background p-3">
            <Button onClick={addToCart} size="lg" className="h-12 w-full rounded-full text-base">
              Add to cart · ₹{total.toFixed(0)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
