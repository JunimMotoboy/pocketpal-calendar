// Helpers for Brazilian Real input masking.
// formatBRLInput("123456") -> "1.234,56"  (treats input as cents)
// parseBRLInput("1.234,56") -> 1234.56

export function formatBRLInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  const reais = cents / 100;
  return reais.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseBRLInput(masked: string): number {
  if (!masked) return NaN;
  const digits = masked.replace(/\D/g, "");
  if (!digits) return NaN;
  return parseInt(digits, 10) / 100;
}
