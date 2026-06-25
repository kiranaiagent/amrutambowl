import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { Check, Truck, PackageCheck, Calendar as CalendarIcon, MapPin, Phone, Clock, Filter } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: OrdersPage,
});

type ViewMode = "upcoming" | "board" | "today";

function fmtTimeAgo(iso?: string | null) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function OrdersPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<ViewMode>("upcoming");
  const [q, setQ] = useState("");

  const orders = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*), profiles!orders_user_id_fkey(name, phone, email)")
        .order("delivery_date", { ascending: true })
        .limit(500);
      if (error) throw error;
      return data as any[];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, any> }) => {
      const { error } = await supabase.from("orders").update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-orders"] }); toast.success("Updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const all = orders.data ?? [];
  const today = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim();
    return all.filter((o: any) => {
      if (!term) return true;
      return (
        o.delivery_pincode?.includes(term) ||
        o.delivery_address?.toLowerCase().includes(term) ||
        o.profiles?.name?.toLowerCase().includes(term) ||
        o.profiles?.phone?.toLowerCase().includes(term) ||
        o.profiles?.email?.toLowerCase().includes(term)
      );
    });
  }, [all, q]);

  const pendingAccept = filtered.filter((o: any) => o.status === "preparing" && !o.accepted_at);

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Orders Board</h1>
          <p className="text-muted-foreground">Accept incoming orders, move through prep → out → delivered, and track upcoming deliveries.</p>
        </div>
        <div className="inline-flex rounded-md border p-1 bg-card">
          {(["upcoming", "today", "board"] as ViewMode[]).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 text-sm rounded-md capitalize ${view === v ? "bg-primary text-primary-foreground" : ""}`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Filter className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by name, phone, pincode, address…"
            className="pl-7 w-80" />
        </div>
        {pendingAccept.length > 0 && (
          <Badge className="bg-amber-500 text-white">{pendingAccept.length} awaiting acceptance</Badge>
        )}
      </div>

      {view === "upcoming" && <UpcomingView orders={filtered} update={update.mutate} today={today} />}
      {view === "today" && <TodayView orders={filtered.filter((o: any) => o.delivery_date === today)} update={update.mutate} />}
      {view === "board" && <BoardView orders={filtered} update={update.mutate} />}
    </div>
  );
}

function OrderCard({ o, update }: { o: any; update: (a: { id: string; patch: Record<string, any> }) => void }) {
  return (
    <div className="rounded-md border p-3 text-sm bg-card">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <div className="font-medium">{o.delivery_date} · <span className="capitalize">{o.slot}</span>
            {o.preferred_time && <span className="text-muted-foreground"> @ {o.preferred_time}</span>}
          </div>
          <div className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5">
            <Phone className="h-3 w-3" />{o.profiles?.phone || "—"} · {o.profiles?.name || o.profiles?.email || "—"}
          </div>
          <div className="text-xs text-muted-foreground inline-flex items-start gap-1 mt-0.5">
            <MapPin className="h-3 w-3 mt-0.5" />{o.delivery_address} · {o.delivery_pincode}
          </div>
        </div>
        <Badge variant="outline" className="capitalize">{o.kind}</Badge>
      </div>
      <ul className="mt-2 text-xs space-y-0.5">
        {o.order_items?.map((it: any) => <li key={it.id}>• {it.qty}× {it.name}</li>)}
      </ul>

      {/* Status timeline */}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Check className="h-3 w-3" /> Placed {fmtTimeAgo(o.created_at)}</span>
        {o.accepted_at && <span className="inline-flex items-center gap-1 text-primary"><Check className="h-3 w-3" /> Accepted {fmtTimeAgo(o.accepted_at)}</span>}
        {o.out_for_delivery_at && <span className="inline-flex items-center gap-1"><Truck className="h-3 w-3" /> Out {fmtTimeAgo(o.out_for_delivery_at)}</span>}
        {o.delivered_at && <span className="inline-flex items-center gap-1 text-primary"><PackageCheck className="h-3 w-3" /> Delivered {fmtTimeAgo(o.delivered_at)}</span>}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
        <span className="font-semibold">₹{Number(o.total_inr).toFixed(0)}</span>
        <div className="flex gap-1 flex-wrap">
          {!o.accepted_at && o.status === "preparing" && (
            <Button size="sm" variant="default" onClick={() => update({ id: o.id, patch: { accepted_at: new Date().toISOString() } })}>
              <Check className="h-3 w-3 mr-1" /> Accept
            </Button>
          )}
          {o.status === "preparing" && o.accepted_at && (
            <Button size="sm" onClick={() => update({ id: o.id, patch: { status: "out_for_delivery" } })}>
              <Truck className="h-3 w-3 mr-1" /> Out for delivery
            </Button>
          )}
          {o.status === "out_for_delivery" && (
            <Button size="sm" onClick={() => update({ id: o.id, patch: { status: "delivered" } })}>
              <PackageCheck className="h-3 w-3 mr-1" /> Mark delivered
            </Button>
          )}
          {o.status !== "delivered" && o.status !== "skipped" && (
            <Button size="sm" variant="ghost" onClick={() => update({ id: o.id, patch: { status: "skipped" } })}>Skip</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function UpcomingView({ orders, update, today }: { orders: any[]; update: any; today: string }) {
  const upcoming = orders.filter((o) => o.delivery_date >= today && o.status !== "delivered" && o.status !== "skipped");
  const byDate = new Map<string, any[]>();
  upcoming.forEach((o) => { const a = byDate.get(o.delivery_date) ?? []; a.push(o); byDate.set(o.delivery_date, a); });
  const dates = [...byDate.keys()].sort();

  if (dates.length === 0) return <Card className="mt-6 p-8 text-center text-muted-foreground">No upcoming deliveries.</Card>;

  return (
    <div className="mt-6 space-y-5">
      {dates.map((d) => {
        const dayOrders = byDate.get(d)!;
        const isToday = d === today;
        return (
          <Card key={d} className={`p-4 ${isToday ? "border-primary" : ""}`}>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                <div className="font-display text-xl font-bold">
                  {d} {isToday && <span className="text-xs text-primary">(Today)</span>}
                </div>
              </div>
              <Badge variant="secondary">{dayOrders.length} order(s)</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {dayOrders.map((o) => <OrderCard key={o.id} o={o} update={update} />)}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function TodayView({ orders, update }: { orders: any[]; update: any }) {
  if (orders.length === 0) return <Card className="mt-6 p-8 text-center text-muted-foreground">Nothing scheduled today.</Card>;
  const bySlot = new Map<string, any[]>();
  orders.forEach((o) => { const a = bySlot.get(o.slot) ?? []; a.push(o); bySlot.set(o.slot, a); });
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-3">
      {["breakfast", "lunch", "dinner"].map((s) => {
        const list = bySlot.get(s) ?? [];
        return (
          <Card key={s} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-display text-lg font-bold capitalize flex items-center gap-2"><Clock className="h-4 w-4" />{s}</div>
              <Badge variant="secondary">{list.length}</Badge>
            </div>
            <div className="space-y-3">
              {list.length === 0 && <div className="text-xs text-muted-foreground">No orders</div>}
              {list.map((o) => <OrderCard key={o.id} o={o} update={update} />)}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function BoardView({ orders, update }: { orders: any[]; update: any }) {
  const cols = [
    { k: "preparing", label: "Preparing" },
    { k: "out_for_delivery", label: "Out for delivery" },
    { k: "delivered", label: "Delivered" },
  ];
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-3">
      {cols.map((c) => {
        const rows = orders.filter((o) => o.status === c.k).slice(0, 50);
        return (
          <Card key={c.k} className="p-4 min-h-64">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">{c.label}</div>
              <Badge variant="secondary">{rows.length}</Badge>
            </div>
            <div className="space-y-3">
              {rows.map((o) => <OrderCard key={o.id} o={o} update={update} />)}
              {rows.length === 0 && <div className="text-xs text-muted-foreground">No orders.</div>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
