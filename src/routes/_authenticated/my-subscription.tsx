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
import { ChevronDown, ChevronRight, Calendar, Truck, PackageCheck, Check, Clock, MapPin, ChefHat } from "lucide-react";

export const Route = createFileRoute("/_authenticated/my-subscription")({
  component: MyPage,
});

const STATUS_LABEL: Record<string, string> = {
  preparing: "Preparing", out_for_delivery: "Out for delivery", delivered: "Delivered", skipped: "Skipped",
};

function MyPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => setExpanded((cur) => {
    const next = new Set(cur);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const subsQ = useQuery({
    queryKey: ["my-subs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, plans(name, goal_type)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const ordersQ = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("user_id", user!.id)
        .order("delivery_date", { ascending: true })
        .limit(200);
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-orders"] }); toast.success("Added"); },
    onError: (e: any) => toast.error(e.message),
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="font-display text-3xl font-bold">My Orders & Subscriptions</h1>

        <section className="mt-6">
          <h2 className="font-display text-xl font-bold mb-3">Subscriptions</h2>
          {subsQ.isLoading && <p className="text-muted-foreground">Loading…</p>}
          {(subsQ.data ?? []).length === 0 && !subsQ.isLoading && (
            <Card className="p-6 text-center text-muted-foreground">
              No active subscriptions. <Link to="/plans" className="text-primary underline">Browse plans</Link> or <Link to="/bowl" className="inline-flex items-center gap-1 align-bottom text-primary underline"><ChefHat className="h-4 w-4" /> Build My Own Bowl</Link>.
            </Card>
          )}

          <div className="space-y-2">
            {subsQ.data?.map((s: any) => {
              const subOrders = (ordersQ.data ?? []).filter((o: any) => o.subscription_id === s.id);
              const next = subOrders.find((o: any) => o.delivery_date >= today && o.status !== "delivered" && o.status !== "skipped");
              const upcoming = subOrders.filter((o: any) => o.delivery_date >= today && o.status !== "delivered" && o.status !== "skipped").length;
              const completed = subOrders.filter((o: any) => o.status === "delivered").length;
              const total = subOrders.length;
              const pct = total ? Math.round((completed / total) * 100) : 0;
              const isOpen = expanded.has(s.id);
              return (
                <Card key={s.id} className="overflow-hidden">
                  {/* Header row */}
                  <button onClick={() => toggle(s.id)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-secondary/40 text-left">
                    {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate">
                          {s.plans?.name ?? (s.source === "bowl" ? "Custom Bowl" : "Subscription")}
                        </span>
                        <Badge variant={s.status === "active" ? "default" : "secondary"} className="capitalize text-[10px]">{s.status}</Badge>
                        {s.source === "bowl" && <Badge variant="outline" className="text-[10px]">build-a-bowl</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3">
                        <span>{s.meals_per_day}/day · {s.days_per_week} d/wk</span>
                        <span>· <strong className="text-foreground">{completed} of {total}</strong> delivered · {upcoming} upcoming</span>
                      </div>
                      {total > 0 && (
                        <div className="mt-1.5 h-1.5 rounded-full bg-secondary overflow-hidden max-w-md">
                          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </div>
                    {next && (
                      <div className="hidden sm:block text-right">
                        <div className="text-[10px] uppercase tracking-wide text-primary font-semibold">Next delivery</div>
                        <div className="text-sm font-medium">{next.delivery_date} <span className="capitalize text-muted-foreground">· {next.slot}</span></div>
                      </div>
                    )}
                  </button>


                  {/* Expanded body */}
                  {isOpen && (
                    <div className="border-t bg-secondary/20 p-4 space-y-3">
                      <div className="grid sm:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 text-primary" />
                          <div>
                            <div className="text-xs text-muted-foreground">Delivers to</div>
                            <div>{s.delivery_address}</div>
                            <div className="text-xs text-muted-foreground">PIN {s.delivery_pincode}</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2"><Clock className="h-4 w-4 mt-0.5 text-primary" />
                          <div>
                            <div className="text-xs text-muted-foreground">Slot · Time</div>
                            <div className="capitalize">{s.delivery_slot} {s.preferred_time && `· ${s.preferred_time}`}</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2"><Calendar className="h-4 w-4 mt-0.5 text-primary" />
                          <div>
                            <div className="text-xs text-muted-foreground">Period</div>
                            <div>{s.start_date}{s.end_date ? ` → ${s.end_date}` : ""}</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {s.status === "active" && <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: s.id, status: "paused" })}>Pause</Button>}
                        {s.status === "paused" && <Button size="sm" onClick={() => setStatus.mutate({ id: s.id, status: "active" })}>Resume</Button>}
                        {s.status !== "cancelled" && (
                          <Button size="sm" variant="destructive"
                            onClick={() => confirm("Cancel subscription?") && setStatus.mutate({ id: s.id, status: "cancelled" })}>
                            Cancel
                          </Button>
                        )}
                      </div>

                      {/* Deliveries timeline */}
                      <div>
                        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">All deliveries ({subOrders.length})</div>
                        {subOrders.length === 0 && <p className="text-xs text-muted-foreground">No orders linked yet.</p>}
                        <div className="space-y-1.5">
                          {subOrders.map((o: any) => {
                            const isNext = next?.id === o.id;
                            return (
                              <div key={o.id}
                                className={`rounded border bg-card p-2.5 text-sm ${isNext ? "border-primary ring-1 ring-primary" : ""}`}>
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-2">
                                    {isNext && <Badge className="bg-primary text-primary-foreground text-[10px]">Next</Badge>}
                                    <span className="font-medium">{o.delivery_date}</span>
                                    <span className="capitalize text-muted-foreground">· {o.slot}</span>
                                    {o.preferred_time && <span className="text-muted-foreground text-xs">@ {o.preferred_time}</span>}
                                  </div>
                                  <DeliveryStatusPill o={o} />
                                </div>

                                {/* Mini timeline */}
                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                                  <span className="inline-flex items-center gap-1"><Check className="h-2.5 w-2.5" /> Placed</span>
                                  {o.accepted_at && <span className="inline-flex items-center gap-1 text-primary"><Check className="h-2.5 w-2.5" /> Accepted</span>}
                                  {o.out_for_delivery_at && <span className="inline-flex items-center gap-1"><Truck className="h-2.5 w-2.5" /> Out</span>}
                                  {o.delivered_at && <span className="inline-flex items-center gap-1 text-primary"><PackageCheck className="h-2.5 w-2.5" /> Delivered</span>}
                                </div>

                                <ul className="mt-1.5 text-xs space-y-0.5">
                                  {o.order_items?.map((it: any) => (
                                    <li key={it.id}>• {it.qty}× {it.name}</li>
                                  ))}
                                </ul>

                                {o.status === "preparing" && (
                                  <div className="mt-1.5 flex gap-2 flex-wrap">
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button size="sm" variant="outline" className="h-7 text-xs">Add extra</Button>
                                      </DialogTrigger>
                                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                        <DialogHeader><DialogTitle>Add item · {o.delivery_date}</DialogTitle></DialogHeader>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                          {menuQ.data?.map((m: any) => (
                                            <div key={m.id} className="flex items-center gap-2 rounded border p-2">
                                              <MealImage path={m.image_url} alt={m.name} className="h-12 w-12 rounded object-cover" />
                                              <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium truncate">{m.name}</div>
                                                <div className="text-xs text-muted-foreground">₹{Number(m.price_inr).toFixed(0)}</div>
                                              </div>
                                              <Button size="sm" onClick={() => addItem.mutate({ orderId: o.id, item: m })}>Add</Button>
                                            </div>
                                          ))}
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                    <Button size="sm" variant="ghost" className="h-7 text-xs"
                                      onClick={() => confirm("Skip this delivery?") && skipOrder.mutate(o.id)}>Skip</Button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold mb-3">Recent one-off orders</h2>
          {(() => {
            const oneOff = (ordersQ.data ?? []).filter((o: any) => !o.subscription_id);
            if (oneOff.length === 0) return <p className="text-sm text-muted-foreground">No one-off orders yet.</p>;
            return (
              <div className="space-y-2">
                {oneOff.map((o: any) => (
                  <Card key={o.id} className="p-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <div className="font-medium">{o.delivery_date} · <span className="capitalize">{o.slot}</span></div>
                        <div className="text-xs text-muted-foreground">{o.order_items?.length ?? 0} item(s) · ₹{Number(o.total_inr).toFixed(0)}</div>
                      </div>
                      <DeliveryStatusPill o={o} />
                    </div>
                  </Card>
                ))}
              </div>
            );
          })()}
        </section>
      </main>
      <Footer />
    </div>
  );
}

function DeliveryStatusPill({ o }: { o: any }) {
  const variant: any = o.status === "delivered" ? "default" : o.status === "skipped" ? "secondary" : "outline";
  return <Badge variant={variant} className="capitalize text-[10px]">{STATUS_LABEL[o.status] ?? o.status}</Badge>;
}
