
CREATE TABLE public.card_installment_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  installment_id UUID NOT NULL REFERENCES public.card_installments(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, installment_id, month_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.card_installment_payments TO authenticated;
GRANT ALL ON public.card_installment_payments TO service_role;

ALTER TABLE public.card_installment_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own installment payments" ON public.card_installment_payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own installment payments" ON public.card_installment_payments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own installment payments" ON public.card_installment_payments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own installment payments" ON public.card_installment_payments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_card_installment_payments_updated_at
  BEFORE UPDATE ON public.card_installment_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
