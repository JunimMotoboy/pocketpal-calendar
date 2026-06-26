// Lightweight credit card brand detection from card name / notes.
// We do NOT store card numbers — detection uses keywords only.

export type CardBrand =
  | "visa"
  | "mastercard"
  | "elo"
  | "amex"
  | "hipercard"
  | "nubank"
  | "itau"
  | "bradesco"
  | "santander"
  | "caixa"
  | "bb"
  | "inter"
  | "c6"
  | "outros";

export function detectCardBrand(...sources: (string | null | undefined)[]): CardBrand {
  const text = sources.filter(Boolean).join(" ").toLowerCase();
  if (!text) return "outros";
  if (/\bvisa\b/.test(text)) return "visa";
  if (/master(card)?/.test(text)) return "mastercard";
  if (/\belo\b/.test(text)) return "elo";
  if (/(amex|american express)/.test(text)) return "amex";
  if (/hipercard/.test(text)) return "hipercard";
  if (/nubank|\bnu\b/.test(text)) return "nubank";
  if (/ita[uú]/.test(text)) return "itau";
  if (/bradesco/.test(text)) return "bradesco";
  if (/santander/.test(text)) return "santander";
  if (/caixa/.test(text)) return "caixa";
  if (/\bbb\b|banco do brasil/.test(text)) return "bb";
  if (/inter\b/.test(text)) return "inter";
  if (/\bc6\b/.test(text)) return "c6";
  return "outros";
}

export const BRAND_LABEL: Record<CardBrand, string> = {
  visa: "VISA",
  mastercard: "Mastercard",
  elo: "Elo",
  amex: "Amex",
  hipercard: "Hipercard",
  nubank: "Nubank",
  itau: "Itaú",
  bradesco: "Bradesco",
  santander: "Santander",
  caixa: "Caixa",
  bb: "Banco do Brasil",
  inter: "Inter",
  c6: "C6",
  outros: "Cartão",
};

// Gradient (used as inline style backgroundImage) per brand.
export const BRAND_GRADIENT: Record<CardBrand, string> = {
  visa: "linear-gradient(135deg, #1a1f71 0%, #2a5fb4 100%)",
  mastercard: "linear-gradient(135deg, #1c1c1c 0%, #eb001b 70%, #f79e1b 100%)",
  elo: "linear-gradient(135deg, #000000 0%, #ffcb05 100%)",
  amex: "linear-gradient(135deg, #006fcf 0%, #00b2e3 100%)",
  hipercard: "linear-gradient(135deg, #7a1212 0%, #b22222 100%)",
  nubank: "linear-gradient(135deg, #4a0a78 0%, #820ad1 100%)",
  itau: "linear-gradient(135deg, #003399 0%, #ff7000 100%)",
  bradesco: "linear-gradient(135deg, #7a0019 0%, #cc092f 100%)",
  santander: "linear-gradient(135deg, #5b0303 0%, #ec0000 100%)",
  caixa: "linear-gradient(135deg, #003a70 0%, #f39200 100%)",
  bb: "linear-gradient(135deg, #003366 0%, #ffef38 100%)",
  inter: "linear-gradient(135deg, #4a0e7a 0%, #ff7a00 100%)",
  c6: "linear-gradient(135deg, #1a1a1a 0%, #3c3c3c 100%)",
  outros: "var(--gradient-hero)",
};
