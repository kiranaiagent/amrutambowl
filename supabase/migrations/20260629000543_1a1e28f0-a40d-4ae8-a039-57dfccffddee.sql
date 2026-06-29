ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS plans_tags_idx ON public.plans USING gin (tags);

ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS glycemic_index int;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS sodium_mg numeric;

INSERT INTO public.site_settings (key, value)
VALUES ('medical_disclaimer', 'Designed to support a balanced lifestyle — not medical advice. Please consult your doctor.')
ON CONFLICT (key) DO NOTHING;