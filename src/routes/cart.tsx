import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { MealImage } from "@/components/MealImage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/cart")({
  component: CartPage,
});

function CartPage() {
  const { lines, setQty, remove, total, count, clear } = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const gst = total * 0.05;
  const grand = total + gst;
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="font-display text-3xl font-bold">Your Bowl</h1>
        {lines.length === 0 ? (
          <Card className="mt-6 p-8 text-center">
            <p className="text-muted-foreground">Nothing in your bowl yet.</p>
            <Link to="/bowl"><Button className="mt-4">Build a Bowl</Button></Link>
          </Card>
        ) : (
          <Card className="mt-6 p-5">
            <div className="space-y-3">
              {lines.map((l) => (
                <div key={l.id} className="flex items-center gap-3 border-b last:border-0 pb-3 last:pb-0">
                  <MealImage path={l.image_url} alt={l.name} className="h-14 w-14 rounded-md object-cover" />
                  <div className="flex-1">
                    <div className="font-medium">{l.name}</div>
                    <div className="text-xs text-muted-foreground">₹{Number(l.price_inr).toFixed(0)} each</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setQty(l.id, l.qty - 1)} className="h-7 w-7 rounded border">−</button>
                    <span className="w-6 text-center">{l.qty}</span>
                    <button onClick={() => setQty(l.id, l.qty + 1)} className="h-7 w-7 rounded border">+</button>
                  </div>
                  <div className="w-16 text-right font-semibold">₹{(l.price_inr * l.qty).toFixed(0)}</div>
                  <button onClick={() => remove(l.id)} className="text-muted-foreground hover:text-destructive">
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
            <div className="mt-5 flex flex-wrap gap-2 justify-end">
              <Button variant="ghost" onClick={clear}>Clear</Button>
              <Link to="/bowl"><Button variant="outline">Add more</Button></Link>
              <Button onClick={() => {
                if (!user) nav({ to: "/auth", search: { redirect: "/checkout" } as any });
                else nav({ to: "/checkout" });
              }}>Checkout</Button>
            </div>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
