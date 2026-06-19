import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { ChefHat, UtensilsCrossed, MapPin, ClipboardList, LogOut, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Dashboard", icon: ShieldCheck, exact: true },
  { to: "/admin/menu", label: "Menu Items", icon: UtensilsCrossed },
  { to: "/admin/plans", label: "Plans", icon: ChefHat },
  { to: "/admin/pincodes", label: "Pincodes", icon: MapPin },
  { to: "/admin/orders", label: "Orders", icon: ClipboardList },
];

function AdminLayout() {
  const { isAdmin, signOut, refreshRole, user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [claiming, setClaiming] = useState(false);

  const claim = async () => {
    setClaiming(true);
    const { data, error } = await supabase.rpc("claim_admin_if_none");
    setClaiming(false);
    if (error) return toast.error(error.message);
    if (data) { toast.success("You're now an admin!"); await refreshRole(); }
    else toast.error("An admin already exists. Ask them to add you.");
  };

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
        <h1 className="mt-4 font-display text-2xl font-bold">Admin access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You're signed in as <span className="font-medium">{user?.email}</span>. If you're the first admin, claim the role:
        </p>
        <Button onClick={claim} disabled={claiming} className="mt-4">
          {claiming ? "Claiming…" : "Claim admin role"}
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">Only works if no admin exists yet.</p>
      </div>
    );
  }

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
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap ${
                  active ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                }`}
              >
                <n.icon className="h-4 w-4" /> {n.label}
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
