import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { Star, Gift, Sparkles, ArrowRight, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/rewards")({
  head: () => ({
    meta: [
      { title: "MyAmrutam Rewards — Amrutam Bowl" },
      { name: "description", content: "Save on every order — welcome offers, referral credits and loyalty perks for our regulars." },
    ],
  }),
  component: RewardsPage,
});

const OFFERS = [
  { code: "WELCOME10", title: "First-Order Welcome", desc: "10% off your first subscription or bowl.", perk: "New members" },
  { code: "REFER50", title: "Refer a Friend", desc: "₹50 credit for you + ₹50 for them, on their first order.", perk: "Everyone" },
  { code: "MONTHLY5", title: "Monthly Subscribers", desc: "Extra 5% off any monthly plan. Auto-applied at checkout.", perk: "Subscribers" },
];

function CopyChip({ code }: { code: string }) {
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => toast.success(`Copied ${code}`));
  };
  return (
    <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-full border-2 border-dashed border-primary/40 bg-primary/5 px-3 py-1.5 font-mono text-sm font-bold text-primary transition hover:bg-primary/10">
      <Copy className="h-3.5 w-3.5" /> {code}
    </button>
  );
}

function RewardsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
          <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-20 blur-3xl" style={{ background: "var(--color-saffron)" }} />
          <div className="relative mx-auto max-w-6xl px-4 py-12 md:py-16" style={{ color: "var(--color-primary-foreground)" }}>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] backdrop-blur">
              <Star className="h-3.5 w-3.5 fill-current" /> MyAmrutam Rewards
            </span>
            <h1 className="mt-3 font-display text-3xl md:text-5xl font-bold leading-tight">Eat well. Save more. Get spoiled.</h1>
            <p className="mt-3 max-w-xl text-sm md:text-base opacity-90">Every meal earns you love back. Copy a code below and apply at checkout — or share your invite and earn credit.</p>
          </div>
        </section>

        {/* Offers grid */}
        <section className="mx-auto max-w-6xl px-4 py-10">
          <div className="grid gap-4 md:grid-cols-3">
            {OFFERS.map((o) => (
              <div key={o.code} className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)]">
                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
                  <Sparkles className="h-3 w-3" /> {o.perk}
                </span>
                <h3 className="font-display text-xl font-bold">{o.title}</h3>
                <p className="text-sm text-muted-foreground">{o.desc}</p>
                <div className="mt-auto"><CopyChip code={o.code} /></div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-t bg-secondary/30 py-12">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <h2 className="font-display text-2xl md:text-3xl font-bold">How it works</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3 text-left">
              {[
                { n: 1, title: "Copy a code", desc: "Tap any code above to copy it to your clipboard." },
                { n: 2, title: "Apply at checkout", desc: "Paste into the promo field. Discount is calculated instantly." },
                { n: 3, title: "Enjoy your bowl", desc: "Your saving is applied to today's order — and every eligible one after." },
              ].map((s) => (
                <div key={s.n} className="rounded-2xl border bg-card p-5">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{s.n}</div>
                  <h3 className="mt-3 font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/plans" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:shadow-md">
                Explore Plans <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/bowl" className="inline-flex items-center gap-1.5 rounded-full border-2 border-primary px-6 py-3 text-sm font-semibold text-primary transition hover:bg-primary/5">
                <Gift className="h-4 w-4" /> Browse Menu
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
