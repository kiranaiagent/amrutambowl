import { Phone, MessageCircle } from "lucide-react";

const WHATSAPP_NUMBER = "919999999999"; // E.164 without +
const PHONE_NUMBER = "+919999999999";
const PREFILL = encodeURIComponent("Hi! I have a question about my meal subscription.");

export function SupportFab() {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3">
      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}?text=${PREFILL}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[oklch(0.6_0.18_145)] text-white shadow-lg transition hover:scale-105"
      >
        <MessageCircle className="h-6 w-6" />
      </a>
      <a
        href={`tel:${PHONE_NUMBER}`}
        aria-label="Call support"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105"
      >
        <Phone className="h-6 w-6" />
      </a>
    </div>
  );
}
