import { Phone } from "lucide-react";
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
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105"
      >
        <svg viewBox="0 0 32 32" className="h-7 w-7" fill="currentColor" aria-hidden>
          <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.06 2.264v.114c-.015.99.472 1.977 1.017 2.78 1.23 1.82 2.506 3.41 4.554 4.34.616.287 2.035.888 2.722.888.817 0 2.15-.515 2.478-1.318.13-.31.18-.616.18-.946 0-.27-1.927-1.005-2.07-1.046zM16.225 1.875c-7.97 0-14.5 6.602-14.5 14.578a14.55 14.55 0 0 0 2.522 8.218l-1.736 5.115 5.349-1.706a14.54 14.54 0 0 0 8.336 2.612C24.196 30.692 30.725 24.09 30.725 16.45c0-3.892-1.516-7.555-4.27-10.31a14.48 14.48 0 0 0-10.23-4.265zm0 26.677a12.5 12.5 0 0 1-7.014-2.16l-.487-.31-3.176 1.01.96-3.06-.315-.504a12.06 12.06 0 0 1-1.862-6.47c0-6.74 5.5-12.22 12.22-12.22 3.27 0 6.34 1.276 8.652 3.586 2.31 2.31 3.586 5.38 3.586 8.652 0 6.722-5.5 12.22-12.22 12.22z"/>
        </svg>
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
