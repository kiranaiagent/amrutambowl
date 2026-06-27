import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { ShoppingBag, Salad, ChefHat } from "lucide-react";

const logoUrl = "/brand/amrutam-bowl.jpg";

const primaryBtn =
  "flex items-center justify-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/10 hover:shadow-sm sm:px-5";

export function SiteHeader() {
  const { user, isAdmin } = useAuth();
  const { count } = useCart();

  const accountLink = user ? (
    <Link to="/account" className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">Account</Link>
  ) : (
    <Link to="/auth" className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">Sign in</Link>
  );

  const cartLink = (
    <Link to="/cart" className="relative rounded-md p-2 hover:bg-secondary inline-flex items-center" aria-label="Cart">
      <ShoppingBag className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{count}</span>
      )}
    </Link>
  );

  return (
    <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-40">
      {/*
        Mobile: stacked rows -> 1) logo  2) account utilities  3) primary nav buttons
        Desktop: one tidy row  -> logo | primary nav | account utilities (right)
      */}
      <div className="mx-auto flex max-w-6xl flex-col gap-2.5 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
        {/* Logo + name */}
        <Link to="/" className="order-1 flex items-center gap-2 shrink-0" aria-label="Amrutam Bowl — home">
          <img src={logoUrl} alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-border" />
          <span className="font-display text-xl font-semibold tracking-tight text-primary">Amrutam Bowl</span>
        </Link>

        {/* Account utilities */}
        <div className="order-2 flex items-center justify-end gap-1 sm:order-3 sm:ml-auto">
          {user && isAdmin && (
            <Link to="/admin" className="rounded-md px-2.5 py-1.5 text-sm font-medium hover:bg-secondary whitespace-nowrap">Admin</Link>
          )}
          {cartLink}
          {accountLink}
        </div>

        {/* Primary destinations — always visible on every screen / flow */}
        <nav className="order-3 grid grid-cols-2 gap-2 sm:order-2 sm:flex sm:gap-2">
          <Link
            to="/plans"
            className={primaryBtn}
            activeProps={{ className: "!bg-primary !text-primary-foreground !border-primary shadow-sm" }}
          >
            <Salad className="h-4 w-4" /> Bowl Plans
          </Link>
          <Link
            to="/bowl"
            className={primaryBtn}
            activeProps={{ className: "!bg-primary !text-primary-foreground !border-primary shadow-sm" }}
          >
            <ChefHat className="h-4 w-4" /> Build My Own Bowl
          </Link>
        </nav>
      </div>
    </header>
  );
}
