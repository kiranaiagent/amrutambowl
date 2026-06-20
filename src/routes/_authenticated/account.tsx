import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/account")({
  component: Account,
});

function Account() {
  const { user, isAdmin, signOut } = useAuth();
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Card className="p-6">
        <h1 className="font-display text-2xl font-bold">My Account</h1>
        <p className="mt-2 text-sm text-muted-foreground">{user?.email}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/my-subscription"><Button>My Orders & Subscription</Button></Link>
          {isAdmin && (
            <Link to="/admin">
              <Button variant="secondary">Open Admin</Button>
            </Link>
          )}
          <Link to="/"><Button variant="secondary">Home</Button></Link>
          <Button variant="destructive" onClick={signOut}>Sign out</Button>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">Razorpay UPI Autopay & invoice downloads come next.</p>
      </Card>
    </div>
  );
}
