import { Link } from "@tanstack/react-router";
import { CalendarDays, ClipboardList, UtensilsCrossed, ChefHat } from "lucide-react";

const STEPS = [
  { t: "Set Your Schedule", d: "Daily, Weekly or Monthly", Icon: CalendarDays },
  { t: "Pick a Plan", d: "Optional Head-Start", Icon: ClipboardList },
  { t: "Choose Each Plate", d: "Your Dishes, Your Portions", Icon: UtensilsCrossed },
];

/** Shared "Build My Own Bowl" promo card — identical on home and plans pages. */
export function BuildBowlCard() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-secondary/20 p-4 sm:p-5">
      <div className="text-center sm:text-left">
        <h2 className="sr-only">Build My Own Bowl</h2>
        <p className="text-sm font-medium text-muted-foreground">Three easy steps to your perfect bowl.</p>
      </div>

      <ol className="mt-3 grid gap-2 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.t} className="flex items-center gap-2.5 rounded-xl border bg-card p-2.5 shadow-sm">
            <div className="relative shrink-0">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                <s.Icon className="h-4.5 w-4.5" />
              </div>
              <span className="absolute -right-1.5 -top-1.5 grid h-4.5 w-4.5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-2 ring-card">{i + 1}</span>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-tight">{s.t}</div>
              <div className="text-[11px] leading-tight text-muted-foreground">{s.d}</div>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-3 flex justify-center">
        <Link to="/bowl" className="w-full sm:w-auto">
          <span className="flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-semibold text-primary-foreground transition hover:shadow-md">
            <ChefHat className="h-4 w-4" /> Build My Own Bowl
          </span>
        </Link>
      </div>
    </div>
  );
}
