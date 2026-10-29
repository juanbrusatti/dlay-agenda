import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Las direcciones de los íconos de antes (la «D») llevan a los de ahora.
  // Hay navegadores y aplicaciones instaladas que todavía las tienen guardadas:
  // si dieran error, se quedarían para siempre con el ícono viejo.
  async redirects() {
    return [
      { source: "/icon.svg", destination: "/marca/v2/favicon.svg", permanent: false },
      { source: "/apple-icon.png", destination: "/marca/v2/apple-touch-icon.png", permanent: false },
      { source: "/icons/icon.svg", destination: "/marca/v2/favicon.svg", permanent: false },
      { source: "/icons/:file", destination: "/marca/v2/:file", permanent: false },
    ];
  },
};

export default nextConfig;
