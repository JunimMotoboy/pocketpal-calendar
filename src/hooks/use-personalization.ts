import { useCallback, useEffect, useState } from "react";

export type AccentPreset = "teal" | "violet" | "rose" | "emerald" | "amber" | "blue";
export type FontSize = "sm" | "md" | "lg" | "xl";

export interface Personalization {
  accent: AccentPreset;
  fontSize: FontSize;
  avatar: string | null; // data URL
  displayName: string;
}

const STORAGE_KEY = "nixwallet:personalization";

const DEFAULTS: Personalization = {
  accent: "teal",
  fontSize: "md",
  avatar: null,
  displayName: "",
};

export const ACCENTS: Record<
  AccentPreset,
  { label: string; primary: string; primaryGlow: string; ring: string; swatch: string }
> = {
  teal:    { label: "Teal",     primary: "oklch(0.5 0.12 195)",  primaryGlow: "oklch(0.7 0.14 190)",  ring: "oklch(0.5 0.12 195)",  swatch: "#0e8c8a" },
  violet:  { label: "Violeta",  primary: "oklch(0.55 0.2 290)",  primaryGlow: "oklch(0.72 0.18 295)", ring: "oklch(0.55 0.2 290)",  swatch: "#7c3aed" },
  rose:    { label: "Rosa",     primary: "oklch(0.6 0.21 5)",    primaryGlow: "oklch(0.75 0.18 10)",  ring: "oklch(0.6 0.21 5)",    swatch: "#e11d6b" },
  emerald: { label: "Esmeralda",primary: "oklch(0.58 0.16 155)", primaryGlow: "oklch(0.74 0.16 150)", ring: "oklch(0.58 0.16 155)", swatch: "#10b981" },
  amber:   { label: "Âmbar",    primary: "oklch(0.7 0.17 65)",   primaryGlow: "oklch(0.82 0.15 70)",  ring: "oklch(0.7 0.17 65)",   swatch: "#f59e0b" },
  blue:    { label: "Azul",     primary: "oklch(0.55 0.18 255)", primaryGlow: "oklch(0.72 0.16 250)", ring: "oklch(0.55 0.18 255)", swatch: "#2563eb" },
};

export const FONT_SIZES: Record<FontSize, { label: string; px: number }> = {
  sm: { label: "Pequena", px: 14 },
  md: { label: "Padrão",  px: 16 },
  lg: { label: "Grande",  px: 18 },
  xl: { label: "Enorme",  px: 20 },
};

function read(): Personalization {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function apply(p: Personalization) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const a = ACCENTS[p.accent];
  root.style.setProperty("--primary", a.primary);
  root.style.setProperty("--primary-glow", a.primaryGlow);
  root.style.setProperty("--ring", a.ring);
  root.style.setProperty(
    "--gradient-hero",
    `linear-gradient(135deg, ${a.primary} 0%, ${a.primaryGlow} 100%)`
  );
  root.style.fontSize = `${FONT_SIZES[p.fontSize].px}px`;
}

export function usePersonalization() {
  const [pers, setPers] = useState<Personalization>(read);

  useEffect(() => {
    apply(pers);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pers));
    } catch {}
    window.dispatchEvent(new CustomEvent("nixwallet:personalization", { detail: pers }));
  }, [pers]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setPers(read());
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<Personalization>).detail;
      if (detail) setPers(detail);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("nixwallet:personalization", onCustom as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("nixwallet:personalization", onCustom as EventListener);
    };
  }, []);

  const update = useCallback((patch: Partial<Personalization>) => {
    setPers((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => setPers(DEFAULTS), []);

  return { pers, update, reset };
}
