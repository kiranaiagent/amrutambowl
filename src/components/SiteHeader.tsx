import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { ShoppingBag, Menu, X } from "lucide-react";
import bowlAsset from "@/assets/brand/amrutam-bowl.jpg.asset.json";

export function SiteHeader() {
  const { user, isAdmin } = useAuth();
  const { count } = useCart();
  const [open, setOpen] = useState(false);

  const accountLink = user ? (
    <Link to="/account" onClick={() => setOpen(false)} className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground">Account</Link>
  ) : (
    <Link to="/auth" onClick={() => setOpen(false)} className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground">Sign in</Link>
  );

  const cartLink = (
    <Link to="/cart" onClick={() => setOpen(false)} className="relative rounded-md p-2 hover:bg-secondary inline-flex items-center" aria-label="Cart">
      <ShoppingBag className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{count}</span>
      )}
    </Link>
  );

  return (
    <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={bowlAsset.url} alt="" className="h-9 w-9 rounded-full object-cover" />
          <span className="font-display text-xl font-bold text-primary">Amrutam Bowl</span>
        </Link>

        {/* Desktop nav: cart then account; admin tucked here too */}
        <nav className="hidden md:flex items-center gap-2 text-sm">
          {user && isAdmin && (
            <Link to="/admin" className="rounded-md px-3 py-2 hover:bg-secondary font-medium">Admin</Link>
          )}
          {cartLink}
          {accountLink}
        </nav>

        {/* Mobile: cart, account, menu (only if admin) */}
        <div className="flex md:hidden items-center gap-1">
          {cartLink}
          {accountLink}
          {user && isAdmin && (
            <button
              type="button"
              aria-label="Menu"
              onClick={() => setOpen((v) => !v)}
              className="rounded-md p-2 hover:bg-secondary"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile dropdown (admin only) */}
      {open && user && isAdmin && (
        <div className="md:hidden border-t bg-background">
          <nav className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-1 text-sm">
            <Link to="/admin" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 hover:bg-secondary font-medium">Admin</Link>
          </nav>
        </div>
      )}

    </header>
  );
}
