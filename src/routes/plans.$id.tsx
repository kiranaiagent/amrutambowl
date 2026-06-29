import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { MealImage } from "@/components/MealImage";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useSiteSettings } from "@/lib/settings";
import { SENSITIVE_TAGS, tagLabel } from "@/lib/tags";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { RotateCcw, Calendar as CalendarIcon, ChefHat, Info } from "lucide-react";
import { Input } from "@/components/ui/input";


export const Route = createFileRoute("/plans/$id")({
  component: PlanDetail,
  errorComponent: ({ error }) => <div className="p-8">Couldn't load plan: {error.message}</div>,
  notFoundComponent: () => <div className="p-8">Plan not found.</div>,
});

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOTS: Array<"breakfast" | "lunch" | "dinner"> = ["breakfast", "lunch", "dinner"];
const OVERRIDE_KEY = "ruchi.plan.overrides.v1";
const CYCLE_SUFFIX: Record<string, string> = {
  daily: "day", weekly: "week", biweekly: "2 wks", monthly: "month", custom_dates: "plan",
};
const cycleSuffix = (c: string) => CYCLE_SUFFIX[c] ?? c;

type Override = { day: number; slot: string; menu_item_id: string | null };

function PlanDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { data: settings } = useSiteSettings();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"standard" | "custom">("standard");
  const [overrides, setOverrides] = useState<Record<string, string | null>>({});
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10);
  });


  const planQ = useQuery({
    queryKey: ["plan", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const itemsQ = useQuery({
    queryKey: ["plan-items", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_items")
        .select("day_of_week, slot, menu_items(*)")
        .eq("plan_id", id);
      if (error) throw error;
      return data as any[];
    },
  });

  const menuQ = useQuery({
    queryKey: ["menu-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("menu_items").select("*").eq("status", "active").order("name");
      if (error) throw error;
      return data as any[];
    },
  });

  const stdGrid = useMemo(() => {
    const g: Record<string, any> = {};
    (itemsQ.data ?? []).forEach((r) => {
      const mi = r.menu_items;
      if (!mi || mi.status !== "active") return; // skip inactive/archived items
      g[`${r.day_of_week}-${r.slot}`] = mi;
    });
    return g;
  }, [itemsQ.data]);

  // Only render the days/slots this plan actually uses — no empty Lunch/Dinner columns.
  const usedSlots = useMemo(
    () => SLOTS.filter((s) => DAYS.some((_, i) => stdGrid[`${i + 1}-${s}`])),
    [stdGrid],
  );
  const usedDays = useMemo(
    () => DAYS.map((_, i) => i + 1).filter((dn) => usedSlots.some((s) => stdGrid[`${dn}-${s}`])),
    [stdGrid, usedSlots],
  );

  const getItem = (key: string) => {
    if (mode === "custom" && key in overrides) {
      const id = overrides[key];
      if (!id) return null; // skipped
      return menuQ.data?.find((m) => m.id === id) ?? null;
    }
    return stdGrid[key] ?? null;
  };

  const setCell = (day: number, slot: string, val: string) => {
    const key = `${day}-${slot}`;
    setOverrides((cur) => {
      const next = { ...cur };
      if (val === "__std") delete next[key];
      else if (val === "__skip") next[key] = null;
      else next[key] = val;
      return next;
    });
  };

  const subscribe = () => {
    if (mode === "custom" && Object.keys(overrides).length > 0) {
      const list: Override[] = Object.entries(overrides).map(([k, v]) => {
        const [d, s] = k.split("-");
        return { day: Number(d), slot: s, menu_item_id: v };
      });
      try { sessionStorage.setItem(OVERRIDE_KEY, JSON.stringify({ planId: id, overrides: list })); } catch {}
    } else {
      try { sessionStorage.removeItem(OVERRIDE_KEY); } catch {}
    }
    try { sessionStorage.setItem("amrutam.plan.start", JSON.stringify({ planId: id, startDate })); } catch {}
    if (!user) {
      toast.info("Sign in to continue to subscribe");
      navigate({ to: "/auth", search: { redirect: `/checkout?plan=${id}` } as any });
      return;
    }
    navigate({ to: "/checkout", search: { plan: id, start: startDate } as any });
  };

  const buildBowlFromPlan = () => {
    try {
      sessionStorage.setItem("amrutam.bowl.seedFromPlan", JSON.stringify({
        planId: id,
        billing_cycle: p?.billing_cycle,
        meals_per_day: p?.meals_per_day,
        days_per_week: p?.days_per_week,
        items: (itemsQ.data ?? []).map((r) => ({
          day_of_week: r.day_of_week, slot: r.slot, menu_item_id: r.menu_items?.id ?? null,
        })),
      }));
    } catch {}
    navigate({ to: "/bowl" });
  };

  const p = planQ.data;
  const customCount = Object.keys(overrides).length;

  // Unique menu items used in this plan, for the gallery grid.
  const galleryItems = useMemo(() => {
    const m = new Map<string, any>();
    (itemsQ.data ?? []).forEach((r) => { if (r.menu_items?.id) m.set(r.menu_items.id, r.menu_items); });
    return Array.from(m.values());
  }, [itemsQ.data]);




  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {!p ? <div className="text-muted-foreground">Loading…</div> : (
          <>
            <Link to="/plans" className="text-sm text-muted-foreground hover:text-foreground">← All Plans</Link>

            {/* Compact hero card */}
            <Card className="mt-3 overflow-hidden">
              <div className="grid md:grid-cols-[260px_1fr]">
                <MealImage path={p.image_url} alt={p.name} className="h-48 md:h-full w-full object-cover" />
                <div className="p-4 md:p-5 flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="capitalize">{p.goal_type.replace("-", " ")}</Badge>
                    <Badge variant="outline" className="capitalize">{p.billing_cycle}</Badge>
                    <Badge variant="secondary" className="text-xs">{p.meals_per_day} meal{p.meals_per_day === 1 ? "" : "s"}/day</Badge>
                    <Badge variant="secondary" className="text-xs">{p.days_per_week} day{p.days_per_week === 1 ? "" : "s"}/week</Badge>
                    {((p.tags ?? []) as string[]).map((t) => (
                      <Badge key={t} variant="outline" className="text-xs">{tagLabel(t)}</Badge>
                    ))}
                  </div>
                  <h1 className="font-display text-2xl md:text-3xl font-bold leading-tight">{p.name}</h1>
                  <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>

                  <div className="mt-1 flex items-end justify-between flex-wrap gap-3 pt-2 border-t">
                    <div className="font-display text-3xl leading-none">₹{Number(p.price_inr).toFixed(0)}
                      <span className="text-xs font-sans font-normal text-muted-foreground"> /{cycleSuffix(p.billing_cycle)}</span>
                    </div>
                    <div className="flex items-end gap-2 flex-wrap">
                      <div>
                        <label className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
                          <CalendarIcon className="h-3 w-3" /> Start date
                        </label>
                        <Input type="date" value={startDate} min={new Date().toISOString().slice(0,10)}
                          onChange={(e) => setStartDate(e.target.value)} className="h-9 w-[150px]" />
                      </div>
                      <Button size="lg" onClick={subscribe}>
                        Continue
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Health-claim disclaimer for condition-targeted plans */}
            {((p.tags ?? []) as string[]).some((t) => SENSITIVE_TAGS.includes(t)) && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-[var(--color-saffron)]/40 bg-[var(--color-saffron)]/10 p-3 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-saffron-foreground)]" />
                <span>{settings?.medical_disclaimer ?? "Designed to support a balanced lifestyle — not medical advice. Please consult your doctor."}</span>
              </div>
            )}

            {/* Build-a-Bowl from this plan CTA */}
            <div className="mt-4 flex items-center justify-between flex-wrap gap-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
              <div className="text-sm">
                <div className="font-semibold">Want to tweak this plan?</div>
                <div className="text-xs text-muted-foreground">Start from this plan's menu and customise every meal.</div>
              </div>
              <Button variant="outline" onClick={buildBowlFromPlan} className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                <ChefHat className="h-4 w-4 mr-1.5" /> Build My Own Bowl Using This Plan
              </Button>
            </div>

            {/* Gallery: meals inside this plan */}
            {galleryItems.length > 0 && (
              <section className="mt-6">
                <h2 className="font-display text-xl md:text-2xl font-bold">What's on the Plate</h2>
                <p className="text-xs text-muted-foreground">A taste of every dish included in this plan.</p>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {galleryItems.map((m: any) => (
                    <Card key={m.id} className="overflow-hidden">
                      <MealImage path={m.image_url} alt={m.name} className="aspect-square w-full object-cover" />
                      <div className="p-2">
                        <div className="flex items-start gap-1.5">
                          <span className={`mt-1 shrink-0 ${m.food_type === "veg" || m.food_type === "jain" ? "veg-dot" : "nonveg-dot"}`} aria-hidden />
                          <div className="min-w-0">
                            <div className="font-semibold text-xs leading-tight line-clamp-2">{m.name}</div>
                            <div className="text-[10px] text-muted-foreground capitalize mt-0.5">
                              {m.meal_type}{m.calories ? ` · ${m.calories} kcal` : ""}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Consolidated menu section with mode toggle */}

            <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-display text-xl md:text-2xl font-bold">Menu in This Plan</h2>
                <p className="text-xs text-muted-foreground">
                  {mode === "standard"
                    ? "Chef-curated schedule. Switch to Customise to swap or skip any meal."
                    : `Customising — ${customCount} change${customCount === 1 ? "" : "s"}.`}
                </p>
              </div>
              <div className="inline-flex rounded-lg border p-1 bg-card">
                <button
                  onClick={() => setMode("standard")}
                  className={`px-3 py-1.5 text-sm rounded-md ${mode === "standard" ? "bg-primary text-primary-foreground" : ""}`}
                >Standard</button>
                <button
                  onClick={() => setMode("custom")}
                  className={`px-3 py-1.5 text-sm rounded-md ${mode === "custom" ? "bg-primary text-primary-foreground" : ""}`}
                >Customise</button>
                {mode === "custom" && customCount > 0 && (
                  <button onClick={() => setOverrides({})} className="ml-1 px-2 py-1.5 text-xs text-muted-foreground inline-flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" /> Reset
                  </button>
                )}
              </div>
            </div>



            {usedDays.length === 0 ? (
              <Card className="mt-4 p-8 text-center text-muted-foreground">
                The weekly menu for this plan is being finalised. Subscribe now — our chef curates each delivery.
              </Card>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {usedDays.map((dn) => (
                  <Card key={dn} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="font-display text-lg leading-none">{DAYS[dn - 1]}</div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Day {dn}</div>
                    </div>
                    <div className="mt-3 space-y-3">
                      {usedSlots.map((s) => {
                        const key = `${dn}-${s}`;
                        const stdItem = stdGrid[key];
                        if (!stdItem) return null; // this day has no meal in this slot
                        const it = getItem(key);
                        const isOverride = mode === "custom" && key in overrides;
                        const macro = it && (it.calories > 0 || it.protein_g > 0)
                          ? [it.calories > 0 ? `${it.calories} kcal` : null, it.protein_g > 0 ? `${it.protein_g}g protein` : null].filter(Boolean).join(" · ")
                          : null;
                        return (
                          <div key={s} className="rounded-xl border bg-secondary/20 p-2.5">
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5 capitalize">{s}</div>
                            {mode === "standard" ? (
                              it ? (
                                <div className="flex items-center gap-2.5">
                                  <MealImage path={it.image_url} alt={it.name} className="h-12 w-12 rounded-lg object-cover shrink-0" />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className={it.food_type === "veg" || it.food_type === "jain" ? "veg-dot" : "nonveg-dot"} aria-hidden />
                                      <span className="font-medium text-sm leading-tight truncate">{it.name}</span>
                                    </div>
                                    {macro && <div className="text-[11px] text-muted-foreground mt-0.5">{macro}</div>}
                                  </div>
                                </div>
                              ) : <span className="text-sm text-muted-foreground">—</span>
                            ) : (
                              <div className="space-y-1.5">
                                <Select
                                  value={isOverride ? (overrides[key] ?? "__skip") : (stdItem?.id ?? "__skip")}
                                  onValueChange={(v) => setCell(dn, s, v)}
                                >
                                  <SelectTrigger className="h-9 bg-card"><SelectValue placeholder="—" /></SelectTrigger>
                                  <SelectContent>
                                    {stdItem && (
                                      <SelectItem value={stdItem.id}>
                                        {stdItem.food_type === "veg" || stdItem.food_type === "jain" ? "🟢 " : "🔴 "}{stdItem.name} (standard)
                                      </SelectItem>
                                    )}
                                    <SelectItem value="__skip">— Skip this meal —</SelectItem>
                                    {menuQ.data?.filter((m) => m.id !== stdItem?.id).map((m) => (
                                      <SelectItem key={m.id} value={m.id}>
                                        {m.food_type === "veg" || m.food_type === "jain" ? "🟢 " : "🔴 "}{m.name} · ₹{Number(m.price_inr).toFixed(0)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {it ? (
                                  <div className="text-[11px] text-muted-foreground pl-0.5">
                                    {macro ?? "Custom meal"}{isOverride && <span className="text-primary"> · modified</span>}
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-primary pl-0.5">Skipped</div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button size="lg" onClick={subscribe}>
                Continue to Subscribe
              </Button>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
