import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { ShoppingBag } from "lucide-react";
import bowlAsset from "@/assets/brand/amrutam-bowl.jpg.asset.json";

export function SiteHeader() {
  const { user, isAdmin } = useAuth();
  const { count } = useCart();
  return (
    <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <img src={bowlAsset.url} alt="" className="h-9 w-9 rounded-full object-cover" />
          <span className="font-display text-xl font-bold text-primary">Amrutam</span>
        </Link>
        <nav className="flex items-center gap-2 md:gap-3 text-sm">
          <Link to="/plans" className="rounded-md px-3 py-1.5 hover:bg-secondary">Plans</Link>
          <Link to="/bowl" className="rounded-md px-3 py-1.5 hover:bg-secondary">Build a Bowl</Link>
          <Link to="/cart" className="relative rounded-md px-3 py-1.5 hover:bg-secondary inline-flex items-center gap-1">
            <ShoppingBag className="h-4 w-4" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </Link>
          {user && isAdmin && (
            <Link to="/admin" className="hidden sm:inline rounded-md bg-secondary px-3 py-1.5 font-medium">
              Admin
            </Link>
          )}
          {user ? (
            <Link to="/account" className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground">Account</Link>
          ) : (
            <Link to="/auth" className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
