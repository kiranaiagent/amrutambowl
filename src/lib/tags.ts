import {
  Activity, Droplet, GraduationCap, Heart, Sparkles, Sprout, Briefcase, Baby,
  Leaf, Wheat, Salad, Flame, Dumbbell, Tag,
} from "lucide-react";

/** Friendly label + icon for known plan tags. Free-entry tags fall back to a humanised label. */
export const TAG_META: Record<string, { label: string; Icon: any }> = {
  "low-gi": { label: "Low GI", Icon: Activity },
  "diabetic-friendly": { label: "Diabetic-Friendly", Icon: Droplet },
  "student-tiffin": { label: "Student Tiffin", Icon: GraduationCap },
  "high-protein": { label: "High Protein", Icon: Dumbbell },
  "low-calorie": { label: "Low Calorie", Icon: Flame },
  "high-fibre": { label: "High Fibre", Icon: Wheat },
  "heart-healthy": { label: "Heart-Healthy", Icon: Heart },
  "pcos-friendly": { label: "PCOS-Friendly", Icon: Sparkles },
  "gut-health": { label: "Gut Health", Icon: Sprout },
  "office-lunch": { label: "Office Lunch", Icon: Briefcase },
  kids: { label: "Kids", Icon: Baby },
  vegan: { label: "Vegan", Icon: Leaf },
  millet: { label: "Millet", Icon: Wheat },
  sattvik: { label: "Sattvik", Icon: Salad },
};

export const humanizeTag = (t: string) =>
  t.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
export const tagLabel = (t: string) => TAG_META[t]?.label ?? humanizeTag(t);
export const tagIcon = (t: string) => TAG_META[t]?.Icon ?? Tag;

// Tags that carry a health claim and should trigger the medical disclaimer.
export const SENSITIVE_TAGS = ["low-gi", "diabetic-friendly", "pcos-friendly", "heart-healthy"];
