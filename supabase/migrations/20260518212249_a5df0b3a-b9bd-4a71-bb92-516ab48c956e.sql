
CREATE TABLE public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  limit_amount NUMERIC NOT NULL DEFAULT 0,
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  closing_day INTEGER CHECK (closing_day BETWEEN 1 AND 31),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own cards select" ON public.cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own cards insert" ON public.cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own cards update" ON public.cards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own cards delete" ON public.cards FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.expenses ADD COLUMN card_id UUID REFERENCES public.cards(id) ON DELETE SET NULL;
CREATE INDEX idx_expenses_card_id ON public.expenses(card_id);
