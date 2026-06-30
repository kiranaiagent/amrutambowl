import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { MealImage } from "@/components/MealImage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Sparkles, Trash2, ChevronDown, CalendarDays, ClipboardList, UtensilsCrossed, Check, Plus as PlusIcon } from "lucide-react";

/** Build-a-Bowl: schedule + per-delivery menu picker. */
export const Route = createFileRoute("/bowl")({
  head: () => ({
    meta: [
      { title: "Build My Own Bowl — Amrutam Bowl" },
      { name: "description", content: "Design your own subscription. Pick cycle, days, time and menu for each delivery." },
    ],
  }),
  component: BowlPage,
  errorComponent: ({ error }) => <div className="p-8">Couldn't load: {error.message}</div>,
});

export type BowlCycle = "daily" | "weekly" | "biweekly" | "monthly";
export type BowlSlot = "breakfast" | "lunch" | "dinner";
export type BowlPick = { date: string; slot: BowlSlot; menu_item_id: string | null };

const BOWL_KEY = "amrutam.bowl.config.v1";
const SLOTS: BowlSlot[] = ["breakfast", "lunch", "dinner"];
const WEEKDAYS = [
  { v: 0, label: "Sun" }, { v: 1, label: "Mon" }, { v: 2, label: "Tue" },
  { v: 3, label: "Wed" }, { v: 4, label: "Thu" }, { v: 5, label: "Fri" }, { v: 6, label: "Sat" },
];
const CYCLE_DEFAULT_DURATION: Record<BowlCycle, number> = { daily: 1, weekly: 7, biweekly: 14, monthly: 28 };

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(base: Date, n: number) { const d = new Date(base); d.setDate(d.getDate() + n); return d; }
function dayLabel(dateStr: string) {
  const d = new Date(dateStr);
  return `${WEEKDAYS[d.getDay()].label} ${d.getDate()}/${d.getMonth() + 1}`;
}

