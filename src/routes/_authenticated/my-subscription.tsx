import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useState } from "react";
import { MealImage } from "@/components/MealImage";

export const Route = createFileRoute("/_authenticated/my-subscription")({
  component: MyPage,
});

const STATUS_LABEL: Record<string, string> = {
  preparing: "Preparing", out_for_delivery: "Out for delivery", delivered: "Delivered", skipped: "Skipped",
};

function MyPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [swapOrder, setSwapOrder] = useState<any>(null);

  const subsQ = useQuery({
    queryKey: ["my-subs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("subscriptions").select("*, plans(name, goal_type)").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const ordersQ = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*, order_items(*)").eq("user_id", user!.id).order("delivery_date", { ascending: false }).limit(40);
      if (error) throw error;
      return data as any[];
    },
  });

  const menuQ = useQuery({
    queryKey: ["menu-public"],
    queryFn: async () => {
      const { data, error } = await supabase.from("menu_items").select("*").eq("status", "active").order("name");
      if (error) throw error;
      return data as any[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "paused" | "cancelled" }) => {
      const { error } = await supabase.from("subscriptions").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-subs"] }); toast.success("Updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const skipOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orders").update({ status: "skipped" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-orders"] }); toast.success("Order skipped"); },
    onError: (e: any) => toast.error(e.message),
  });

  const addItem = useMutation({
    mutationFn: async ({ orderId, item }: { orderId: string; item: any }) => {
      const { error } = await supabase.from("order_items").insert({
        order_id: orderId, menu_item_id: item.id, name: item.name, price_inr: item.price_inr, qty: 1,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-orders"] }); toast.success("Added to order"); },
    onError: (e: any) => toast.error(e.message),
  });
  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("order_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-orders"] }); toast.success("Removed"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="font-display text-3xl font-bold">My Orders & Subscriptions</h1>

        <section className="mt-6">
          <h2 className="font-display text-xl font-bold">Subscriptions</h2>
          {subsQ.isLoading && <p className="text-muted-foreground mt-2">Loading…</p>}
          {(subsQ.data ?? []).length === 0 && !subsQ.isLoading && (
            <Card className="p-6 text-center text-muted-foreground mt-3">
              No active subscriptions. <Link to="/plans" className="text-primary underline">Browse plans</Link>.
            </Card>
          )}
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {subsQ.data?.map((s: any) => {
              const subOrders = (ordersQ.data ?? []).filter((o: any) => o.subscription_id === s.id);
              const upcoming = subOrders.filter((o: any) => o.status === "preparing" || o.status === "out_for_delivery");
              return (
              <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{s.plans?.name ?? "Plan"}</div>
                    <div className="text-xs text-muted-foreground capitalize">{s.plans?.goal_type?.replace("-", " ")} · {s.meals_per_day}/day · {s.days_per_week} days/wk</div>
                  </div>
                  <Badge className="capitalize" variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{s.delivery_address}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Starts {s.start_date} {s.end_date ? `· ends ${s.end_date}` : ""} · {upcoming.length} upcoming
                </div>
                <div className="mt-3 flex gap-2 flex-wrap">
                  <Dialog>
                    <DialogTrigger asChild><Button size="sm" variant="secondary">View details</Button></DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader><DialogTitle>{s.plans?.name ?? "Subscription"} details</DialogTitle></DialogHeader>
                      <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-3">
                          <div><div className="text-xs text-muted-foreground">Status</div><div className="font-medium capitalize">{s.status}</div></div>
                          <div><div className="text-xs text-muted-foreground">Meals / day</div><div className="font-medium">{s.meals_per_day}</div></div>
                          <div><div className="text-xs text-muted-foreground">Days / week</div><div className="font-medium">{s.days_per_week}</div></div>
                          <div><div className="text-xs text-muted-foreground">Slot</div><div className="font-medium capitalize">{s.slot ?? "—"}</div></div>
                          <div><div className="text-xs text-muted-foreground">Start date</div><div className="font-medium">{s.start_date}</div></div>
                          <div><div className="text-xs text-muted-foreground">End date</div><div className="font-medium">{s.end_date ?? "—"}</div></div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Delivery address</div>
                          <div className="font-medium">{s.delivery_address}</div>
                          <div className="text-xs text-muted-foreground mt-1">Pincode {s.pincode ?? "—"} · Contact {s.contact_phone ?? user?.phone ?? "—"}</div>
                        </div>
                        <div>
                          <div className="font-display text-base font-semibold mt-2">Orders ({subOrders.length})</div>
                          {subOrders.length === 0 && <p className="text-muted-foreground text-xs mt-1">No orders linked yet.</p>}
                          <div className="mt-2 space-y-2">
                            {subOrders.map((o: any) => (
                              <div key={o.id} className="rounded border p-2">
                                <div className="flex justify-between items-center">
                                  <div className="text-sm font-medium">{o.delivery_date} · <span className="capitalize">{o.slot}</span></div>
                                  <Badge variant={o.status === "delivered" ? "default" : o.status === "skipped" ? "secondary" : "outline"}>{STATUS_LABEL[o.status] ?? o.status}</Badge>
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">₹{Number(o.total_inr).toFixed(0)}</div>
                                <ul className="mt-1 text-xs space-y-0.5">
                                  {o.order_items?.map((it: any) => (
                                    <li key={it.id}>{it.qty} × {it.name}</li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  {s.status === "active" && <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: s.id, status: "paused" })}>Pause</Button>}
                  {s.status === "paused" && <Button size="sm" onClick={() => setStatus.mutate({ id: s.id, status: "active" })}>Resume</Button>}
                  {s.status !== "cancelled" && <Button size="sm" variant="destructive" onClick={() => confirm("Cancel subscription?") && setStatus.mutate({ id: s.id, status: "cancelled" })}>Cancel</Button>}
                </div>
              </Card>
            );})}
          </div>
        </section>


        <section className="mt-10">
          <h2 className="font-display text-xl font-bold">Upcoming & Recent Orders</h2>
          {(ordersQ.data ?? []).length === 0 && !ordersQ.isLoading && (
            <Card className="p-6 text-center text-muted-foreground mt-3">No orders yet.</Card>
          )}
          <div className="mt-3 space-y-3">
            {ordersQ.data?.map((o: any) => (
              <Card key={o.id} className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-semibold">{o.delivery_date} · <span className="capitalize">{o.slot}</span></div>
                    <div className="text-xs text-muted-foreground">{o.kind === "bowl" ? "Build Your Bowl" : "Subscription meal"} · ₹{Number(o.total_inr).toFixed(0)}</div>
                  </div>
                  <Badge variant={o.status === "delivered" ? "default" : o.status === "skipped" ? "secondary" : "outline"}>{STATUS_LABEL[o.status] ?? o.status}</Badge>
                </div>
                <div className="mt-3 space-y-1 text-sm">
                  {o.order_items?.map((it: any) => (
                    <div key={it.id} className="flex items-center justify-between gap-2">
                      <div>{it.qty} × {it.name}</div>
                      <div className="flex items-center gap-2">
                        <div className="text-muted-foreground text-xs">₹{(Number(it.price_inr) * it.qty).toFixed(0)}</div>
                        {o.status === "preparing" && (
                          <button onClick={() => removeItem.mutate(it.id)} className="text-xs text-destructive">Remove</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {o.status === "preparing" && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <Dialog>
                      <DialogTrigger asChild><Button size="sm" variant="outline" onClick={() => setSwapOrder(o)}>Add items</Button></DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>Add items to order · {o.delivery_date}</DialogTitle></DialogHeader>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {menuQ.data?.map((m: any) => (
                            <div key={m.id} className="flex items-center gap-2 rounded border p-2">
                              <MealImage path={m.image_url} alt={m.name} className="h-12 w-12 rounded object-cover" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{m.name}</div>
                                <div className="text-xs text-muted-foreground">₹{Number(m.price_inr).toFixed(0)} · {m.calories} kcal</div>
                              </div>
                              <Button size="sm" onClick={() => addItem.mutate({ orderId: o.id, item: m })}>Add</Button>
                            </div>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button size="sm" variant="ghost" onClick={() => confirm("Skip this delivery?") && skipOrder.mutate(o.id)}>Skip</Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
