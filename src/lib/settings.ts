import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = {
  whatsapp_number: string;
  phone_number: string;
  whatsapp_prefill: string;
  medical_disclaimer: string;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  whatsapp_number: "919999999999",
  phone_number: "+919999999999",
  whatsapp_prefill: "Hi! I have a question about my meal subscription.",
  medical_disclaimer: "Designed to support a balanced lifestyle — not medical advice. Please consult your doctor.",
};

export async function fetchSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase.from("site_settings").select("key, value");
  if (error) throw error;
  const map = new Map(data?.map((s) => [s.key, s.value]) ?? []);
  return {
    whatsapp_number: (map.get("whatsapp_number") || DEFAULT_SETTINGS.whatsapp_number).replace(/\s/g, ""),
    phone_number: (map.get("phone_number") || DEFAULT_SETTINGS.phone_number).replace(/\s/g, ""),
    whatsapp_prefill: map.get("whatsapp_prefill") || DEFAULT_SETTINGS.whatsapp_prefill,
    medical_disclaimer: map.get("medical_disclaimer") || DEFAULT_SETTINGS.medical_disclaimer,
  };
}

export function useSiteSettings() {
  return useQuery({
    queryKey: ["site_settings"],
    queryFn: fetchSiteSettings,
    staleTime: 5 * 60 * 1000,
  });
}
