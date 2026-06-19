import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { uploadMealImage } from "@/lib/storage";
import { MealImage } from "@/components/MealImage";
import { Pencil, Plus, Trash2, Settings2 } from "lucide-react";

type Plan = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  goal_type: "weight-loss" | "muscle-gain" | "balanced" | "keto";
  meals_per_day: number;
  days_per_week: number;
  billing_cycle: "weekly" | "monthly";
  price_inr: number;
  is_active: boolean;
};

export const Route = createFileRoute("/_authenticated/admin/plans")({
  component: PlansPage,
});

const GOALS = ["weight-loss", "muscle-gain", "balanced", "keto"] as const;
const CYCLES = ["weekly", "monthly"] as const;

function emptyPlan(): Partial<Plan> {
  return { name: "", description: "", goal_type: "balanced", meals_per_day: 2, days_per_week: 5, billing_cycle: "weekly", price_inr: 0, is_active: true, image_url: "" };
}

function PlansPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Plan> | null>(null);
  const [builderFor, setBuilderFor] = useState<Plan | null>(null);
  const [uploading, setUploading] = useState(false);

  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Plan[];
    },
  });

  const save = useMutation({
    mutationFn: async (p: Partial<Plan>) => {
      const payload: any = { ...p };
      if (p.id) { const { error } = await supabase.from("plans").update(payload).eq("id", p.id); if (error) throw error; }
      else { delete payload.id; const { error } = await supabase.from("plans").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plans"] }); setOpen(false); toast.success("Saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("plans").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plans"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const onFile = async (f: File) => {
    setUploading(true);
    try { const p = await uploadMealImage(f); setEditing((e) => ({ ...e, image_url: p })); toast.success("Image uploaded"); }
    catch (e: any) { toast.error(e.message); } finally { setUploading(false); }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Plans</h1>
          <p className="text-muted-foreground">Define subscription plans, then build their weekly menu.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(emptyPlan())}><Plus className="h-4 w-4 mr-2" />New plan</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "New"} plan</DialogTitle></DialogHeader>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>Image</Label>
                <div className="flex items-center gap-3 mt-1">
                  <MealImage path={editing?.image_url} alt="" className="h-20 w-20 rounded-md object-cover" />
                  <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} disabled={uploading} />
                </div>
              </div>
              <div className="md:col-span-2"><Label>Name</Label><Input value={editing?.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Description</Label><Textarea value={editing?.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div>
                <Label>Goal</Label>
                <Select value={editing?.goal_type} onValueChange={(v) => setEditing({ ...editing, goal_type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{GOALS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Billing cycle</Label>
                <Select value={editing?.billing_cycle} onValueChange={(v) => setEditing({ ...editing, billing_cycle: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CYCLES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Meals / day</Label><Input type="number" min={1} max={3} value={editing?.meals_per_day ?? 2} onChange={(e) => setEditing({ ...editing, meals_per_day: +e.target.value })} /></div>
              <div><Label>Days / week</Label><Input type="number" min={1} max={7} value={editing?.days_per_week ?? 5} onChange={(e) => setEditing({ ...editing, days_per_week: +e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Price (₹ incl. GST)</Label><Input type="number" step="0.01" value={editing?.price_inr ?? 0} onChange={(e) => setEditing({ ...editing, price_inr: +e.target.value })} /></div>
              <div className="md:col-span-2 flex items-center gap-2">
                <Switch checked={!!editing?.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => editing && save.mutate(editing)} disabled={save.isPending}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.data?.length === 0 && <p className="text-muted-foreground">No plans yet.</p>}
        {plans.data?.map((p) => (
          <Card key={p.id} className="overflow-hidden flex flex-col">
            <MealImage path={p.image_url} alt={p.name} className="h-36 w-full object-cover" />
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{p.name}</h3>
                  <div className="text-xs text-muted-foreground capitalize">{p.goal_type.replace("-", " ")} · {p.billing_cycle}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">₹{Number(p.price_inr).toFixed(0)}</div>
                  <div className="text-xs text-muted-foreground">/ {p.billing_cycle}</div>
                </div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{p.description}</p>
              <div className="mt-3 text-xs text-muted-foreground">{p.meals_per_day} meals/day · {p.days_per_week} days/week</div>
              <div className="mt-4 flex gap-2 pt-3 border-t flex-wrap">
                <Button size="sm" variant="secondary" onClick={() => setBuilderFor(p)}><Settings2 className="h-4 w-4 mr-1" />Weekly menu</Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="h-4 w-4 mr-1" />Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete plan?")) del.mutate(p.id); }}>
                  <Trash2 className="h-4 w-4 mr-1 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {builderFor && <PlanMenuBuilder plan={builderFor} onClose={() => setBuilderFor(null)} />}
    </div>
  );
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOTS = ["breakfast", "lunch", "dinner"] as const;

function PlanMenuBuilder({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const qc = useQueryClient();
  const items = useQuery({
    queryKey: ["menu_items_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("menu_items").select("id,name,food_type").order("name");
      if (error) throw error;
      return data as { id: string; name: string; food_type: string }[];
    },
  });
  const planItems = useQuery({
    queryKey: ["plan_items", plan.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("plan_items").select("*").eq("plan_id", plan.id);
      if (error) throw error;
      return data as { id: string; day_of_week: number; slot: string; menu_item_id: string }[];
    },
  });

  const setCell = useMutation({
    mutationFn: async ({ day, slot, menu_item_id }: { day: number; slot: typeof SLOTS[number]; menu_item_id: string | null }) => {
      const existing = planItems.data?.find((pi) => pi.day_of_week === day && pi.slot === slot);
      if (menu_item_id === null) {
        if (existing) {
          const { error } = await supabase.from("plan_items").delete().eq("id", existing.id);
          if (error) throw error;
        }
        return;
      }
      if (existing) {
        const { error } = await supabase.from("plan_items").update({ menu_item_id }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("plan_items").insert({ plan_id: plan.id, day_of_week: day, slot, menu_item_id });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plan_items", plan.id] }),
    onError: (e: any) => toast.error(e.message),
  });

  const valueFor = (day: number, slot: string) =>
    planItems.data?.find((pi) => pi.day_of_week === day && pi.slot === slot)?.menu_item_id ?? "";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Weekly menu — {plan.name}</DialogTitle></DialogHeader>
        {items.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add some menu items first.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-2 w-24">Day</th>
                  {SLOTS.map((s) => <th key={s} className="text-left p-2 capitalize">{s}</th>)}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((d, i) => (
                  <tr key={d} className="border-t">
                    <td className="p-2 font-medium">{d}</td>
                    {SLOTS.map((s) => (
                      <td key={s} className="p-2">
                        <Select value={valueFor(i + 1, s)} onValueChange={(v) => setCell.mutate({ day: i + 1, slot: s, menu_item_id: v === "__none" ? null : v })}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none">— Clear —</SelectItem>
                            {items.data?.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.food_type === "veg" || m.food_type === "jain" ? "🟢 " : "🔴 "}{m.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <DialogFooter><Button onClick={onClose}>Done</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
