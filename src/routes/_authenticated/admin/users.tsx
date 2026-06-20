import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { ShieldCheck, ShieldOff } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersPage,
});

function UsersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const profilesQ = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, phone, pincode, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const rolesQ = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      return data ?? [];
    },
  });

  const rolesByUser = useMemo(() => {
    const m = new Map<string, string[]>();
    (rolesQ.data ?? []).forEach((r: any) => {
      const arr = m.get(r.user_id) ?? [];
      arr.push(r.role);
      m.set(r.user_id, arr);
    });
    return m;
  }, [rolesQ.data]);

  const grantAdmin = useMutation({
    mutationFn: async (uid: string) => {
      const { error } = await supabase.from("user_roles").insert({ user_id: uid, role: "admin" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-roles"] }); toast.success("Admin role granted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const revokeAdmin = useMutation({
    mutationFn: async (uid: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", "admin");
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-roles"] }); toast.success("Admin role revoked"); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (profilesQ.data ?? []).filter((p: any) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (p.name ?? "").toLowerCase().includes(s) || (p.email ?? "").toLowerCase().includes(s) || (p.phone ?? "").includes(s);
  });

  const admins = filtered.filter((p: any) => rolesByUser.get(p.id)?.includes("admin"));
  const customers = filtered.filter((p: any) => !rolesByUser.get(p.id)?.includes("admin"));

  const renderRow = (p: any) => {
    const isSelf = p.id === user?.id;
    const isAdminUser = rolesByUser.get(p.id)?.includes("admin");
    return (
      <div key={p.id} className="flex items-center justify-between gap-3 py-3 border-b last:border-b-0">
        <div className="min-w-0">
          <div className="font-medium truncate">{p.name || "—"} {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}</div>
          <div className="text-xs text-muted-foreground truncate">{p.email} · {p.phone || "no phone"} · {p.pincode || "—"}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isAdminUser ? <Badge>Admin</Badge> : <Badge variant="secondary">Customer</Badge>}
          {!isSelf && (
            isAdminUser ? (
              <Button size="sm" variant="outline" onClick={() => confirm(`Revoke admin from ${p.email}?`) && revokeAdmin.mutate(p.id)}>
                <ShieldOff className="h-4 w-4 mr-1" /> Revoke
              </Button>
            ) : (
              <Button size="sm" onClick={() => grantAdmin.mutate(p.id)}>
                <ShieldCheck className="h-4 w-4 mr-1" /> Make admin
              </Button>
            )
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="font-display text-2xl font-bold">Users</h1>
      <p className="text-sm text-muted-foreground mt-1">Manage user roles. Only existing admins can grant or revoke admin access.</p>

      <Input className="mt-4 max-w-sm" placeholder="Search name, email, phone…" value={q} onChange={(e) => setQ(e.target.value)} />

      {(profilesQ.isLoading || rolesQ.isLoading) && <p className="mt-4 text-muted-foreground">Loading…</p>}

      <Card className="mt-6 p-4">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Admins ({admins.length})</h2>
        <div className="mt-2">
          {admins.length === 0 ? <p className="text-sm text-muted-foreground py-2">No admins.</p> : admins.map(renderRow)}
        </div>
      </Card>

      <Card className="mt-4 p-4">
        <h2 className="font-display text-lg font-semibold">Customers ({customers.length})</h2>
        <div className="mt-2">
          {customers.length === 0 ? <p className="text-sm text-muted-foreground py-2">No users.</p> : customers.map(renderRow)}
        </div>
      </Card>
    </div>
  );
}
