import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

type P = { id: string; pincode: string; city: string | null; area: string | null; is_active: boolean };

export const Route = createFileRoute("/_authenticated/admin/pincodes")({
  component: PinPage,
});

function PinPage() {
  const qc = useQueryClient();
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");

  const list = useQuery({
    queryKey: ["pincodes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("serviceable_pincodes").select("*").order("pincode");
      if (error) throw error;
      return data as P[];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!/^\d{6}$/.test(pincode)) throw new Error("Pincode must be 6 digits");
      const { error } = await supabase.from("serviceable_pincodes").insert({ pincode, city: city || null, area: area || null });
      if (error) throw error;
    },
    onSuccess: () => { setPincode(""); setCity(""); setArea(""); qc.invalidateQueries({ queryKey: ["pincodes"] }); toast.success("Added"); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("serviceable_pincodes").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pincodes"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("serviceable_pincodes").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pincodes"] }); toast.success("Removed"); },
  });

  return (
    <div className="p-6 md:p-8">
      <h1 className="font-display text-3xl font-bold">Serviceable Pincodes</h1>
      <p className="text-muted-foreground">Customers in these pincodes can subscribe.</p>

      <Card className="p-4 mt-6">
        <div className="grid gap-3 md:grid-cols-4">
          <Input placeholder="Pincode (6 digits)" value={pincode} onChange={(e) => setPincode(e.target.value)} maxLength={6} />
          <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
          <Input placeholder="Area" value={area} onChange={(e) => setArea(e.target.value)} />
          <Button onClick={() => add.mutate()} disabled={add.isPending}><Plus className="h-4 w-4 mr-1" />Add</Button>
        </div>
      </Card>

      <Card className="mt-4">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr><th className="p-3">Pincode</th><th className="p-3">City</th><th className="p-3">Area</th><th className="p-3">Active</th><th></th></tr>
          </thead>
          <tbody>
            {list.data?.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No pincodes yet.</td></tr>}
            {list.data?.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3 font-mono">{p.pincode}</td>
                <td className="p-3">{p.city ?? "—"}</td>
                <td className="p-3">{p.area ?? "—"}</td>
                <td className="p-3"><Switch checked={p.is_active} onCheckedChange={(v) => toggle.mutate({ id: p.id, is_active: v })} /></td>
                <td className="p-3 text-right"><Button size="sm" variant="ghost" onClick={() => del.mutate(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
