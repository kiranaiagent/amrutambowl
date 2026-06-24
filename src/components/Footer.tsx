import buildInfo from "@/build-info.json";

export function Footer() {
  const builtAt = buildInfo.builtAt ? new Date(buildInfo.builtAt) : null;
  const builtAtStr = builtAt && !isNaN(builtAt.getTime())
    ? builtAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";
  return (
    <footer className="mt-16 border-t bg-secondary/40">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-display text-base font-semibold text-foreground">Amrutam Bowl</div>
            <div>Personalized healthy food bowls, delivered daily across India.</div>
            <div className="mt-1 text-xs">Fresh, never frozen · Daily delivery · FSSAI certified</div>
          </div>
          <div className="space-y-1 md:text-right">
            <div>FSSAI License No.: <span className="font-medium text-foreground">12345678901234</span></div>
            <div>© {new Date().getFullYear()} Amrutam Bowl. All prices include 5% GST.</div>
            <div className="text-xs opacity-70">
              Build #{buildInfo.build} · {builtAtStr}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
