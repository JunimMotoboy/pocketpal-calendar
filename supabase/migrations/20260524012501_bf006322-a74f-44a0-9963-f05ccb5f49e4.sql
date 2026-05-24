
CREATE TABLE public.card_installments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  description text NOT NULL,
  installment_value numeric NOT NULL,
  remaining_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.card_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own ci select" ON public.card_installments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own ci insert" ON public.card_installments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own ci update" ON public.card_installments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own ci delete" ON public.card_installments FOR DELETE USING (auth.uid() = user_id);
