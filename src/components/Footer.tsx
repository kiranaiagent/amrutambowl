export function Footer() {
  return (
    <footer className="mt-16 border-t bg-secondary/40">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-display text-base font-semibold text-foreground">FitTiffin</div>
            <div>Healthy meals, delivered daily across India.</div>
          </div>
          <div className="space-y-1 md:text-right">
            <div>FSSAI License No.: <span className="font-medium text-foreground">12345678901234</span></div>
            <div>© {new Date().getFullYear()} FitTiffin. All prices include 5% GST.</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
