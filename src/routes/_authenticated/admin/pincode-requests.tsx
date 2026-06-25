import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/pincode-requests")({
  component: PincodeRequestsPage,
});

const STATUSES = ["new", "reviewed", "planned", "served", "rejected"] as const;

function PincodeRequestsPage() {
  const qc = useQueryClient();
  const reqsQ = useQuery({
    queryKey: ["admin-pincode-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pincode_requests" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("pincode_requests" as any).update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-pincode-requests"] }); toast.success("Updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const promote = useMutation({
    mutationFn: async (pincode: string) => {
      const { error } = await supabase.from("serviceable_pincodes")
        .upsert({ pincode, is_active: true }, { onConflict: "pincode" });
      if (error) throw error;
    },
    onSuccess: (_d, pincode) => {
      toast.success(`${pincode} added to serviceable list`);
      qc.invalidateQueries({ queryKey: ["serviceable-pincodes-public"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Group by pincode count
  const grouped = new Map<string, any[]>();
  (reqsQ.data ?? []).forEach((r) => {
    const arr = grouped.get(r.pincode) ?? []; arr.push(r); grouped.set(r.pincode, arr);
  });
  const byCount = [...grouped.entries()].sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="p-6 md:p-8">
      <h1 className="font-display text-3xl font-bold">Expansion Requests</h1>
      <p className="text-muted-foreground">Customers who asked us to deliver to a pincode we don't yet serve.</p>

      {reqsQ.isLoading && <p className="mt-6 text-muted-foreground">Loading…</p>}
      {!reqsQ.isLoading && (reqsQ.data?.length ?? 0) === 0 && (
        <Card className="p-8 mt-6 text-center text-muted-foreground">No expansion requests yet.</Card>
      )}

      {byCount.length > 0 && (
        <div className="mt-6 grid gap-4">
          {byCount.map(([pin, items]) => (
            <Card key={pin} className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="font-display text-2xl font-bold">{pin}</div>
                  <div className="text-xs text-muted-foreground">{items.length} request(s)</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => promote.mutate(pin)} disabled={promote.isPending}>
                    <Check className="h-3 w-3 mr-1" /> Mark serviceable
                  </Button>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {items.map((r: any) => (
                  <div key={r.id} className="rounded border p-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">{r.name || "Anonymous"} {r.phone && <span className="text-muted-foreground">· {r.phone}</span>}</div>
                      <Badge variant="outline" className="capitalize text-[10px]">{r.status}</Badge>
                    </div>
                    {r.notes && <div className="text-xs text-muted-foreground mt-1">{r.notes}</div>}
                    <div className="text-[10px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString()}</div>
                    <Select value={r.status} onValueChange={(v) => setStatus.mutate({ id: r.id, status: v })}>
                      <SelectTrigger className="mt-2 h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
