import { useEffect, useState } from "react";
import { signedMealUrl } from "@/lib/storage";
import { ImageIcon } from "lucide-react";

export function MealImage({ path, alt, className }: { path?: string | null; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    signedMealUrl(path).then((u) => { if (!cancelled) setUrl(u); });
    return () => { cancelled = true; };
  }, [path]);
  if (!url) {
    return (
      <div className={`flex items-center justify-center bg-muted text-muted-foreground ${className ?? ""}`}>
        <ImageIcon className="h-6 w-6 opacity-50" />
      </div>
    );
  }
  return <img src={url} alt={alt} className={className} loading="lazy" />;
}
