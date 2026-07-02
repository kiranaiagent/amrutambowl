import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { MealImage } from "@/components/MealImage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Salad, Plus, ArrowRight, Tag, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/cart")({
  component: CartPage,
});

function CartPage() {
  const { lines, setQty, remove, total, count, clear, add } = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const gst = total * 0.05;
  const grand = total + gst;

  // Upsells — beverages / snacks flagged is_addon
  const upsellsQ = useQuery({
    queryKey: ["cart-upsells"],
    enabled: lines.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("menu_items")
        .select("id,name,price_inr,image_url,food_type,kind")
        .eq("is_addon", true).eq("status", "active").eq("is_available", true)
        .order("price_inr").limit(6);
      if (error) throw error;
      return data as any[];
    },
  });

  const lineIds = new Set(lines.map((l) => l.id));
  const suggestions = (upsellsQ.data ?? []).filter((u) => !lineIds.has(u.id));

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="font-display text-3xl font-bold">Your Bowl</h1>
        <p className="text-sm text-muted-foreground">{count} item{count !== 1 ? "s" : ""} · review, tweak, and checkout.</p>

        {lines.length === 0 ? (
          <Card className="mt-6 p-10 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <p className="mt-3 font-medium">Your bowl is empty</p>
            <p className="mt-1 text-sm text-muted-foreground">Browse our menu or pick a plan to get started.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Link to="/bowl"><Button><Salad className="h-4 w-4 mr-1.5" /> Browse Menu</Button></Link>
              <Link to="/plans"><Button variant="outline">Explore Plans</Button></Link>
            </div>
          </Card>
        ) : (
          <>
            <Card className="mt-6 p-5">
              <div className="space-y-3">
                {lines.map((l) => (
                  <div key={l.id} className="flex items-center gap-3 border-b last:border-0 pb-3 last:pb-0">
                    <MealImage path={l.image_url} alt={l.name} className="h-14 w-14 rounded-md object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{l.name}</div>
                      {l.note && <div className="text-[11px] text-primary/80 truncate">{l.note}</div>}
                      <div className="text-xs text-muted-foreground">₹{Number(l.price_inr).toFixed(0)} each</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setQty(l.id, l.qty - 1)} className="h-7 w-7 rounded border" aria-label="Decrease">−</button>
                      <span className="w-6 text-center">{l.qty}</span>
                      <button onClick={() => setQty(l.id, l.qty + 1)} className="h-7 w-7 rounded border" aria-label="Increase">+</button>
                    </div>
                    <div className="w-16 text-right font-semibold">₹{(l.price_inr * l.qty).toFixed(0)}</div>
                    <button onClick={() => remove(l.id)} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal ({count} items)</span><span>₹{total.toFixed(0)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">GST (5%)</span><span>₹{gst.toFixed(0)}</span></div>
                <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2"><span>Total</span><span>₹{grand.toFixed(0)}</span></div>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-md bg-primary/5 px-3 py-2 text-xs text-primary">
                <Tag className="h-3.5 w-3.5" /> Have a promo code? Apply it at checkout — try <span className="font-mono font-bold">WELCOME10</span>.
              </div>
              <div className="mt-5 flex flex-wrap gap-2 justify-end">
                <Button variant="ghost" onClick={clear}>Clear</Button>
                <Link to="/bowl"><Button variant="outline">Add more</Button></Link>
                <Button onClick={() => {
                  if (!user) nav({ to: "/auth", search: { redirect: "/checkout" } as any });
                  else nav({ to: "/checkout" });
                }}>
                  Checkout <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </Card>

            {/* Make it a meal — upsells */}
            {suggestions.length > 0 && (
              <Card className="mt-5 p-5">
                <div className="flex items-baseline justify-between">
                  <div>
                    <h2 className="font-display text-xl font-semibold">Make it a meal</h2>
                    <p className="text-xs text-muted-foreground">Add a beverage or snack — one tap, straight to your cart.</p>
                  </div>
                  <Link to="/bowl" className="text-xs font-medium text-primary hover:underline">See full menu</Link>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {suggestions.slice(0, 4).map((u) => (
                    <div key={u.id} className="flex items-center gap-3 rounded-lg border p-2">
                      <MealImage path={u.image_url} alt={u.name} className="h-12 w-12 rounded object-cover" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{u.name}</div>
                        <div className="text-xs text-muted-foreground">₹{Number(u.price_inr).toFixed(0)}</div>
                      </div>
                      <Button size="sm" variant="outline" className="h-8 rounded-full"
                        onClick={() => {
                          add({ id: u.id, name: u.name, price_inr: Number(u.price_inr), image_url: u.image_url ?? null });
                          toast.success(`${u.name} added`);
                        }}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
