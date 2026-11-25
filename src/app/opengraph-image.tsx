import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * The card WhatsApp, Instagram and the rest show when someone shares a Dlay
 * link: the logo, the promise and the free month.
 *
 * Generated once at build time and served as a static file (it reads no
 * request data), so it costs nothing per share.
 */

export const alt = "Dlay Agenda: recordatorios de turnos por WhatsApp";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const icono = await readFile(join(process.cwd(), "public/marca/v2/icon-512.png"));
  const logo = `data:image/png;base64,${icono.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 80px",
          background: "#f5f3ee",
          color: "#0a0a0a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <img src={logo} width={80} height={80} style={{ borderRadius: 20 }} alt="" />
          <div style={{ fontSize: 38, letterSpacing: -1 }}>Dlay Agenda</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 64, lineHeight: 1.08, letterSpacing: -2.5, maxWidth: 900 }}>
            Dejá de perseguir confirmaciones por WhatsApp.
          </div>
          <div style={{ fontSize: 30, color: "#55524b", maxWidth: 1000, lineHeight: 1.3 }}>
            Recordatorios automáticos y agenda para negocios con turnos.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28 }}>
          <div
            style={{
              display: "flex",
              background: "#3e3fe0",
              color: "#ffffff",
              borderRadius: 999,
              padding: "10px 26px",
            }}
          >
            El primer mes es gratis
          </div>
          <div style={{ color: "#8a857a" }}>Sin tarjeta</div>
        </div>
      </div>
    ),
    size,
  );
}
