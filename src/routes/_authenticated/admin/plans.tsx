import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { uploadMealImage } from "@/lib/storage";
import { MealImage } from "@/components/MealImage";
import { Copy, Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import { StatusBadge, StatusControl, StatusFilterTabs, type ContentStatus } from "@/components/admin/StatusControl";


type Cycle = "daily" | "weekly" | "biweekly" | "monthly";

type Plan = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  goal_type: "weight-loss" | "muscle-gain" | "balanced" | "keto";
  meals_per_day: number;
  days_per_week: number;
  billing_cycle: Cycle;
  price_inr: number;
  is_active: boolean;
  status: ContentStatus;
  duration_days: number;
  start_day_of_week: number | null;
  start_date: string | null;
  delivery_days: number[];
};

export const Route = createFileRoute("/_authenticated/admin/plans")({
  component: PlansPage,
});

const GOALS = ["weight-loss", "muscle-gain", "balanced", "keto"] as const;
const CYCLES: Cycle[] = ["daily", "weekly", "biweekly", "monthly"];
const CYCLE_DEFAULTS: Record<Cycle, number> = { daily: 1, weekly: 7, biweekly: 14, monthly: 28 };
const WEEKDAYS = [
  { v: 0, label: "Sun" },
  { v: 1, label: "Mon" },
  { v: 2, label: "Tue" },
  { v: 3, label: "Wed" },
  { v: 4, label: "Thu" },
  { v: 5, label: "Fri" },
  { v: 6, label: "Sat" },
];

function emptyPlan(): Partial<Plan> {
  return {
    name: "", description: "", goal_type: "balanced", meals_per_day: 2, days_per_week: 5,
    billing_cycle: "weekly", price_inr: 0, status: "active", image_url: "",
    duration_days: 7, delivery_days: [1, 2, 3, 4, 5], start_day_of_week: 1, start_date: null,
  };
}

function PlansPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Plan> | null>(null);
  const [builderFor, setBuilderFor] = useState<Plan | null>(null);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState<ContentStatus | "all">("active");

  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Plan[];
    },
  });

  const itemCounts = useQuery({
    queryKey: ["plan_item_counts_with_items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_items")
        .select("plan_id, menu_items(id,name,image_url,food_type)");
      if (error) throw error;
      const counts: Record<string, number> = {};
      const itemsByPlan: Record<string, any[]> = {};
      (data ?? []).forEach((r: any) => {
        counts[r.plan_id] = (counts[r.plan_id] ?? 0) + 1;
        if (r.menu_items) {
          (itemsByPlan[r.plan_id] = itemsByPlan[r.plan_id] ?? []).push(r.menu_items);
        }
      });
      // unique items per plan
      Object.keys(itemsByPlan).forEach((pid) => {
        itemsByPlan[pid] = Array.from(new Map(itemsByPlan[pid].map((m) => [m.id, m])).values());
      });
      return { counts, itemsByPlan };
    },
  });


  const save = useMutation({
    mutationFn: async (p: Partial<Plan>) => {
      const payload: any = { ...p };
      if (p.id) {
        // If cycle changed, wipe stale plan_items (their day_of_week won't match the new cycle's grid)
        const prev = plans.data?.find((x) => x.id === p.id);
        if (prev && prev.billing_cycle !== p.billing_cycle) {
          await supabase.from("plan_items").delete().eq("plan_id", p.id);
        }
        const { error } = await supabase.from("plans").update(payload).eq("id", p.id); if (error) throw error;
      }
      else { delete payload.id; const { error } = await supabase.from("plans").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plans"] }); qc.invalidateQueries({ queryKey: ["plan_item_counts_with_items"] }); qc.invalidateQueries({ queryKey: ["plan_items"] }); setOpen(false); toast.success("Saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ContentStatus }) => {
      const { error } = await supabase.from("plans").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plans"] }); toast.success("Status updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const duplicate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("duplicate_plan", { _id: id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plans"] }); qc.invalidateQueries({ queryKey: ["plan_item_counts_with_items"] }); toast.success("Plan duplicated — find the copy in Inactive"); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plans"] }); qc.invalidateQueries({ queryKey: ["plan_item_counts_with_items"] }); toast.success("Plan deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const onFile = async (f: File) => {
    setUploading(true);
    try { const p = await uploadMealImage(f); setEditing((e) => ({ ...e, image_url: p })); toast.success("Image uploaded"); }
    catch (e: any) { toast.error(e.message); } finally { setUploading(false); }
  };


  const toggleDeliveryDay = (d: number) => {
    setEditing((e) => {
      const cur = new Set(e?.delivery_days ?? []);
      cur.has(d) ? cur.delete(d) : cur.add(d);
      const arr = [...cur].sort();
      return { ...e, delivery_days: arr, days_per_week: arr.length || 1 };
    });
  };

  const setCycle = (c: Cycle) => {
    setEditing((e) => ({ ...e, billing_cycle: c, duration_days: e?.duration_days || CYCLE_DEFAULTS[c] }));
  };

  const cycle = (editing?.billing_cycle ?? "weekly") as Cycle;

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Plans</h1>
          <p className="text-muted-foreground">Pick a billing cycle, set delivery days, then build the menu.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusFilterTabs value={filter} onChange={setFilter} counts={{
            all: plans.data?.length,
            active: plans.data?.filter((p) => p.status === "active").length,
            inactive: plans.data?.filter((p) => p.status === "inactive").length,
            archived: plans.data?.filter((p) => p.status === "archived").length,
          }} />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(emptyPlan())}><Plus className="h-4 w-4 mr-2" />New plan</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                <Select value={cycle} onValueChange={(v) => setCycle(v as Cycle)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CYCLES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Meals / day</Label><Input type="number" min={1} max={3} value={editing?.meals_per_day ?? 2} onChange={(e) => setEditing({ ...editing, meals_per_day: +e.target.value })} /></div>
              <div>
                <Label>Duration (days)</Label>
                <Input type="number" min={1} value={editing?.duration_days ?? CYCLE_DEFAULTS[cycle]}
                  onChange={(e) => setEditing({ ...editing, duration_days: +e.target.value })} />
              </div>

              {cycle !== "daily" && (
                <div className="md:col-span-2 space-y-2">
                  <Label>Delivery days</Label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((d) => {
                      const active = (editing?.delivery_days ?? []).includes(d.v);
                      return (
                        <button key={d.v} type="button"
                          onClick={() => toggleDeliveryDay(d.v)}
                          className={`px-3 py-1.5 rounded-md text-sm border transition ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-secondary"}`}>
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">{editing?.delivery_days?.length ?? 0} day(s)/week selected.</p>
                </div>
              )}

              {(cycle === "weekly" || cycle === "biweekly" || cycle === "monthly") && (
                <div>
                  <Label>Anchor / start weekday</Label>
                  <Select value={String(editing?.start_day_of_week ?? 1)}
                    onValueChange={(v) => setEditing({ ...editing, start_day_of_week: +v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{WEEKDAYS.map((d) => <SelectItem key={d.v} value={String(d.v)}>{d.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}

              {cycle === "monthly" && (
                <div>
                  <Label>Fixed start date (optional)</Label>
                  <Input type="date" value={editing?.start_date ?? ""}
                    onChange={(e) => setEditing({ ...editing, start_date: e.target.value || null })} />
                </div>
              )}

              <div className="md:col-span-2"><Label>Price (₹ per cycle, incl. GST)</Label><Input type="number" step="0.01" value={editing?.price_inr ?? 0} onChange={(e) => setEditing({ ...editing, price_inr: +e.target.value })} /></div>
              <div className="md:col-span-2 flex items-center gap-3">
                <Label>Status</Label>
                <Select value={editing?.status ?? "active"} onValueChange={(v) => setEditing({ ...editing, status: v as ContentStatus })}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground ml-2">Can't activate until you add menu items below.</p>
              </div>
              <div className="md:col-span-2 flex items-center gap-2">
                <Checkbox id="is_popular" checked={!!(editing as any)?.is_popular}
                  onCheckedChange={(v) => setEditing({ ...editing, is_popular: !!v } as any)} />
                <Label htmlFor="is_popular" className="cursor-pointer">Mark as Popular (shown in Build-a-Bowl & top of Plans)</Label>
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
        {plans.data?.filter((p) => filter === "all" || p.status === filter).map((p) => {
          const count = itemCounts.data?.[p.id] ?? 0;
          return (
            <Card key={p.id} className={`overflow-hidden flex flex-col ${p.status === "archived" ? "opacity-60" : ""}`}>
              <MealImage path={p.image_url} alt={p.name} className="h-36 w-full object-cover" />
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{p.name}</h3>
                    <div className="text-xs text-muted-foreground capitalize">{p.goal_type.replace("-", " ")} · {p.billing_cycle}</div>
                    <div className="mt-1 flex gap-1.5 items-center">
                      <StatusBadge status={p.status} />
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${count === 0 ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground"}`}>
                        {count} menu item{count === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">₹{Number(p.price_inr).toFixed(0)}</div>
                    <div className="text-xs text-muted-foreground">/ {p.billing_cycle}</div>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                <div className="mt-3 text-xs text-muted-foreground">
                  {p.meals_per_day} meals/day · {p.duration_days}d cycle{p.billing_cycle !== "daily" && p.delivery_days?.length ? ` · ${p.delivery_days.length} delivery day(s)` : ""}
                </div>
                <div className="mt-4 flex gap-2 pt-3 border-t flex-wrap items-center">
                  <Button size="sm" variant="secondary" onClick={() => setBuilderFor(p)}><Settings2 className="h-4 w-4 mr-1" />Menu</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="h-4 w-4 mr-1" />Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => duplicate.mutate(p.id)} disabled={duplicate.isPending}><Copy className="h-4 w-4 mr-1" />Copy</Button>
                  <div className="ml-auto">
                    <StatusControl status={p.status} label="plan" onChange={(s) => setStatus.mutate({ id: p.id, status: s })} />
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {builderFor && <PlanMenuBuilder plan={builderFor} onClose={() => setBuilderFor(null)} />}
    </div>
  );
}

const SLOTS = ["breakfast", "lunch", "dinner"] as const;

function PlanMenuBuilder({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const qc = useQueryClient();
  const cycle = plan.billing_cycle as Cycle;
  const items = useQuery({
    queryKey: ["menu_items_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("id,name,food_type,meal_type,is_available,status")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string; food_type: string; meal_type: string | null; is_available: boolean; status: string }[];
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

  // Build a list of slots to render, based on cycle + delivery_days + meals_per_day
  const slotsToShow = (SLOTS.slice(0, Math.max(1, Math.min(3, plan.meals_per_day)))) as readonly string[];

  // Days to render
  const days = useMemo(() => {
    if (cycle === "daily") return [{ key: 0, label: "Every day" }];
    if (cycle === "weekly" || cycle === "biweekly") {
      const dd = plan.delivery_days?.length ? plan.delivery_days : [1, 2, 3, 4, 5];
      const out: { key: number; label: string }[] = [];
      const cycles = cycle === "biweekly" ? 2 : 1;
      for (let c = 0; c < cycles; c++) {
        dd.forEach((d) => {
          const lbl = WEEKDAYS.find((w) => w.v === d)?.label ?? `D${d}`;
          out.push({ key: c * 7 + d, label: cycles > 1 ? `Wk${c + 1} ${lbl}` : lbl });
        });
      }
      return out;
    }
    // monthly: 4 weeks of delivery_days
    const dd = plan.delivery_days?.length ? plan.delivery_days : [1, 2, 3, 4, 5];
    const out: { key: number; label: string }[] = [];
    for (let w = 0; w < 4; w++) {
      dd.forEach((d) => {
        const lbl = WEEKDAYS.find((w) => w.v === d)?.label ?? `D${d}`;
        out.push({ key: w * 7 + d, label: `Wk${w + 1} ${lbl}` });
      });
    }
    return out;
  }, [cycle, plan.delivery_days]);

  const setCell = useMutation({
    mutationFn: async ({ day, slot, menu_item_id }: { day: number; slot: string; menu_item_id: string | null }) => {
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
        const { error } = await supabase.from("plan_items").insert({ plan_id: plan.id, day_of_week: day, slot: slot as any, menu_item_id });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plan_items", plan.id] }); qc.invalidateQueries({ queryKey: ["plan_item_counts"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const valueFor = (day: number, slot: string) =>
    planItems.data?.find((pi) => pi.day_of_week === day && pi.slot === slot)?.menu_item_id ?? "";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Menu — {plan.name}</DialogTitle>
          <p className="text-xs text-muted-foreground capitalize">{plan.billing_cycle} cycle · {plan.meals_per_day} meal(s)/day</p>
        </DialogHeader>
        {(items.data?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">Add some menu items first.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-2 w-32">Day</th>
                  {slotsToShow.map((s) => <th key={s} className="text-left p-2 capitalize">{s}</th>)}
                </tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d.key} className="border-t">
                    <td className="p-2 font-medium">{d.label}</td>
                    {slotsToShow.map((s) => (
                      <td key={s} className="p-2">
                        <Select value={valueFor(d.key, s)} onValueChange={(v) => setCell.mutate({ day: d.key, slot: s, menu_item_id: v === "__none" ? null : v })}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none">— Clear —</SelectItem>
                            {(() => {
                              const all = items.data ?? [];
                              const matches = all.filter((m) => m.meal_type === s);
                              const others = all.filter((m) => m.meal_type !== s);
                              return (
                                <>
                                  {matches.map((m) => (
                                    <SelectItem key={m.id} value={m.id}>
                                      {m.food_type === "veg" || m.food_type === "jain" ? "🟢 " : "🔴 "}{m.name}
                                    </SelectItem>
                                  ))}
                                  {others.length > 0 && matches.length > 0 && (
                                    <div className="px-2 py-1 text-[10px] uppercase text-muted-foreground">Other meal types</div>
                                  )}
                                  {others.map((m) => (
                                    <SelectItem key={m.id} value={m.id}>
                                      {m.food_type === "veg" || m.food_type === "jain" ? "🟢 " : "🔴 "}{m.name}
                                      <span className="text-muted-foreground"> · {m.meal_type ?? "any"}</span>
                                    </SelectItem>
                                  ))}
                                </>
                              );
                            })()}
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
