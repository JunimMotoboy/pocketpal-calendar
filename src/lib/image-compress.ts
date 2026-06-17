// Smart avatar compression: square crop, downscale, iterative quality to hit a byte budget.
// Tries WebP first (smaller), falls back to JPEG if WebP isn't supported.

export type CompressResult = {
  dataUrl: string;
  bytes: number;
  width: number;
  format: "image/webp" | "image/jpeg";
};

const supportsWebP = (() => {
  if (typeof document === "undefined") return false;
  try {
    return document.createElement("canvas").toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
})();

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("invalid image"));
    img.src = src;
  });
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });
}

function dataUrlBytes(url: string): number {
  const i = url.indexOf(",");
  if (i < 0) return url.length;
  const b64 = url.slice(i + 1);
  // Approximate decoded byte length from base64
  const pad = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - pad;
}

function squareCanvas(img: HTMLImageElement, size: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const ratio = Math.max(size / img.width, size / img.height);
  const w = img.width * ratio;
  const h = img.height * ratio;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  return canvas;
}

export async function compressAvatar(
  file: File,
  opts: { maxBytes?: number; maxSize?: number; minSize?: number } = {}
): Promise<CompressResult> {
  const maxBytes = opts.maxBytes ?? 120 * 1024; // ~120 KB target
  const maxSize = opts.maxSize ?? 512;
  const minSize = opts.minSize ?? 192;

  const src = await readAsDataURL(file);
  const img = await loadImage(src);

  const format: "image/webp" | "image/jpeg" = supportsWebP ? "image/webp" : "image/jpeg";

  let best: CompressResult | null = null;
  // Try shrinking size if needed
  for (let size = maxSize; size >= minSize; size -= 64) {
    const canvas = squareCanvas(img, size);
    // Iterate quality from high to low
    for (let q = 0.85; q >= 0.5; q -= 0.1) {
      const dataUrl = canvas.toDataURL(format, q);
      const bytes = dataUrlBytes(dataUrl);
      if (!best || bytes < best.bytes) best = { dataUrl, bytes, width: size, format };
      if (bytes <= maxBytes) return { dataUrl, bytes, width: size, format };
    }
  }
  return best!;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
