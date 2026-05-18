ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS initial_used numeric NOT NULL DEFAULT 0;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS installments integer NOT NULL DEFAULT 1;