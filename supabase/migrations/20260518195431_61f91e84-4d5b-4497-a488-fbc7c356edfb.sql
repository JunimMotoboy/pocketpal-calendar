
-- Payment method
CREATE TYPE public.payment_method AS ENUM ('dinheiro','debito','credito','pix','boleto','transferencia','outros');
ALTER TABLE public.expenses ADD COLUMN payment_method public.payment_method NOT NULL DEFAULT 'dinheiro';

-- Income source
CREATE TYPE public.income_source AS ENUM ('salario','freelance','vendas','presente','reembolso','rendimento','outros');

CREATE TABLE public.incomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  source public.income_source NOT NULL DEFAULT 'outros',
  received_on DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
CREATE INDEX incomes_user_date_idx ON public.incomes(user_id, received_on DESC);

CREATE POLICY "own incomes select" ON public.incomes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own incomes insert" ON public.incomes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own incomes update" ON public.incomes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own incomes delete" ON public.incomes FOR DELETE USING (auth.uid() = user_id);

-- Investments
CREATE TYPE public.investment_type AS ENUM ('renda_fixa','renda_variavel','cripto','fundos','tesouro','poupanca','imoveis','outros');

CREATE TABLE public.investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  type public.investment_type NOT NULL DEFAULT 'renda_fixa',
  invested_on DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_return NUMERIC(6,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
CREATE INDEX investments_user_date_idx ON public.investments(user_id, invested_on DESC);

CREATE POLICY "own investments select" ON public.investments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own investments insert" ON public.investments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own investments update" ON public.investments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own investments delete" ON public.investments FOR DELETE USING (auth.uid() = user_id);
