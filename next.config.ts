import type { NextConfig } from "next";
import { ASSET_PACK } from "./lib/assets";

const cloudfrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL || "";
const cloudfrontHost = cloudfrontUrl ? new URL(cloudfrontUrl).hostname : null;

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // /favicon.ico apunta al pack de assets activo
      { source: "/favicon.ico", destination: `/${ASSET_PACK}/harold-favicon.ico` },
    ];
  },
  images: {
    remotePatterns: [
      // Host actual de la distribución
      ...(cloudfrontHost ? [{ protocol: "https" as const, hostname: cloudfrontHost }] : []),
      // URLs persistidas con hosts de distribuciones viejas (p. ej. en JWTs de
      // sesiones activas o comments.authorImage) muestran imagen rota en vez de
      // romper el render de next/image
      { protocol: "https", hostname: "**.cloudfront.net" },
    ],
  },
};

export default nextConfig;
