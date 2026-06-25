import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MealImage } from "@/components/MealImage";
import { CheckCircle2, Calendar, MapPin, Clock } from "lucide-react";

export const Route = createFileRoute("/order-confirmation/$id")({
  component: ConfirmationPage,
  errorComponent: ({ error }) => <div className="p-8">Couldn't load order: {error.message}</div>,
});

function ConfirmationPage() {
  const { id } = Route.useParams();
  const orderQ = useQuery({
    queryKey: ["order-confirm", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*), subscriptions(*, plans(name))")
        .eq("id", id).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const subOrdersQ = useQuery({
    queryKey: ["confirm-sub-orders", orderQ.data?.subscription_id],
    enabled: !!orderQ.data?.subscription_id,
    queryFn: async () => {
      const { data, error } = await supabase.from("orders")
        .select("id,delivery_date,slot,status,total_inr")
        .eq("subscription_id", orderQ.data.subscription_id)
        .order("delivery_date");
      if (error) throw error;
      return data as any[];
    },
  });

  const o = orderQ.data;
  const sub = o?.subscriptions;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <Card className="p-6 text-center bg-gradient-to-br from-primary/5 to-background">
          <CheckCircle2 className="h-14 w-14 text-primary mx-auto" />
          <h1 className="mt-3 font-display text-3xl font-bold">Order placed!</h1>
          <p className="text-muted-foreground mt-1">
            {sub ? "Your subscription is live. We've notified the kitchen." : "Thanks — we'll start prepping your bowl."}
          </p>
        </Card>

        {o && (
          <Card className="mt-5 p-5 space-y-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Order #</div>
              <div className="font-mono text-sm">{o.id.slice(0, 8)}</div>
            </div>

            {sub && (
              <div className="rounded-md border p-3">
                <div className="font-semibold">{sub.plans?.name ?? "Custom Bowl Subscription"}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {sub.source === "bowl" ? "Build-a-Bowl" : "Plan"} · {sub.meals_per_day} meals/day · {sub.days_per_week} days/week
                </div>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2"><Calendar className="h-4 w-4 mt-0.5 text-primary" />
                <div>
                  <div className="text-muted-foreground text-xs">Next delivery</div>
                  <div className="font-medium">{o.delivery_date} · <span className="capitalize">{o.slot}</span></div>
                </div>
              </div>
              {o.preferred_time && (
                <div className="flex items-start gap-2"><Clock className="h-4 w-4 mt-0.5 text-primary" />
                  <div>
                    <div className="text-muted-foreground text-xs">Preferred time</div>
                    <div className="font-medium">{o.preferred_time}</div>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2 sm:col-span-2"><MapPin className="h-4 w-4 mt-0.5 text-primary" />
                <div>
                  <div className="text-muted-foreground text-xs">Delivery to</div>
                  <div className="font-medium">{o.delivery_address}</div>
                  <div className="text-xs text-muted-foreground">PIN {o.delivery_pincode}</div>
                </div>
              </div>
            </div>

            {(o.order_items?.length ?? 0) > 0 && (
              <div>
                <div className="font-semibold mb-2">Items in next delivery</div>
                <ul className="space-y-1 text-sm">
                  {o.order_items.map((it: any) => (
                    <li key={it.id} className="flex justify-between"><span>{it.qty} × {it.name}</span><span className="text-muted-foreground">₹{Number(it.price_inr * it.qty).toFixed(0)}</span></li>
                  ))}
                </ul>
              </div>
            )}

            {sub && (subOrdersQ.data?.length ?? 0) > 1 && (
              <div>
                <div className="font-semibold mb-2">All scheduled deliveries ({subOrdersQ.data?.length})</div>
                <div className="max-h-60 overflow-y-auto border rounded-md">
                  <table className="w-full text-sm">
                    <tbody>
                      {subOrdersQ.data?.map((od: any) => (
                        <tr key={od.id} className="border-b last:border-0">
                          <td className="p-2">{od.delivery_date}</td>
                          <td className="p-2 capitalize text-muted-foreground">{od.slot}</td>
                          <td className="p-2 text-right">
                            <Badge variant="outline" className="capitalize text-[10px]">{od.status?.replaceAll("_", " ")}</Badge>
                          </td>
                          <td className="p-2 text-right font-medium">₹{Number(od.total_inr).toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="border-t pt-3 flex justify-between font-bold">
              <span>Total (this delivery)</span><span>₹{Number(o.total_inr).toFixed(0)}</span>
            </div>

            <div className="flex gap-2 flex-wrap pt-2">
              <Link to="/my-subscription"><Button>Track my orders</Button></Link>
              <Link to="/plans"><Button variant="outline">Browse more plans</Button></Link>
            </div>
            <p className="text-xs text-muted-foreground">
              Our team will accept your order shortly. You'll see live status updates on the My Orders page.
            </p>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
