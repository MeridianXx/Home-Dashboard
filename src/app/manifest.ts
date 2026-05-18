import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Björk — Villa Björkdalen",
    short_name: "Björk",
    description: "Homelab & smarthome dashboard",
    start_url: "/v3/home",
    scope: "/",
    display: "standalone",
    background_color: "#F5EEDE",
    theme_color: "#F5EEDE",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon.svg",
        type: "image/svg+xml",
        sizes: "any",
        purpose: "any",
      },
      {
        src: "/icon/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
