import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Phone, MapPin, UtensilsCrossed } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/subscriptions")({
  component: SubscriptionsPage,
});

function formatMoney(value: unknown) {
  return `₹${Number(value ?? 0).toFixed(0)}`;
}

function SubscriptionsPage() {
  const dataQ = useQuery({
    queryKey: ["admin-subscriptions-details"],
    queryFn: async () => {
      const [subsRes, profilesRes, ordersRes] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("*, plans(name, goal_type, price_inr)")
          .order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, name, email, phone, pincode"),
        supabase
          .from("orders")
          .select("*, order_items(*)")
          .order("delivery_date", { ascending: false })
          .limit(500),
      ]);

      if (subsRes.error) throw subsRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (ordersRes.error) throw ordersRes.error;

      return {
        subscriptions: subsRes.data ?? [],
        profiles: profilesRes.data ?? [],
        orders: ordersRes.data ?? [],
      };
    },
  });

  const profilesById = new Map((dataQ.data?.profiles ?? []).map((p: any) => [p.id, p]));
  const ordersBySubscription = new Map<string, any[]>();
  (dataQ.data?.orders ?? []).forEach((order: any) => {
    if (!order.subscription_id) return;
    const list = ordersBySubscription.get(order.subscription_id) ?? [];
    list.push(order);
    ordersBySubscription.set(order.subscription_id, list);
  });

  return (
    <div className="p-6 md:p-8">
      <h1 className="font-display text-3xl font-bold">Subscriptions</h1>
      <p className="text-muted-foreground">View each subscription with customer contact, dates, food, and order details.</p>

      {dataQ.isLoading && <p className="mt-6 text-muted-foreground">Loading…</p>}

      {!dataQ.isLoading && (dataQ.data?.subscriptions ?? []).length === 0 && (
        <Card className="mt-6 p-6 text-center text-muted-foreground">No subscriptions yet.</Card>
      )}

      <div className="mt-6 space-y-4">
        {dataQ.data?.subscriptions.map((sub: any) => {
          const profile = profilesById.get(sub.user_id) as any;
          const orders = ordersBySubscription.get(sub.id) ?? [];
          return (
            <Card key={sub.id} className="p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-xl font-semibold">{sub.plans?.name ?? "Subscription plan"}</h2>
                    <Badge className="capitalize" variant={sub.status === "active" ? "default" : "secondary"}>{sub.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground capitalize">
                    {sub.plans?.goal_type?.replace("-", " ") ?? "Plan"} · {sub.meals_per_day} meals/day · {sub.days_per_week} days/week · {formatMoney(sub.plans?.price_inr)}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <div className="font-medium">{profile?.name || profile?.email || "Customer"}</div>
                  <div className="text-muted-foreground">{profile?.email || "No email"}</div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                <div className="rounded-md border p-3">
                  <div className="flex items-center gap-2 text-muted-foreground"><CalendarDays className="h-4 w-4" /> Dates</div>
                  <div className="mt-1 font-medium">Start: {sub.start_date}</div>
                  <div className="text-muted-foreground">End: {sub.end_date ?? "—"}</div>
                  <div className="text-muted-foreground">Next billing: {sub.next_billing_date ?? "—"}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" /> Contact</div>
                  <div className="mt-1 font-medium">{profile?.phone || "No phone"}</div>
                  <div className="text-muted-foreground">Customer pincode: {profile?.pincode || "—"}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" /> Delivery</div>
                  <div className="mt-1 font-medium capitalize">{sub.delivery_slot ?? "—"}</div>
                  <div className="text-muted-foreground">{sub.delivery_address || "No address"}</div>
                  <div className="text-muted-foreground">{sub.delivery_pincode || "—"}</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center gap-2 font-semibold"><UtensilsCrossed className="h-4 w-4" /> Orders ({orders.length})</div>
                {orders.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No linked orders yet.</p>
                ) : (
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {orders.map((order: any) => (
                      <div key={order.id} className="rounded-md border p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium">{order.delivery_date} · <span className="capitalize">{order.slot}</span></div>
                          <Badge variant="outline" className="capitalize">{order.status?.replaceAll("_", " ")}</Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{order.kind} · {formatMoney(order.total_inr)}</div>
                        <ul className="mt-2 space-y-1 text-xs">
                          {(order.order_items ?? []).map((item: any) => (
                            <li key={item.id} className="flex justify-between gap-2">
                              <span>{item.qty} × {item.name}</span>
                              <span className="text-muted-foreground">{formatMoney(Number(item.price_inr) * Number(item.qty))}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}