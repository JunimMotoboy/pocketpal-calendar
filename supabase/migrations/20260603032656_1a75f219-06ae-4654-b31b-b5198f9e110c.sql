ALTER TABLE public.card_installments
  ADD COLUMN IF NOT EXISTS start_month DATE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE)::date;