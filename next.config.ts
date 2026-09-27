import type { NextConfig } from "next";

const cloudfrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL || "";
const cloudfrontHost = cloudfrontUrl ? new URL(cloudfrontUrl).hostname : null;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: cloudfrontHost
      ? [{ protocol: "https", hostname: cloudfrontHost }]
      : [],
  },
};

export default nextConfig;
