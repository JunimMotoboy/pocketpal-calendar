CREATE TABLE public.fixed_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category expense_category NOT NULL DEFAULT 'outros',
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  notify_email TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  last_notified_for DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fixed_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own fixed select" ON public.fixed_expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own fixed insert" ON public.fixed_expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own fixed update" ON public.fixed_expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own fixed delete" ON public.fixed_expenses FOR DELETE USING (auth.uid() = user_id);