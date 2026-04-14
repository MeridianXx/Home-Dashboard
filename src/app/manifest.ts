import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "inicio.cloud — Villa Björkdalen",
    short_name: "inicio",
    description: "Homelab & smarthome dashboard",
    start_url: "/home",
    display: "standalone",
    background_color: "#fffcf7",
    theme_color: "#475bc2",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon.svg",
        type: "image/svg+xml",
        sizes: "any",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
