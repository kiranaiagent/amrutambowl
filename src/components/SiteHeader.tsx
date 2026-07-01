import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { ShoppingBag, ChefHat, Menu as MenuIcon, X } from "lucide-react";
import { useState } from "react";

const logoUrl = "/brand/amrutam-bowl.jpg";

/** Primary nav destinations — always reachable across every flow. */
const NAV: { to: string; label: string; hash?: string; exact?: boolean }[] = [
  { to: "/", label: "Home", exact: true },
  { to: "/plans", label: "Bowl Plans" },
  { to: "/", label: "Menu", hash: "menu" },
  { to: "/", label: "Contact", hash: "contact" },
];

const linkBase =
  "rounded-full px-3.5 py-2 text-sm font-medium text-foreground/70 transition hover:bg-secondary hover:text-foreground";
const linkActive = "!bg-primary !text-primary-foreground";

export function SiteHeader() {
  const { user, isAdmin } = useAuth();
  const { count } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);

  const cartLink = (
    <Link to="/cart" className="relative inline-flex items-center rounded-full p-2 hover:bg-secondary" aria-label="Cart">
      <ShoppingBag className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{count}</span>
      )}
    </Link>
  );

  const accountLink = user ? (
    <Link to="/account" className="rounded-full px-3.5 py-2 text-sm font-medium text-foreground/70 transition hover:bg-secondary hover:text-foreground">Account</Link>
  ) : (
    <Link to="/auth" className="rounded-full px-3.5 py-2 text-sm font-medium text-foreground/70 transition hover:bg-secondary hover:text-foreground">Sign in</Link>
  );

  const buildCta = (
    <Link
      to="/bowl"
      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      activeProps={{ className: "ring-2 ring-primary/40" }}
    >
      <ChefHat className="h-4 w-4" /> Build My Own Bowl
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b bg-background/75 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        {/* Logo + name */}
        <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="Amrutam Bowl — home" onClick={() => setMobileOpen(false)}>
          <img src={logoUrl} alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-border" />
          <span className="font-display text-xl font-semibold tracking-tight text-primary">Amrutam Bowl</span>
        </Link>

        {/* Desktop nav (centered) */}
        <nav className="mx-auto hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.label}
              to={n.to}
              hash={n.hash}
              className={linkBase}
              activeOptions={{ exact: n.exact ?? false, includeHash: true }}
              activeProps={{ className: linkActive }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Desktop utilities (right) */}
        <div className="ml-auto hidden items-center gap-1 md:flex">
          {user && isAdmin && (
            <Link to="/admin" className="rounded-full px-3 py-2 text-sm font-medium text-foreground/70 transition hover:bg-secondary hover:text-foreground">Admin</Link>
          )}
          {accountLink}
          {cartLink}
          {buildCta}
        </div>

        {/* Mobile: cart + hamburger */}
        <div className="ml-auto flex items-center gap-1 md:hidden">
          {cartLink}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="inline-flex items-center rounded-full p-2 hover:bg-secondary"
            aria-label="Menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown panel */}
      {mobileOpen && (
        <div className="border-t bg-background md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {NAV.map((n) => (
              <Link
                key={n.label}
                to={n.to}
                hash={n.hash}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 transition hover:bg-secondary"
                activeOptions={{ exact: n.exact ?? false, includeHash: true }}
                activeProps={{ className: "!bg-primary !text-primary-foreground" }}
              >
                {n.label}
              </Link>
            ))}
            <div className="mt-1 flex items-center gap-2 border-t pt-3">
              {user && isAdmin && (
                <Link to="/admin" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-secondary">Admin</Link>
              )}
              <Link to={user ? "/account" : "/auth"} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-secondary">
                {user ? "Account" : "Sign in"}
              </Link>
            </div>
            <Link
              to="/bowl"
              onClick={() => setMobileOpen(false)}
              className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
            >
              <ChefHat className="h-4 w-4" /> Build My Own Bowl
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
