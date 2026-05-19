
CREATE TABLE public.fixed_expense_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  fixed_expense_id UUID NOT NULL REFERENCES public.fixed_expenses(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  paid_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (fixed_expense_id, year, month)
);

ALTER TABLE public.fixed_expense_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own fxp select" ON public.fixed_expense_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own fxp insert" ON public.fixed_expense_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own fxp delete" ON public.fixed_expense_payments FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "own fxp update" ON public.fixed_expense_payments FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_fxp_user_month ON public.fixed_expense_payments(user_id, year, month);
