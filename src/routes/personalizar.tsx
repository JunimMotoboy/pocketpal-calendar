import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Camera, RotateCcw, Check, Palette, Type, User } from "lucide-react";
import {
  ACCENTS,
  FONT_SIZES,
  usePersonalization,
  type AccentPreset,
  type FontSize,
} from "@/hooks/use-personalization";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/personalizar")({
  head: () => ({ meta: [{ title: "Personalizar — Nix Wallet" }] }),
  component: PersonalizarPage,
});

function PersonalizarPage() {
  const { pers, update, reset } = usePersonalization();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const initials = (pers.displayName || "U")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 2MB).");
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      // Downscale to ~256px square via canvas
      const img = new Image();
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          update({ avatar: String(reader.result) });
          setUploading(false);
          return;
        }
        const ratio = Math.max(size / img.width, size / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        update({ avatar: canvas.toDataURL("image/jpeg", 0.85) });
        setUploading(false);
        toast.success("Foto atualizada!");
      };
      img.onerror = () => {
        setUploading(false);
        toast.error("Erro ao processar imagem.");
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Personalizar</h1>
        <p className="text-sm text-muted-foreground">
          Ajuste cores, foto e tamanho da fonte do seu Nix Wallet.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" /> Perfil
          </CardTitle>
          <CardDescription>Sua foto e nome de exibição.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="flex flex-col items-center gap-2">
            <Avatar className="h-24 w-24 ring-2 ring-primary/30">
              {pers.avatar ? <AvatarImage src={pers.avatar} alt="Foto de perfil" /> : null}
              <AvatarFallback
                className="text-2xl text-primary-foreground"
                style={{ backgroundImage: "var(--gradient-hero)" }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                <Camera className="h-4 w-4 mr-1" />
                {pers.avatar ? "Trocar" : "Enviar"}
              </Button>
              {pers.avatar && (
                <Button size="sm" variant="ghost" onClick={() => update({ avatar: null })}>
                  Remover
                </Button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </div>
          <div className="flex-1 w-full space-y-2">
            <Label htmlFor="displayName">Nome de exibição</Label>
            <Input
              id="displayName"
              placeholder="Como devemos te chamar?"
              value={pers.displayName}
              onChange={(e) => update({ displayName: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Usado nas saudações e iniciais do avatar.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4" /> Cor de destaque
          </CardTitle>
          <CardDescription>Define a cor primária dos botões e gráficos.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {(Object.keys(ACCENTS) as AccentPreset[]).map((key) => {
              const a = ACCENTS[key];
              const active = pers.accent === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => update({ accent: key })}
                  className={cn(
                    "group flex flex-col items-center gap-2 rounded-xl border p-3 transition-all",
                    active
                      ? "border-primary ring-2 ring-primary/40 bg-primary/5"
                      : "border-border hover:border-primary/40"
                  )}
                  aria-pressed={active}
                  aria-label={a.label}
                >
                  <span
                    className="relative h-10 w-10 rounded-full shadow-inner"
                    style={{ backgroundColor: a.swatch }}
                  >
                    {active && (
                      <Check className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow" />
                    )}
                  </span>
                  <span className="text-xs font-medium">{a.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Type className="h-4 w-4" /> Tamanho da fonte
          </CardTitle>
          <CardDescription>Afeta o tamanho do texto em todo o app.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(Object.keys(FONT_SIZES) as FontSize[]).map((key) => {
              const f = FONT_SIZES[key];
              const active = pers.fontSize === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => update({ fontSize: key })}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 rounded-xl border p-4 transition-all",
                    active
                      ? "border-primary ring-2 ring-primary/40 bg-primary/5"
                      : "border-border hover:border-primary/40"
                  )}
                  aria-pressed={active}
                >
                  <span className="font-bold" style={{ fontSize: f.px }}>
                    Aa
                  </span>
                  <span className="text-xs text-muted-foreground">{f.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="ghost" onClick={reset}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Restaurar padrões
        </Button>
      </div>
    </main>
  );
}
