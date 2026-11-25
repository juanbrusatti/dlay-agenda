"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { guardarLogo } from "@/lib/actions/logo";
import { LADO_LOGO } from "@/lib/logo";
import { createClient } from "@/lib/supabase/client";

/** Biggest file the bucket accepts; the shrunk image is far below it. */
const LIMITE_BYTES = 300 * 1024;

function aBlob(canvas: HTMLCanvasElement, tipo: string, calidad?: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, tipo, calidad));
}

/**
 * Shrinks the picture in the browser before uploading: at most LADO_LOGO
 * pixels on its longest side, whole (never cropped, so a wide logo keeps its
 * ends). WebP where the browser can make it, PNG otherwise, and JPEG on a
 * white background as the last resort if it is still too heavy.
 */
async function achicar(archivo: File): Promise<{ blob: Blob; ext: string }> {
  const imagen = await createImageBitmap(archivo);
  const escala = Math.min(1, LADO_LOGO / Math.max(imagen.width, imagen.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(imagen.width * escala));
  canvas.height = Math.max(1, Math.round(imagen.height * escala));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("sin canvas");
  ctx.drawImage(imagen, 0, 0, canvas.width, canvas.height);
  imagen.close();

  const webp = await aBlob(canvas, "image/webp", 0.9);
  if (webp && webp.type === "image/webp" && webp.size <= LIMITE_BYTES) {
    return { blob: webp, ext: "webp" };
  }
  const png = await aBlob(canvas, "image/png");
  if (png && png.size <= LIMITE_BYTES) return { blob: png, ext: "png" };

  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const jpg = await aBlob(canvas, "image/jpeg", 0.85);
  if (jpg && jpg.size <= LIMITE_BYTES) return { blob: jpg, ext: "jpg" };
  throw new Error("muy pesada");
}

/**
 * «Logo o foto»: what the business's clients see, small, at the top of the
 * booking page and of the page behind the reminder's link.
 */
export function SubirLogo({ tenantId, logoUrl }: { tenantId: string; logoUrl: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pendiente, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const subir = (archivo: File) =>
    empezar(async () => {
      setError(null);
      try {
        const { blob, ext } = await achicar(archivo);
        const path = `${tenantId}/${Date.now()}.${ext}`;
        const { error: e } = await createClient()
          .storage.from("logos")
          .upload(path, blob, { contentType: blob.type, cacheControl: "31536000", upsert: false });
        if (e) throw e;
        const r = await guardarLogo(path);
        if (r.error) {
          setError(r.error);
          return;
        }
        router.refresh();
      } catch {
        setError("No pudimos usar esa imagen. Probá con otra en JPG o PNG.");
      }
    });

  const quitar = () =>
    empezar(async () => {
      setError(null);
      const r = await guardarLogo(null);
      if (r.error) setError(r.error);
      else router.refresh();
    });

  return (
    <Card>
      <CardBody className="grid gap-4">
        <div className="grid gap-1">
          <CardTitle>Logo o foto</CardTitle>
          <p className="text-[13.5px] leading-relaxed text-muted">
            Aparece chiquito arriba de tu página de reservas y de la página donde
            tus clientes confirman o cancelan el turno. Se ve mejor una imagen
            cuadrada, con el logo centrado.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div
            className="grid shrink-0 place-items-center overflow-hidden rounded-[16px] border-[1.5px] border-line bg-white"
            style={{ width: 64, height: 64 }}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- already a tiny image from storage
              <img src={logoUrl} alt="Tu logo" className="h-full w-full object-contain p-1" />
            ) : (
              <span className="px-1 text-center text-[11px] leading-tight text-faint">Sin logo</span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={pendiente} onClick={() => input.current?.click()}>
              {pendiente ? "Guardando…" : logoUrl ? "Cambiar imagen" : "Subir imagen"}
            </Button>
            {logoUrl && (
              <Button type="button" variant="ghost" disabled={pendiente} onClick={quitar}>
                Quitar
              </Button>
            )}
          </div>

          <input
            ref={input}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const archivo = e.target.files?.[0];
              e.target.value = "";
              if (archivo) subir(archivo);
            }}
          />
        </div>

        {error && (
          <p role="alert" className="rounded-[14px] bg-danger-wash px-3.5 py-2.5 text-[13.5px] text-danger">
            {error}
          </p>
        )}
      </CardBody>
    </Card>
  );
}
