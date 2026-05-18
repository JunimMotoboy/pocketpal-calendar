import { Utensils, Receipt, Gamepad2, Car, Heart, GraduationCap, ShoppingBag, Home, Package,
  Banknote, CreditCard, Smartphone, FileText, ArrowLeftRight, Wallet,
  Briefcase, Laptop, Tag, Gift, RotateCcw, TrendingUp,
  LineChart, BarChart3, Bitcoin, PieChart, Landmark, PiggyBank, Building2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Category =
  | "comida" | "contas" | "diversao" | "transporte"
  | "saude" | "educacao" | "compras" | "moradia" | "outros";

export const CATEGORIES: { value: Category; label: string; icon: LucideIcon; color: string }[] = [
  { value: "comida", label: "Comida", icon: Utensils, color: "var(--cat-comida)" },
  { value: "contas", label: "Contas", icon: Receipt, color: "var(--cat-contas)" },
  { value: "diversao", label: "Diversão", icon: Gamepad2, color: "var(--cat-diversao)" },
  { value: "transporte", label: "Transporte", icon: Car, color: "var(--cat-transporte)" },
  { value: "saude", label: "Saúde", icon: Heart, color: "var(--cat-saude)" },
  { value: "educacao", label: "Educação", icon: GraduationCap, color: "var(--cat-educacao)" },
  { value: "compras", label: "Compras", icon: ShoppingBag, color: "var(--cat-compras)" },
  { value: "moradia", label: "Moradia", icon: Home, color: "var(--cat-moradia)" },
  { value: "outros", label: "Outros", icon: Package, color: "var(--cat-outros)" },
];

export const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.value, c])) as Record<Category, (typeof CATEGORIES)[number]>;

export type PaymentMethod = "dinheiro" | "debito" | "credito" | "pix" | "boleto" | "transferencia" | "outros";

export const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: LucideIcon }[] = [
  { value: "dinheiro", label: "Dinheiro", icon: Banknote },
  { value: "debito", label: "Débito", icon: CreditCard },
  { value: "credito", label: "Crédito", icon: CreditCard },
  { value: "pix", label: "Pix", icon: Smartphone },
  { value: "boleto", label: "Boleto", icon: FileText },
  { value: "transferencia", label: "Transferência", icon: ArrowLeftRight },
  { value: "outros", label: "Outros", icon: Wallet },
];
export const PAY_MAP = Object.fromEntries(PAYMENT_METHODS.map((p) => [p.value, p])) as Record<PaymentMethod, (typeof PAYMENT_METHODS)[number]>;

export type IncomeSource = "salario" | "freelance" | "vendas" | "presente" | "reembolso" | "rendimento" | "outros";

export const INCOME_SOURCES: { value: IncomeSource; label: string; icon: LucideIcon; color: string }[] = [
  { value: "salario", label: "Salário", icon: Briefcase, color: "oklch(0.65 0.16 155)" },
  { value: "freelance", label: "Freelance", icon: Laptop, color: "oklch(0.65 0.15 200)" },
  { value: "vendas", label: "Vendas", icon: Tag, color: "oklch(0.7 0.17 40)" },
  { value: "presente", label: "Presente", icon: Gift, color: "oklch(0.7 0.17 330)" },
  { value: "reembolso", label: "Reembolso", icon: RotateCcw, color: "oklch(0.65 0.15 230)" },
  { value: "rendimento", label: "Rendimento", icon: TrendingUp, color: "oklch(0.65 0.18 150)" },
  { value: "outros", label: "Outros", icon: Package, color: "oklch(0.6 0.02 220)" },
];
export const INC_MAP = Object.fromEntries(INCOME_SOURCES.map((i) => [i.value, i])) as Record<IncomeSource, (typeof INCOME_SOURCES)[number]>;

export type InvestmentType = "renda_fixa" | "renda_variavel" | "cripto" | "fundos" | "tesouro" | "poupanca" | "imoveis" | "outros";

export const INVESTMENT_TYPES: { value: InvestmentType; label: string; icon: LucideIcon; color: string }[] = [
  { value: "renda_fixa", label: "Renda Fixa", icon: LineChart, color: "oklch(0.55 0.18 280)" },
  { value: "renda_variavel", label: "Renda Variável", icon: BarChart3, color: "oklch(0.7 0.17 40)" },
  { value: "cripto", label: "Cripto", icon: Bitcoin, color: "oklch(0.75 0.16 75)" },
  { value: "fundos", label: "Fundos", icon: PieChart, color: "oklch(0.65 0.15 200)" },
  { value: "tesouro", label: "Tesouro", icon: Landmark, color: "oklch(0.65 0.18 150)" },
  { value: "poupanca", label: "Poupança", icon: PiggyBank, color: "oklch(0.7 0.17 330)" },
  { value: "imoveis", label: "Imóveis", icon: Building2, color: "oklch(0.55 0.1 250)" },
  { value: "outros", label: "Outros", icon: Package, color: "oklch(0.6 0.02 220)" },
];
export const INV_MAP = Object.fromEntries(INVESTMENT_TYPES.map((i) => [i.value, i])) as Record<InvestmentType, (typeof INVESTMENT_TYPES)[number]>;

export const formatBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
