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
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { ArrowRight, RotateCcw, Calendar as CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";


export const Route = createFileRoute("/plans/$id")({
  component: PlanDetail,
  errorComponent: ({ error }) => <div className="p-8">Couldn't load plan: {error.message}</div>,
  notFoundComponent: () => <div className="p-8">Plan not found.</div>,
});

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOTS: Array<"breakfast" | "lunch" | "dinner"> = ["breakfast", "lunch", "dinner"];
const OVERRIDE_KEY = "ruchi.plan.overrides.v1";

type Override = { day: number; slot: string; menu_item_id: string | null };

function PlanDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
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

  const p = planQ.data;
  const customCount = Object.keys(overrides).length;


  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {!p ? <div className="text-muted-foreground">Loading…</div> : (
          <>
            <Link to="/plans" className="text-sm text-muted-foreground hover:text-foreground">← All plans</Link>

            {/* Compact hero card */}
            <Card className="mt-3 overflow-hidden">
              <div className="grid md:grid-cols-[260px_1fr]">
                <MealImage path={p.image_url} alt={p.name} className="h-48 md:h-full w-full object-cover" />
                <div className="p-4 md:p-5 flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="capitalize">{p.goal_type.replace("-", " ")}</Badge>
                    <Badge variant="outline" className="capitalize">{p.billing_cycle}</Badge>
                    <Badge variant="secondary" className="text-xs">{p.meals_per_day} meals/day</Badge>
                    <Badge variant="secondary" className="text-xs">{p.days_per_week} days/week</Badge>
                  </div>
                  <h1 className="font-display text-2xl md:text-3xl font-bold leading-tight">{p.name}</h1>
                  <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>

                  <div className="mt-1 flex items-end justify-between flex-wrap gap-3 pt-2 border-t">
                    <div className="text-3xl font-bold leading-none">₹{Number(p.price_inr).toFixed(0)}
                      <span className="text-xs font-normal text-muted-foreground"> /{p.billing_cycle}</span>
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
                        Continue <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Consolidated menu section with mode toggle */}
            <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-display text-xl md:text-2xl font-bold">Menu in this plan</h2>
                <p className="text-xs text-muted-foreground">
                  {mode === "standard"
                    ? "Chef-curated schedule. Switch to Customize to swap or skip any meal."
                    : `Customizing — ${customCount} change${customCount === 1 ? "" : "s"}.`}
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
                >Customize</button>
                {mode === "custom" && customCount > 0 && (
                  <button onClick={() => setOverrides({})} className="ml-1 px-2 py-1.5 text-xs text-muted-foreground inline-flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" /> Reset
                  </button>
                )}
              </div>
            </div>



            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="p-2 w-20">Day</th>
                    {SLOTS.map((s) => <th key={s} className="p-2 capitalize">{s}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((d, i) => (
                    <tr key={d} className="border-b last:border-0 align-top">
                      <td className="p-2 font-medium pt-3">{d}</td>
                      {SLOTS.map((s) => {
                        const key = `${i + 1}-${s}`;
                        const it = getItem(key);
                        const isOverride = mode === "custom" && key in overrides;
                        const stdItem = stdGrid[key];
                        return (
                          <td key={s} className="p-2">
                            {mode === "standard" ? (
                              it ? (
                                <div className="flex items-center gap-2">
                                  <MealImage path={it.image_url} alt={it.name} className="h-10 w-10 rounded-md object-cover" />
                                  <div>
                                    <div className="flex items-center gap-1">
                                      <span className={it.food_type === "veg" || it.food_type === "jain" ? "veg-dot" : "nonveg-dot"} aria-hidden />
                                      <span className="font-medium">{it.name}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">{it.calories} kcal · {it.protein_g}g P</div>
                                  </div>
                                </div>
                              ) : <span className="text-muted-foreground">—</span>
                            ) : (
                              <div className="space-y-1">
                                <Select
                                  value={isOverride ? (overrides[key] ?? "__skip") : (stdItem?.id ?? "__skip")}
                                  onValueChange={(v) => setCell(i + 1, s, v)}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="—" />
                                  </SelectTrigger>
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
                                {it && (
                                  <div className="text-[11px] text-muted-foreground pl-1">
                                    {it.calories} kcal · {it.protein_g}g P {isOverride && <span className="text-primary">· modified</span>}
                                  </div>
                                )}
                                {!it && isOverride && (
                                  <div className="text-[11px] text-primary pl-1">Skipped</div>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <Button size="lg" onClick={subscribe}>
                Continue to subscribe <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
