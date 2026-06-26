-- Widen plan_items.day_of_week to support daily(0), weekly(0-6), biweekly(0-13), monthly(0-31)
ALTER TABLE public.plan_items DROP CONSTRAINT IF EXISTS plan_items_day_of_week_check;
ALTER TABLE public.plan_items ADD CONSTRAINT plan_items_day_of_week_check CHECK (day_of_week >= 0 AND day_of_week <= 31);

-- Fix missing GRANTs on pincode_requests so admins/users can read/write
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pincode_requests TO authenticated;
GRANT SELECT, INSERT ON public.pincode_requests TO anon;
GRANT ALL ON public.pincode_requests TO service_role;