function BowlPage() {
  const nav = useNavigate();
  // ---- Schedule state ----
  const tomorrow = useMemo(() => addDays(new Date(), 1), []);
  const [cycle, setCycle] = useState<BowlCycle>("weekly");
  const [mealsPerDay, setMealsPerDay] = useState(1);
  const [duration, setDuration] = useState(7);
  const [deliveryDays, setDeliveryDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startDate, setStartDate] = useState(isoDate(tomorrow));
  const [preferredTime, setPreferredTime] = useState("12:30");
  const [primarySlot, setPrimarySlot] = useState<BowlSlot>("lunch");
  // Which accordion step is expanded (0 = all collapsed)
  const [openStep, setOpenStep] = useState(1);

  // ---- Menu picks: keyed `${date}|${slot}` -> list of item ids.
  // A signature bowl = [bowlId]; a custom bowl = [ingredientId, ...]. ----
  const [picks, setPicks] = useState<Record<string, string[]>>({});

  // ---- Data ----
  const menuQ = useQuery({
    queryKey: ["bowl-menu"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items").select("*").eq("status", "active").eq("is_available", true).order("name");
      if (error) throw error;
      return data as any[];
    },
  });
  const popularPlansQ = useQuery({
    queryKey: ["bowl-popular-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans").select("id,name,description,image_url,price_inr,billing_cycle,meals_per_day,delivery_days,is_popular")
        .eq("status", "active").order("is_popular" as any, { ascending: false }).limit(8);
      if (error) throw error;
      return data as any[];
    },
  });

  // Compute the delivery schedule (date list × slots/day)
  const deliveries = useMemo(() => {
    const out: { date: string; slot: BowlSlot }[] = [];
    const slotsList = SLOTS.slice(0, Math.max(1, Math.min(3, mealsPerDay)));
    if (cycle === "daily") {
      for (let i = 0; i < duration; i++) {
        const d = addDays(new Date(startDate), i);
        slotsList.forEach((s) => out.push({ date: isoDate(d), slot: s }));
      }
      return out;
    }
    const span = duration;
    const start = new Date(startDate);
    for (let i = 0; i < span; i++) {
      const d = addDays(start, i);
      if (!deliveryDays.includes(d.getDay())) continue;
      slotsList.forEach((s) => out.push({ date: isoDate(d), slot: s }));
    }
    return out;
  }, [cycle, duration, deliveryDays, startDate, mealsPerDay]);

  // Clean up stale picks (keys not in current deliveries)
  useEffect(() => {
    setPicks((cur) => {
      const valid = new Set(deliveries.map((d) => `${d.date}|${d.slot}`));
      const next: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(cur)) if (valid.has(k)) next[k] = v;
      return next;
    });
  }, [deliveries.length]);

  // Seed a single bowl (+ add-ons) when arriving from a menu card's "Add to bowl".
  // Applied once the schedule's deliveries exist — fills every slot with the combo.
  const seedBowlRef = useRef<{ bowlId: string; addonIds: string[] } | null>(null);
  const [seedBowlPending, setSeedBowlPending] = useState(false);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("amrutam.bowl.seedBowl");
      if (!raw) return;
      sessionStorage.removeItem("amrutam.bowl.seedBowl");
      seedBowlRef.current = JSON.parse(raw);
      setSeedBowlPending(true);
    } catch {}
  }, []);
  useEffect(() => {
    if (!seedBowlPending || !seedBowlRef.current || deliveries.length === 0) return;
    const { bowlId, addonIds } = seedBowlRef.current;
    const combo = [bowlId, ...(addonIds ?? [])].filter(Boolean);
    setPicks(() => {
      const next: Record<string, string[]> = {};
      deliveries.forEach((d) => { next[`${d.date}|${d.slot}`] = combo; });
      return next;
    });
    setOpenStep(3);
    setSeedBowlPending(false);
    seedBowlRef.current = null;
    toast.success("Bowl added to every delivery — tweak your schedule or any plate below.");
  }, [seedBowlPending, deliveries]);

  // Seed config from a plan when arriving via "Build a Bowl using this plan".
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("amrutam.bowl.seedFromPlan");
      if (!raw) return;
      sessionStorage.removeItem("amrutam.bowl.seedFromPlan");
      const seed = JSON.parse(raw);
      if (seed?.billing_cycle && ["daily", "weekly", "biweekly", "monthly"].includes(seed.billing_cycle)) {
        setCycle(seed.billing_cycle);
        setDuration(CYCLE_DEFAULT_DURATION[seed.billing_cycle as BowlCycle]);
      }
      if (typeof seed?.meals_per_day === "number") setMealsPerDay(Math.max(1, Math.min(3, seed.meals_per_day)));
      toast.success("Pre-filled from plan — tweak any meal below.");
    } catch {}
  }, []);


  const menuById = useMemo(() => {
    const m = new Map<string, any>();
    (menuQ.data ?? []).forEach((it) => m.set(it.id, it));
    return m;
  }, [menuQ.data]);

  const subtotal = useMemo(() => {
    let sum = 0;
    for (const d of deliveries) {
      for (const id of picks[`${d.date}|${d.slot}`] ?? []) {
        const mi = menuById.get(id);
        if (mi) sum += Number(mi.price_inr);
      }
    }
    return sum;
  }, [deliveries, picks, menuById]);

  const filled = useMemo(() => deliveries.filter((d) => (picks[`${d.date}|${d.slot}`] ?? []).length > 0).length, [deliveries, picks]);

  // ---- Actions ----
  const toggleDay = (v: number) => {
    setDeliveryDays((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v].sort()));
  };
  const setCycleSafe = (c: BowlCycle) => {
    setCycle(c);
    setDuration(CYCLE_DEFAULT_DURATION[c]);
    if (c === "daily") setDeliveryDays([0, 1, 2, 3, 4, 5, 6]);
  };

  const loadFromPlan = async (planId: string) => {
    const { data: items, error } = await supabase
      .from("plan_items").select("day_of_week, slot, menu_item_id").eq("plan_id", planId);
    if (error) { toast.error(error.message); return; }
    // Map plan day_of_week (0-6 or higher for bi/monthly) onto our concrete dates: for each delivery,
    // find a plan item whose day_of_week mod 7 matches and slot matches.
    setPicks((cur) => {
      const next = { ...cur };
      deliveries.forEach((d) => {
        const dow = new Date(d.date).getDay();
        const candidate = (items ?? []).find((pi: any) => (pi.day_of_week % 7) === dow && pi.slot === d.slot)
          ?? (items ?? []).find((pi: any) => pi.slot === d.slot);
        if (candidate?.menu_item_id) next[`${d.date}|${d.slot}`] = [candidate.menu_item_id];
      });
      return next;
    });
    toast.success("Loaded popular plan — edit any meal below.");
  };

  const clearAll = () => setPicks({});

  const continueToCheckout = () => {
    if (filled === 0) { toast.error("Pick at least one meal"); return; }
    const config = {
      kind: "bowl",
      cycle, mealsPerDay, duration, deliveryDays,
      startDate, preferredTime, primarySlot,
      picks: deliveries.map((d) => ({ date: d.date, slot: d.slot, menu_item_ids: picks[`${d.date}|${d.slot}`] ?? [] })),
      subtotal,
    };
    try { sessionStorage.setItem(BOWL_KEY, JSON.stringify(config)); } catch {}
    nav({ to: "/checkout", search: { bowl: "1" } as any });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 md:py-8">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">Build My Own Bowl</h1>
            <p className="text-sm text-muted-foreground">Customise your subscription in three easy steps.</p>
          </div>
          <Link to="/plans" className="text-sm font-medium text-primary hover:underline">Or browse popular plans</Link>
        </div>

        {/* Step 1 — Schedule */}
        <StepSection n={1} Icon={CalendarDays} title="Set Your Schedule"
          summary={`${cycle[0].toUpperCase() + cycle.slice(1)} · ${duration} day(s) · ${deliveries.length} slots`}
          open={openStep === 1} onToggle={() => setOpenStep((o) => (o === 1 ? 0 : 1))}>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label>Plan Cycle</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {(["daily","weekly","biweekly","monthly"] as BowlCycle[]).map((c) => (
                  <button key={c} onClick={() => setCycleSafe(c)}
                    className={`px-3 py-1.5 text-sm rounded-md border capitalize ${cycle === c ? "bg-primary text-primary-foreground border-primary" : "hover:bg-secondary"}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Meals / Day</Label>
              <Select value={String(mealsPerDay)} onValueChange={(v) => setMealsPerDay(+v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Primary Delivery Slot</Label>
              <Select value={primarySlot} onValueChange={(v) => setPrimarySlot(v as BowlSlot)}>
                <SelectTrigger className="mt-1 capitalize"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SLOTS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Duration (Days)</Label>
              <Input type="number" min={1} max={90} value={duration} className="mt-1"
                onChange={(e) => setDuration(Math.max(1, +e.target.value))} />
            </div>
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={startDate} min={isoDate(tomorrow)} className="mt-1"
                onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>Preferred Time</Label>
              <Input type="time" value={preferredTime} className="mt-1"
                onChange={(e) => setPreferredTime(e.target.value)} />
            </div>
            {cycle !== "daily" && (
              <div className="md:col-span-3">
                <Label>Delivery Days</Label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {WEEKDAYS.map((d) => {
                    const on = deliveryDays.includes(d.v);
                    return (
                      <button key={d.v} onClick={() => toggleDay(d.v)}
                        className={`px-3 py-1.5 rounded-md text-sm border ${on ? "bg-primary text-primary-foreground border-primary" : "hover:bg-secondary"}`}>
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-md bg-secondary/40 p-3 text-sm flex flex-wrap items-center gap-3 justify-between">
            <div>
              <strong>{deliveries.length}</strong> meal slots over <strong>{duration}</strong> day(s) ·
              {" "}{filled}/{deliveries.length} chosen
            </div>
            <div className="text-muted-foreground text-xs">First delivery: {deliveries[0]?.date ?? "—"} · Last: {deliveries[deliveries.length - 1]?.date ?? "—"}</div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setOpenStep(2)}>Next: Pick a Plan</Button>
          </div>
        </StepSection>

        {/* Step 2 — Start from popular OR start blank */}
        <StepSection n={2} Icon={ClipboardList} title="Pick a Plan"
          summary="Optional — gives you a head-start"
          open={openStep === 2} onToggle={() => setOpenStep((o) => (o === 2 ? 0 : 2))}>
          {popularPlansQ.data && popularPlansQ.data.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {popularPlansQ.data.map((p) => (
                <button key={p.id} onClick={() => loadFromPlan(p.id)}
                  className="text-left rounded-lg border hover:border-primary hover:shadow-sm transition overflow-hidden">
                  <MealImage path={p.image_url} alt={p.name} className="h-24 w-full object-cover" />
                  <div className="p-3">
                    <div className="font-medium text-sm flex items-center gap-1">
                      {p.is_popular && <Sparkles className="h-3 w-3 text-primary" />}
                      {p.name}
                    </div>
                    <div className="text-xs text-muted-foreground">₹{Number(p.price_inr).toFixed(0)} · {p.billing_cycle}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No popular plans yet — start blank below.</p>
          )}
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setOpenStep(3)}>Next: Choose Meals</Button>
          </div>
        </StepSection>

        {/* Step 3 — Per-delivery menu picker */}
        <StepSection n={3} Icon={UtensilsCrossed} title="Choose Each Plate"
          summary={`${filled}/${deliveries.length} meals chosen`}
          open={openStep === 3} onToggle={() => setOpenStep((o) => (o === 3 ? 0 : 3))}>
          <div className="mb-3 flex justify-end">
            <Button size="sm" variant="ghost" onClick={clearAll}><Trash2 className="h-3 w-3 mr-1" /> Clear All</Button>
          </div>

          {deliveries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Set a schedule above to start picking meals.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {deliveries.map((d) => {
                const key = `${d.date}|${d.slot}`;
                const ids = picks[key] ?? [];
                const chosen = ids.map((id) => menuById.get(id)).filter(Boolean) as any[];
                const slotPrice = chosen.reduce((s, m) => s + Number(m.price_inr || 0), 0);
                const bowlsIn = chosen.filter((m) => m.kind === "bowl");
                const addonsIn = chosen.filter((m) => m.is_addon);
                // A signature bowl, optionally with add-ons (beverage/snack), reads as the bowl.
                const head = bowlsIn[0];
                const isSignature = bowlsIn.length === 1 && bowlsIn.length + addonsIn.length === chosen.length;
                const macro = isSignature && (head.calories > 0 || head.protein_g > 0)
                  ? [head.calories > 0 ? `${head.calories} kcal` : null, head.protein_g > 0 ? `${head.protein_g}g protein` : null].filter(Boolean).join(" · ")
                  : null;
                return (
                  <div key={key} className={`rounded-xl border p-3 transition ${chosen.length ? "bg-secondary/20" : "border-dashed"}`}>
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">{dayLabel(d.date)}</div>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wide font-semibold text-secondary-foreground capitalize">{d.slot}</span>
                    </div>
                    <div className="mt-3 min-h-[3rem]">
                      {chosen.length === 0 ? (
                        <div className="flex h-12 items-center text-sm text-muted-foreground italic">No bowl chosen yet</div>
                      ) : isSignature ? (
                        <div className="flex items-center gap-2.5">
                          <MealImage path={head.image_url} alt={head.name} className="h-12 w-12 rounded-lg object-cover shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium text-sm leading-tight flex items-center gap-1.5">
                              <span className={head.food_type === "veg" || head.food_type === "jain" ? "veg-dot" : "nonveg-dot"} />
                              <span className="truncate">{head.name}</span>
                            </div>
                            {macro && <div className="text-[11px] text-muted-foreground mt-0.5">{macro}</div>}
                            {addonsIn.length > 0 && (
                              <div className="mt-0.5 line-clamp-1 text-[11px] text-primary">+ {addonsIn.map((m) => m.name).join(", ")}</div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-sm font-medium leading-tight">Custom bowl · {chosen.length} item{chosen.length === 1 ? "" : "s"}</div>
                          <div className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{chosen.map((m) => m.name).join(" · ")}</div>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t pt-2.5">
                      <div className="font-semibold text-sm">{chosen.length ? `₹${slotPrice.toFixed(0)}` : <span className="text-muted-foreground font-normal">—</span>}</div>
                      <MealPicker
                        items={menuQ.data ?? []}
                        currentIds={ids}
                        slotHint={d.slot}
                        onPick={(newIds) => setPicks((cur) => {
                          const n = { ...cur };
                          if (newIds.length) n[key] = newIds; else delete n[key];
                          return n;
                        })}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </StepSection>

        {/* Sticky summary footer */}
        <Card className="mt-5 p-5 flex items-center justify-between gap-4 flex-wrap sticky bottom-3 shadow-lg">
          <div>
            <div className="text-sm text-muted-foreground">{filled} meal{filled === 1 ? "" : "s"} chosen · {cycle[0].toUpperCase() + cycle.slice(1)} · {duration} day(s)</div>
            <div className="font-display text-3xl font-bold">₹{subtotal.toFixed(0)}<span className="text-sm font-normal text-muted-foreground"> + GST at checkout</span></div>
          </div>
          <Button size="lg" onClick={continueToCheckout} disabled={filled === 0}>
            Continue to Checkout
          </Button>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

function StepSection({ n, Icon, title, summary, open, onToggle, children }: {
  n: number; Icon: any; title: string; summary: string; open: boolean; onToggle: () => void; children: ReactNode;
}) {
  return (
    <Card className={`mt-4 overflow-hidden transition ${open ? "ring-1 ring-primary/40" : ""}`}>
      <button type="button" onClick={onToggle}
        className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-secondary/30">
        <div className="relative shrink-0">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4.5 w-4.5" />
          </div>
          <span className="absolute -right-1.5 -top-1.5 grid h-4.5 w-4.5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-2 ring-card">{n}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold leading-tight">{title}</div>
          <div className="truncate text-xs text-muted-foreground">{summary}</div>
        </div>
        <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </Card>
  );
}

const ROLE_ORDER = ["base", "protein", "vegetable", "sauce", "topping", "other"] as const;
const ROLE_LABEL: Record<string, string> = {
  base: "Base", protein: "Protein", vegetable: "Vegetables", sauce: "Sauce", topping: "Toppings", other: "Extras",
};

function MealPicker({ items, currentIds, slotHint, onPick }: {
  items: any[]; currentIds: string[]; slotHint: BowlSlot;
  onPick: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"bowls" | "custom">(currentIds.length > 1 ? "custom" : "bowls");
  const [sel, setSel] = useState<string[]>(currentIds);
  useEffect(() => {
    if (open) { setSel(currentIds); setTab(currentIds.length > 1 ? "custom" : "bowls"); }
  }, [open]);

  const byId = useMemo(() => {
    const m = new Map<string, any>();
    items.forEach((i) => m.set(i.id, i));
    return m;
  }, [items]);
  const realBowls = items.filter((i) => i.kind === "bowl");
  const bowlList = realBowls.length ? realBowls : items.filter((i) => i.kind !== "ingredient");
  const ingredients = items.filter((i) => i.kind === "ingredient");
  const byRole = ROLE_ORDER
    .map((r) => ({ role: r as string, list: ingredients.filter((i) => (i.component_role || "other") === r) }))
    .filter((g) => g.list.length);

  const selTotal = sel.reduce((s, id) => s + Number(byId.get(id)?.price_inr || 0), 0);
  const toggle = (id: string) => setSel((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={currentIds.length ? "outline" : "default"}>{currentIds.length ? "Change" : "Pick"}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Choose for <span className="capitalize text-muted-foreground">{slotHint}</span></DialogTitle></DialogHeader>

        <div className="inline-flex rounded-lg border p-1 bg-card">
          <button onClick={() => setTab("bowls")} className={`px-3 py-1.5 text-sm rounded-md ${tab === "bowls" ? "bg-primary text-primary-foreground" : ""}`}>Signature Bowls</button>
          <button onClick={() => setTab("custom")} className={`px-3 py-1.5 text-sm rounded-md ${tab === "custom" ? "bg-primary text-primary-foreground" : ""}`}>Build Your Own</button>
        </div>

        {tab === "bowls" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {bowlList.length === 0 && <p className="col-span-2 p-4 text-center text-sm text-muted-foreground">No bowls available yet.</p>}
            {bowlList.map((it: any) => {
              const active = currentIds.length === 1 && currentIds[0] === it.id;
              return (
                <button key={it.id} onClick={() => { onPick([it.id]); setOpen(false); }}
                  className={`flex overflow-hidden rounded-lg border text-left transition hover:border-primary hover:shadow-sm ${active ? "border-primary ring-1 ring-primary" : ""}`}>
                  <MealImage path={it.image_url} alt={it.name} className="h-24 w-24 shrink-0 object-cover" />
                  <div className="min-w-0 flex-1 p-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className={it.food_type === "veg" || it.food_type === "jain" ? "veg-dot" : "nonveg-dot"} />
                      <span className="truncate text-sm font-medium">{it.name}</span>
                    </div>
                    {it.description && <div className="line-clamp-2 text-[11px] text-muted-foreground">{it.description}</div>}
                    <div className="mt-1 text-[11px] text-muted-foreground">{it.calories > 0 ? `${it.calories} kcal · ` : ""}P {it.protein_g}g</div>
                    <div className="mt-1 text-sm font-semibold text-primary">₹{Number(it.price_inr).toFixed(0)}</div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : ingredients.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">No ingredients to build with yet — add some in Admin (kind = ingredient).</p>
        ) : (
          <div className="space-y-4">
            {byRole.map((g) => (
              <div key={g.role}>
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{ROLE_LABEL[g.role]}</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {g.list.map((it: any) => {
                    const on = sel.includes(it.id);
                    return (
                      <button key={it.id} onClick={() => toggle(it.id)}
                        className={`flex items-center gap-2 rounded-lg border p-2 text-left transition ${on ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}>
                        <MealImage path={it.image_url} alt={it.name} className="h-9 w-9 shrink-0 rounded object-cover" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{it.name}</div>
                          <div className="text-[10px] text-muted-foreground">₹{Number(it.price_inr).toFixed(0)}</div>
                        </div>
                        {on ? <Check className="h-4 w-4 shrink-0 text-primary" /> : <PlusIcon className="h-4 w-4 shrink-0 text-muted-foreground" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="sticky bottom-0 -mx-1 flex items-center justify-between gap-3 border-t bg-background pt-3">
              <div className="text-sm"><span className="font-semibold">{sel.length}</span> item{sel.length === 1 ? "" : "s"} · <span className="font-semibold">₹{selTotal.toFixed(0)}</span></div>
              <div className="flex gap-2">
                {sel.length > 0 && <Button size="sm" variant="ghost" onClick={() => setSel([])}>Clear</Button>}
                <Button size="sm" onClick={() => { onPick(sel); setOpen(false); }} disabled={sel.length === 0}>Save bowl</Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
