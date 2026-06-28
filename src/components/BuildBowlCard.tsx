import { Link } from "@tanstack/react-router";
import { CalendarDays, ClipboardList, UtensilsCrossed, ChefHat, ChevronRight } from "lucide-react";

const STEPS = [
  { t: "Set Your Schedule", d: "Cycle, days & delivery slot", Icon: CalendarDays },
  { t: "Pick a Plan", d: "Optional — gives you a head-start", Icon: ClipboardList },
  { t: "Choose Each Plate", d: "Add your dishes & portions", Icon: UtensilsCrossed },
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
          <li key={s.t} className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
            <div className="relative shrink-0">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                <s.Icon className="h-4.5 w-4.5" />
              </div>
              <span className="absolute -right-1.5 -top-1.5 grid h-4.5 w-4.5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-2 ring-card">{i + 1}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold leading-tight">{s.t}</div>
              <div className="truncate text-xs leading-tight text-muted-foreground">{s.d}</div>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
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
