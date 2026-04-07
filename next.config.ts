import type { NextConfig } from "next";

const baseConfig: NextConfig = {
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

// PWA uses a webpack plugin which conflicts with Turbopack in dev.
// Only wrap with withPWA in production builds.
async function getConfig(): Promise<NextConfig> {
  if (process.env.NODE_ENV === "production") {
    const { default: withPWA } = await import("@ducanh2912/next-pwa");
    return withPWA({
      dest: "public",
      cacheOnFrontEndNav: true,
      aggressiveFrontEndNavCaching: true,
    })(baseConfig);
  }
  return baseConfig;
}

export default getConfig();
