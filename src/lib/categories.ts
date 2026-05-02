import { Utensils, Receipt, Gamepad2, Car, Heart, GraduationCap, ShoppingBag, Home, Package } from "lucide-react";
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

export const formatBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
