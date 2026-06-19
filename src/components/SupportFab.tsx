import { Phone, MessageCircle } from "lucide-react";
import { useSiteSettings } from "@/lib/settings";

export function SupportFab() {
  const { data: settings } = useSiteSettings();

  const whatsapp = settings?.whatsapp_number ?? "919999999999";
  const phone = settings?.phone_number ?? "+919999999999";
  const prefill = encodeURIComponent(settings?.whatsapp_prefill ?? "Hi! I have a question about my meal subscription.");

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3">
      <a
        href={`https://wa.me/${whatsapp}?text=${prefill}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[oklch(0.6_0.18_145)] text-white shadow-lg transition hover:scale-105"
      >
        <MessageCircle className="h-6 w-6" />
      </a>
      <a
        href={`tel:${phone}`}
        aria-label="Call support"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105"
      >
        <Phone className="h-6 w-6" />
      </a>
    </div>
  );
}
