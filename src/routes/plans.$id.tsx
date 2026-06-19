import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { MealImage } from "@/components/MealImage";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/plans/$id")({
  component: PlanDetail,
  errorComponent: ({ error }) => <div className="p-8">Couldn't load plan: {error.message}</div>,
  notFoundComponent: () => <div className="p-8">Plan not found.</div>,
});

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOTS: Array<"breakfast" | "lunch" | "dinner"> = ["breakfast", "lunch", "dinner"];

function PlanDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

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

  const subscribe = async () => {
    if (!user) {
      toast.info("Please sign in to subscribe");
      navigate({ to: "/auth", search: { redirect: `/checkout?plan=${id}` } as any });
      return;
    }
    navigate({ to: "/checkout", search: { plan: id } as any });
  };

  const p = planQ.data;
  const grid: Record<string, any> = {};
  (itemsQ.data ?? []).forEach((r) => { grid[`${r.day_of_week}-${r.slot}`] = r.menu_items; });

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {!p ? <div className="text-muted-foreground">Loading…</div> : (
          <>
            <Link to="/plans" className="text-sm text-muted-foreground hover:text-foreground">← All plans</Link>
            <div className="mt-3 grid gap-6 md:grid-cols-2">
              <MealImage path={p.image_url} alt={p.name} className="aspect-[4/3] w-full rounded-2xl object-cover" />
              <Card className="p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="capitalize">{p.goal_type.replace("-", " ")}</Badge>
                  <Badge variant="outline">{p.billing_cycle}</Badge>
                </div>
                <h1 className="mt-2 font-display text-3xl font-bold">{p.name}</h1>
                <p className="mt-2 text-muted-foreground">{p.description}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Meals/day:</span> {p.meals_per_day}</div>
                  <div><span className="text-muted-foreground">Days/week:</span> {p.days_per_week}</div>
                </div>
                <div className="mt-6 flex items-end justify-between">
                  <div className="text-3xl font-bold">₹{Number(p.price_inr).toFixed(0)}<span className="text-sm font-normal text-muted-foreground">/{p.billing_cycle === "weekly" ? "week" : "month"}</span></div>
                  <Button size="lg" onClick={subscribe}>Subscribe</Button>
                </div>
              </Card>
            </div>

            <h2 className="mt-10 font-display text-2xl font-bold">This week's menu</h2>
            <p className="text-sm text-muted-foreground">You can swap any meal after subscribing.</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="p-2">Day</th>
                    {SLOTS.map((s) => <th key={s} className="p-2 capitalize">{s}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((d, i) => (
                    <tr key={d} className="border-b last:border-0">
                      <td className="p-2 font-medium">{d}</td>
                      {SLOTS.map((s) => {
                        const it = grid[`${i + 1}-${s}`];
                        return (
                          <td key={s} className="p-2">
                            {it ? (
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
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
