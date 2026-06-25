
-- 1) Pincode requests (when customer enters unserviced pincode at checkout)
CREATE TABLE IF NOT EXISTS public.pincode_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pincode text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text,
  phone text,
  notes text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewed','planned','served','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.pincode_requests TO authenticated;
GRANT INSERT ON public.pincode_requests TO anon;
GRANT ALL ON public.pincode_requests TO service_role;
ALTER TABLE public.pincode_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can submit pincode requests" ON public.pincode_requests;
CREATE POLICY "Anyone can submit pincode requests" ON public.pincode_requests
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Admins manage pincode requests" ON public.pincode_requests;
CREATE POLICY "Admins manage pincode requests" ON public.pincode_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
DROP TRIGGER IF EXISTS trg_pincode_requests_updated ON public.pincode_requests;
CREATE TRIGGER trg_pincode_requests_updated
  BEFORE UPDATE ON public.pincode_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Order/subscription tracking columns
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS out_for_delivery_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS preferred_time text;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS preferred_time text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'plan' CHECK (source IN ('plan','bowl'));

-- 3) Popular flag on plans
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS is_popular boolean NOT NULL DEFAULT false;

-- 4) Auto-stamp tracking timestamps on order status change
CREATE OR REPLACE FUNCTION public.stamp_order_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'out_for_delivery' AND NEW.out_for_delivery_at IS NULL THEN
      NEW.out_for_delivery_at := now();
    END IF;
    IF NEW.status = 'delivered' AND NEW.delivered_at IS NULL THEN
      NEW.delivered_at := now();
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_stamp_order_status ON public.orders;
CREATE TRIGGER trg_stamp_order_status
  BEFORE INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.stamp_order_status();
