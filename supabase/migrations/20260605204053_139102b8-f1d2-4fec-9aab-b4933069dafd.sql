CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.card_invoice_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, card_id, month_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.card_invoice_payments TO authenticated;
GRANT ALL ON public.card_invoice_payments TO service_role;

ALTER TABLE public.card_invoice_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own card invoice payments"
ON public.card_invoice_payments FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own card invoice payments"
ON public.card_invoice_payments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own card invoice payments"
ON public.card_invoice_payments FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own card invoice payments"
ON public.card_invoice_payments FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER trg_card_invoice_payments_updated_at
BEFORE UPDATE ON public.card_invoice_payments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();