import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Tag, Trash2, Pencil, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/promos")({
  component: PromosPage,
});

type Promo = {
  id: string; code: string; description: string | null;
  discount_type: "percent" | "flat"; discount_value: number;
  min_subtotal_inr: number; max_discount_inr: number | null;
  valid_from: string; valid_to: string | null;
  max_uses: number | null; uses: number; per_user_limit: number;
  applies_to: "all" | "plan" | "bowl"; is_active: boolean;
};

const blank = (): Partial<Promo> => ({
  code: "", description: "", discount_type: "percent", discount_value: 10,
  min_subtotal_inr: 0, max_discount_inr: null,
  valid_from: new Date().toISOString().slice(0, 10), valid_to: null,
  max_uses: null, per_user_limit: 1, applies_to: "all", is_active: true,
});

function PromosPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Promo> | null>(null);

  const promosQ = useQuery({
    queryKey: ["admin-promos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("promo_codes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Promo[];
    },
  });

  const save = useMutation({
    mutationFn: async (p: Partial<Promo>) => {
      const row: any = {
        code: (p.code ?? "").toUpperCase().trim(),
        description: p.description || null,
        discount_type: p.discount_type, discount_value: p.discount_value,
        min_subtotal_inr: p.min_subtotal_inr ?? 0,
        max_discount_inr: p.max_discount_inr || null,
        valid_from: p.valid_from ? new Date(p.valid_from).toISOString() : new Date().toISOString(),
        valid_to: p.valid_to ? new Date(p.valid_to).toISOString() : null,
        max_uses: p.max_uses || null,
        per_user_limit: p.per_user_limit ?? 1,
        applies_to: p.applies_to ?? "all",
        is_active: p.is_active ?? true,
      };
      if (!row.code) throw new Error("Code is required");
      if (p.id) {
        const { error } = await supabase.from("promo_codes").update(row).eq("id", p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("promo_codes").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-promos"] }); setEditing(null); toast.success("Saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("promo_codes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-promos"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (p: Promo) => {
      const { error } = await supabase.from("promo_codes").update({ is_active: !p.is_active }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-promos"] }),
  });

  return (
    <div className="p-4 md:p-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2"><Tag className="h-6 w-6" /> Promo Codes</h1>
          <p className="text-sm text-muted-foreground mt-1">Create launch offers, festive coupons, and referral codes.</p>
        </div>
        <Button onClick={() => setEditing(blank())}><Plus className="h-4 w-4 mr-1" /> New code</Button>
      </div>

      {promosQ.isLoading && <p className="mt-6 text-muted-foreground">Loading…</p>}

      <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {(promosQ.data ?? []).map((p) => {
          const expired = p.valid_to && new Date(p.valid_to) < new Date();
          const exhausted = p.max_uses != null && p.uses >= p.max_uses;
          return (
            <Card key={p.id} className={`p-4 ${!p.is_active || expired || exhausted ? "opacity-70" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-mono font-bold text-lg tracking-wide">{p.code}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.description || "—"}</div>
                </div>
                <Switch checked={p.is_active} onCheckedChange={() => toggleActive.mutate(p)} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant="secondary">{p.discount_type === "percent" ? `${p.discount_value}% off` : `₹${p.discount_value} off`}</Badge>
                {p.max_discount_inr && <Badge variant="outline">Max ₹{p.max_discount_inr}</Badge>}
                {p.min_subtotal_inr > 0 && <Badge variant="outline">Min ₹{p.min_subtotal_inr}</Badge>}
                <Badge variant="outline" className="capitalize">{p.applies_to}</Badge>
                {expired && <Badge variant="destructive">Expired</Badge>}
                {exhausted && <Badge variant="destructive">Used up</Badge>}
              </div>
              <div className="mt-3 text-xs text-muted-foreground flex items-center justify-between">
                <span className="inline-flex items-center gap-1"><BarChart3 className="h-3 w-3" /> {p.uses}{p.max_uses ? ` / ${p.max_uses}` : ""} used</span>
                <span>{p.valid_to ? `until ${p.valid_to.slice(0,10)}` : "no expiry"}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(p)}><Pencil className="h-3 w-3 mr-1" /> Edit</Button>
                <Button size="sm" variant="ghost" className="text-destructive"
                  onClick={() => confirm(`Delete code ${p.code}?`) && del.mutate(p.id)}><Trash2 className="h-3 w-3 mr-1" /> Delete</Button>
              </div>
            </Card>
          );
        })}
        {!promosQ.isLoading && (promosQ.data?.length ?? 0) === 0 && (
          <Card className="p-8 text-center text-muted-foreground col-span-full">No promo codes yet.</Card>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit code" : "New promo code"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Code</Label>
                  <Input value={editing.code ?? ""} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })} placeholder="WELCOME10" />
                </div>
                <div>
                  <Label>Applies to</Label>
                  <Select value={editing.applies_to ?? "all"} onValueChange={(v: any) => setEditing({ ...editing, applies_to: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All orders</SelectItem>
                      <SelectItem value="plan">Plans only</SelectItem>
                      <SelectItem value="bowl">Build-a-Bowl only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Input value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Welcome offer — 10% off" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Discount type</Label>
                  <Select value={editing.discount_type ?? "percent"} onValueChange={(v: any) => setEditing({ ...editing, discount_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percent</SelectItem>
                      <SelectItem value="flat">Flat ₹</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Value</Label>
                  <Input type="number" min={1} value={editing.discount_value ?? 0}
                    onChange={(e) => setEditing({ ...editing, discount_value: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Min subtotal (₹)</Label>
                  <Input type="number" min={0} value={editing.min_subtotal_inr ?? 0}
                    onChange={(e) => setEditing({ ...editing, min_subtotal_inr: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Max discount (₹) <span className="text-muted-foreground text-xs">opt.</span></Label>
                  <Input type="number" min={0} value={editing.max_discount_inr ?? ""}
                    onChange={(e) => setEditing({ ...editing, max_discount_inr: e.target.value ? Number(e.target.value) : null })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valid from</Label>
                  <Input type="date" value={(editing.valid_from ?? "").slice(0,10)}
                    onChange={(e) => setEditing({ ...editing, valid_from: e.target.value })} />
                </div>
                <div>
                  <Label>Valid to <span className="text-muted-foreground text-xs">opt.</span></Label>
                  <Input type="date" value={(editing.valid_to ?? "").slice(0,10)}
                    onChange={(e) => setEditing({ ...editing, valid_to: e.target.value || null })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Total uses <span className="text-muted-foreground text-xs">opt.</span></Label>
                  <Input type="number" min={1} value={editing.max_uses ?? ""}
                    onChange={(e) => setEditing({ ...editing, max_uses: e.target.value ? Number(e.target.value) : null })} />
                </div>
                <div>
                  <Label>Per-user limit</Label>
                  <Input type="number" min={1} value={editing.per_user_limit ?? 1}
                    onChange={(e) => setEditing({ ...editing, per_user_limit: Number(e.target.value) })} />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Switch checked={editing.is_active ?? true}
                  onCheckedChange={(c) => setEditing({ ...editing, is_active: c })} />
                <Label className="!mb-0">Active</Label>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={() => save.mutate(editing)} disabled={save.isPending}>
                  {save.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
