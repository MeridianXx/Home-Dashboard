import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the multi-stage Docker build to produce a self-contained server
  output: "standalone",

  // Allow images from internal services if needed later
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "192.168.1.*",
      },
    ],
  },
};

export default nextConfig;
