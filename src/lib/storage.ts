import { supabase } from "@/integrations/supabase/client";

export const MEAL_BUCKET = "meal-images";

/** Returns a 1-hour signed URL for a stored path. Pass through full http(s) URLs unchanged. */
export async function signedMealUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = await supabase.storage.from(MEAL_BUCKET).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export async function uploadMealImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(MEAL_BUCKET).upload(path, file, {
    cacheControl: "3600", upsert: false,
  });
  if (error) throw error;
  return path;
}
