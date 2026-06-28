import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChefHat, UtensilsCrossed, MapPin, ClipboardList, LogOut, ShieldCheck, Settings, Users, CalendarDays, Megaphone, Tag } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Dashboard", icon: ShieldCheck, exact: true },
  { to: "/admin/menu", label: "Menu Items", icon: UtensilsCrossed },
  { to: "/admin/plans", label: "Plans", icon: ChefHat },
  { to: "/admin/promos", label: "Promo Codes", icon: Tag },
  { to: "/admin/pincodes", label: "Pincodes", icon: MapPin },
  { to: "/admin/pincode-requests", label: "Expansion", icon: Megaphone },
  { to: "/admin/orders", label: "Orders", icon: ClipboardList },
  { to: "/admin/subscriptions", label: "Subscriptions", icon: CalendarDays },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

function AdminLayout() {
  const { isAdmin, signOut, user, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const pendingOrdersQ = useQuery({
    queryKey: ["admin-pending-orders-count"],
    enabled: isAdmin,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { count, error } = await supabase.from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "preparing")
        .is("accepted_at" as any, null);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const newRequestsQ = useQuery({
    queryKey: ["admin-pincode-requests-count"],
    enabled: isAdmin,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase.from("pincode_requests" as any)
        .select("id", { count: "exact", head: true }).eq("status", "new");
      if (error) throw error;
      return count ?? 0;
    },
  });

  if (loading) {
    return <div className="mx-auto max-w-md px-4 py-16 text-center text-muted-foreground">Loading…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 font-display text-2xl font-bold">Admin access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You're signed in as <span className="font-medium">{user?.email}</span>. This area is restricted to administrators. Please contact an existing admin to be granted access.
        </p>
        <Link to="/" className="mt-4 inline-block">
          <Button variant="secondary">Back to home</Button>
        </Link>
      </div>
    );
  }

  const badgeFor = (to: string) => {
    if (to === "/admin/orders" && pendingOrdersQ.data) return pendingOrdersQ.data;
    if (to === "/admin/pincode-requests" && newRequestsQ.data) return newRequestsQ.data;
    return null;
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="md:w-60 border-b md:border-b-0 md:border-r bg-card">
        <div className="p-4">
          <Link to="/" className="font-display text-xl font-bold text-primary">Amrutam</Link>
          <div className="text-xs text-muted-foreground">Admin Console</div>
        </div>
        <nav className="flex md:flex-col gap-1 px-2 overflow-x-auto md:overflow-visible pb-3">
          {NAV.map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            const badge = badgeFor(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap ${
                  active ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                }`}
              >
                <n.icon className="h-4 w-4" /> <span className="flex-1">{n.label}</span>
                {badge ? (
                  <Badge className={`text-[10px] h-5 px-1.5 ${active ? "bg-primary-foreground text-primary" : "bg-amber-500 text-white"}`}>{badge}</Badge>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="hidden md:block p-2 mt-auto">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 bg-background">
        <Outlet />
      </main>
    </div>
  );
}
