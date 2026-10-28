import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Apex LSAT",
    short_name: "Apex",
    description: "Personal LSAT study system: lessons, adaptive drill, blind review, timing intelligence.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f3ec",
    theme_color: "#7a1f2b",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
