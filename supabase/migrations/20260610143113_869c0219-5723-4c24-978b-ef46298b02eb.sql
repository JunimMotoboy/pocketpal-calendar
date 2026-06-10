
CREATE TABLE public.category_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  monthly_limit NUMERIC(12,2) NOT NULL CHECK (monthly_limit >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, category)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_budgets TO authenticated;
GRANT ALL ON public.category_budgets TO service_role;

ALTER TABLE public.category_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own budgets"
  ON public.category_budgets FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own budgets"
  ON public.category_budgets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own budgets"
  ON public.category_budgets FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own budgets"
  ON public.category_budgets FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER set_category_budgets_updated_at
  BEFORE UPDATE ON public.category_budgets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
