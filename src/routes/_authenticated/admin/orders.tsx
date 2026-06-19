import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: OrdersPage,
});

function OrdersPage() {
  const orders = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("delivery_date", { ascending: true }).limit(200);
      if (error) throw error;
      return data;
    },
  });
  const cols: { k: string; label: string }[] = [
    { k: "preparing", label: "Preparing" },
    { k: "out_for_delivery", label: "Out for Delivery" },
    { k: "delivered", label: "Delivered" },
  ];
  return (
    <div className="p-6 md:p-8">
      <h1 className="font-display text-3xl font-bold">Orders Board</h1>
      <p className="text-muted-foreground">Will populate once customers start subscribing.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {cols.map((c) => (
          <Card key={c.k} className="p-4 min-h-64">
            <div className="font-semibold">{c.label}</div>
            <div className="mt-3 space-y-2">
              {(orders.data ?? []).filter((o: any) => o.status === c.k).map((o: any) => (
                <div key={o.id} className="rounded-md border p-3 text-sm">
                  <div className="font-medium">{o.delivery_date} · {o.slot}</div>
                  <div className="text-xs text-muted-foreground">#{o.id.slice(0, 8)}</div>
                </div>
              ))}
              {(orders.data ?? []).filter((o: any) => o.status === c.k).length === 0 && (
                <div className="text-xs text-muted-foreground">No orders.</div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
