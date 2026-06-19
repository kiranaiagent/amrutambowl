import { createFileRoute, Link } from "@tanstack/react-router";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/lib/auth";
import { Leaf, Dumbbell, Flame, Heart } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FitTiffin — Healthy Meal Subscriptions in India" },
      { name: "description", content: "Chef-crafted, macro-balanced meal plans delivered daily — weight loss, muscle gain, balanced and keto." },
    ],
  }),
  component: Home,
});

function Home() {
  const { user, isAdmin } = useAuth();
  return (
    <div className="min-h-screen">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-display text-xl font-bold text-primary">FitTiffin</Link>
          <nav className="flex items-center gap-3 text-sm">
            {isAdmin && <Link to="/admin" className="rounded-md bg-secondary px-3 py-1.5 font-medium">Admin</Link>}
            {user ? (
              <Link to="/account" className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground">My Account</Link>
            ) : (
              <Link to="/auth" className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground">Sign in</Link>
            )}
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24 text-primary-foreground">
          <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight max-w-2xl">
            Eat clean. Hit your macros. Skip the cooking.
          </h1>
          <p className="mt-4 max-w-xl text-lg opacity-90">
            Chef-crafted meal subscriptions delivered fresh to your door. Plans for weight loss, muscle gain, balanced and keto — veg & non-veg.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth" className="rounded-full bg-background px-6 py-3 font-semibold text-primary shadow-lg hover:scale-[1.02] transition">Browse Plans</Link>
            <a href="#how" className="rounded-full border border-primary-foreground/40 px-6 py-3 font-semibold">How it works</a>
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-3xl font-bold text-center">Goals we cook for</h2>
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { i: Flame, l: "Weight Loss", d: "Calorie-deficit, high fiber" },
            { i: Dumbbell, l: "Muscle Gain", d: "High-protein, lean carbs" },
            { i: Heart, l: "Balanced", d: "Everyday nutrition" },
            { i: Leaf, l: "Keto", d: "Low-carb, high-fat" },
          ].map(({ i: Icon, l, d }) => (
            <div key={l} className="rounded-2xl bg-card p-6 shadow-[var(--shadow-card)] border">
              <Icon className="h-8 w-8 text-primary" />
              <div className="mt-3 font-semibold">{l}</div>
              <div className="text-sm text-muted-foreground">{d}</div>
            </div>
          ))}
        </div>
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Customer browsing, plan customizer, pincode check and Razorpay checkout coming next.
        </p>
      </section>

      <Footer />
    </div>
  );
}
