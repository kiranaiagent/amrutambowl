
-- ===== promo_codes =====
CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percent','flat')),
  discount_value numeric(10,2) NOT NULL CHECK (discount_value > 0),
  min_subtotal_inr numeric(10,2) NOT NULL DEFAULT 0,
  max_discount_inr numeric(10,2),
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  max_uses integer,
  uses integer NOT NULL DEFAULT 0,
  per_user_limit integer NOT NULL DEFAULT 1,
  applies_to text NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all','plan','bowl')),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.promo_codes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.promo_codes TO authenticated;
GRANT ALL ON public.promo_codes TO service_role;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active promo codes" ON public.promo_codes FOR SELECT
  TO anon, authenticated USING (is_active = true);
CREATE POLICY "Admins manage promo codes" ON public.promo_codes FOR ALL
  TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER promo_codes_updated_at BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== promo_redemptions =====
CREATE TABLE public.promo_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  discount_inr numeric(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.promo_redemptions TO authenticated;
GRANT ALL ON public.promo_redemptions TO service_role;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own redemptions" ON public.promo_redemptions FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users create own redemptions" ON public.promo_redemptions FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

-- ===== validate_promo() =====
CREATE OR REPLACE FUNCTION public.validate_promo(
  _code text, _user_id uuid, _subtotal numeric, _source text
) RETURNS TABLE(
  promo_id uuid, discount_inr numeric, reason text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE p public.promo_codes%ROWTYPE; uses_by_user int; calc numeric;
BEGIN
  SELECT * INTO p FROM public.promo_codes WHERE upper(code) = upper(_code) LIMIT 1;
  IF NOT FOUND THEN RETURN QUERY SELECT NULL::uuid, 0::numeric, 'Code not found'; RETURN; END IF;
  IF NOT p.is_active THEN RETURN QUERY SELECT p.id, 0::numeric, 'Code inactive'; RETURN; END IF;
  IF p.valid_from > now() THEN RETURN QUERY SELECT p.id, 0::numeric, 'Code not yet active'; RETURN; END IF;
  IF p.valid_to IS NOT NULL AND p.valid_to < now() THEN RETURN QUERY SELECT p.id, 0::numeric, 'Code expired'; RETURN; END IF;
  IF p.max_uses IS NOT NULL AND p.uses >= p.max_uses THEN RETURN QUERY SELECT p.id, 0::numeric, 'Code fully redeemed'; RETURN; END IF;
  IF p.applies_to <> 'all' AND p.applies_to <> _source THEN RETURN QUERY SELECT p.id, 0::numeric, 'Code not valid for this order type'; RETURN; END IF;
  IF _subtotal < p.min_subtotal_inr THEN RETURN QUERY SELECT p.id, 0::numeric, 'Min order ₹'||p.min_subtotal_inr||' required'; RETURN; END IF;
  SELECT COUNT(*) INTO uses_by_user FROM public.promo_redemptions WHERE promo_code_id = p.id AND user_id = _user_id;
  IF uses_by_user >= p.per_user_limit THEN RETURN QUERY SELECT p.id, 0::numeric, 'You have already used this code'; RETURN; END IF;
  IF p.discount_type = 'percent' THEN calc := round(_subtotal * p.discount_value / 100, 2);
  ELSE calc := p.discount_value; END IF;
  IF p.max_discount_inr IS NOT NULL AND calc > p.max_discount_inr THEN calc := p.max_discount_inr; END IF;
  IF calc > _subtotal THEN calc := _subtotal; END IF;
  RETURN QUERY SELECT p.id, calc, NULL::text;
END $$;

GRANT EXECUTE ON FUNCTION public.validate_promo(text,uuid,numeric,text) TO anon, authenticated;

-- ===== enforce caps & bump counter =====
CREATE OR REPLACE FUNCTION public.enforce_promo_redemption()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.promo_codes%ROWTYPE; used_by_user int;
BEGIN
  SELECT * INTO p FROM public.promo_codes WHERE id = NEW.promo_code_id FOR UPDATE;
  IF NOT FOUND OR NOT p.is_active THEN RAISE EXCEPTION 'Promo code unavailable'; END IF;
  IF p.max_uses IS NOT NULL AND p.uses >= p.max_uses THEN RAISE EXCEPTION 'Promo code fully redeemed'; END IF;
  SELECT COUNT(*) INTO used_by_user FROM public.promo_redemptions WHERE promo_code_id = p.id AND user_id = NEW.user_id;
  IF used_by_user >= p.per_user_limit THEN RAISE EXCEPTION 'Promo per-user limit reached'; END IF;
  UPDATE public.promo_codes SET uses = uses + 1 WHERE id = p.id;
  RETURN NEW;
END $$;

CREATE TRIGGER promo_redemption_enforce
BEFORE INSERT ON public.promo_redemptions
FOR EACH ROW EXECUTE FUNCTION public.enforce_promo_redemption();

-- Sample launch offer
INSERT INTO public.promo_codes (code, description, discount_type, discount_value, min_subtotal_inr, max_discount_inr, per_user_limit, applies_to)
VALUES ('WELCOME10', 'Welcome offer — 10% off your first order (up to ₹200).', 'percent', 10, 499, 200, 1, 'all')
ON CONFLICT (code) DO NOTHING;
