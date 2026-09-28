import type { NextConfig } from "next";

const cloudfrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL || "";
const cloudfrontHost = cloudfrontUrl ? new URL(cloudfrontUrl).hostname : null;

const nextConfig: NextConfig = {
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
