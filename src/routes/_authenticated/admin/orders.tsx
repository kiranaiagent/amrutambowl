import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: OrdersPage,
});

const STATUS_FLOW: Record<string, { next?: string; label: string }> = {
  preparing: { next: "out_for_delivery", label: "Mark Out for Delivery" },
  out_for_delivery: { next: "delivered", label: "Mark Delivered" },
  delivered: { label: "Delivered" },
  skipped: { label: "Skipped" },
};

function OrdersPage() {
  const qc = useQueryClient();
  const orders = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*), profiles!orders_user_id_fkey(name, phone, email)")
        .order("delivery_date", { ascending: true })
        .limit(300);
      if (error) throw error;
      return data as any[];
    },
  });
  const advance = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-orders"] }); toast.success("Updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const cols = [
    { k: "preparing", label: "Preparing" },
    { k: "out_for_delivery", label: "Out for Delivery" },
    { k: "delivered", label: "Delivered" },
  ];

  return (
    <div className="p-6 md:p-8">
      <h1 className="font-display text-3xl font-bold">Orders Board</h1>
      <p className="text-muted-foreground">Move orders through preparation → delivery.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {cols.map((c) => {
          const rows = (orders.data ?? []).filter((o: any) => o.status === c.k);
          return (
            <Card key={c.k} className="p-4 min-h-64">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{c.label}</div>
                <Badge variant="secondary">{rows.length}</Badge>
              </div>
              <div className="mt-3 space-y-2">
                {rows.map((o: any) => {
                  const flow = STATUS_FLOW[o.status];
                  return (
                    <div key={o.id} className="rounded-md border p-3 text-sm bg-card">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{o.delivery_date} · <span className="capitalize">{o.slot}</span></div>
                        <Badge variant="outline" className="capitalize">{o.kind}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {o.profiles?.name || o.profiles?.email || "—"} · {o.profiles?.phone || ""}
                      </div>
                      <div className="text-xs text-muted-foreground">{o.delivery_address} · {o.delivery_pincode}</div>
                      <ul className="mt-2 text-xs space-y-0.5">
                        {o.order_items?.map((it: any) => <li key={it.id}>• {it.qty}× {it.name}</li>)}
                      </ul>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-semibold">₹{Number(o.total_inr).toFixed(0)}</span>
                        {flow.next && (
                          <Button size="sm" onClick={() => advance.mutate({ id: o.id, status: flow.next! })}>{flow.label}</Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {rows.length === 0 && <div className="text-xs text-muted-foreground">No orders.</div>}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
