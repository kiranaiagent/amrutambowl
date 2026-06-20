import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { UtensilsCrossed, ChefHat, MapPin, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

function Stat({ icon: Icon, label, value, to }: { icon: any; label: string; value: number | string; to: string }) {
  return (
    <Link to={to}>
      <Card className="p-5 hover:shadow-[var(--shadow-soft)] transition">
        <Icon className="h-6 w-6 text-primary" />
        <div className="mt-3 text-3xl font-bold font-display">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </Card>
    </Link>
  );
}

function Dashboard() {
  const counts = useQuery({
    queryKey: ["admin-counts"],
    queryFn: async () => {
      const [items, plans, pins, subs] = await Promise.all([
        supabase.from("menu_items").select("*", { count: "exact", head: true }),
        supabase.from("plans").select("*", { count: "exact", head: true }),
        supabase.from("serviceable_pincodes").select("*", { count: "exact", head: true }),
        supabase.from("subscriptions").select("*", { count: "exact", head: true }),
      ]);
      return { items: items.count ?? 0, plans: plans.count ?? 0, pins: pins.count ?? 0, subs: subs.count ?? 0 };
    },
  });
  const c = counts.data ?? { items: 0, plans: 0, pins: 0, subs: 0 };
  return (
    <div className="p-6 md:p-8">
      <h1 className="font-display text-3xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground">Build your catalog, then we'll wire customer checkout & Razorpay.</p>
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={UtensilsCrossed} label="Menu items" value={c.items} to="/admin/menu" />
        <Stat icon={ChefHat} label="Plans" value={c.plans} to="/admin/plans" />
        <Stat icon={MapPin} label="Serviceable pincodes" value={c.pins} to="/admin/pincodes" />
        <Stat icon={Users} label="Subscriptions" value={c.subs} to="/admin/subscriptions" />
      </div>
    </div>
  );
}
