import { useEffect, useState } from "react";
import { signedMealUrl } from "@/lib/storage";
import { Salad } from "lucide-react";

export function MealImage({ path, alt, className }: { path?: string | null; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [errored, setErrored] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setErrored(false);
    signedMealUrl(path).then((u) => { if (!cancelled) setUrl(u); });
    return () => { cancelled = true; };
  }, [path]);

  // Graceful fallback — warm gradient + leaf — for missing or broken images.
  if (!url || errored) {
    return (
      <div
        className={`flex items-center justify-center ${className ?? ""}`}
        style={{ background: "linear-gradient(135deg, var(--color-secondary), var(--color-accent))" }}
        role="img"
        aria-label={alt}
      >
        <Salad className="h-8 w-8 text-primary/40" />
      </div>
    );
  }
  return <img src={url} alt={alt} className={className} loading="lazy" onError={() => setErrored(true)} />;
}
