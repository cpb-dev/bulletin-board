import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const name = process.env.NEXT_PUBLIC_APP_NAME || "Our Little Board";
  return {
    name,
    short_name: name,
    description: "A cozy little bulletin board for the two of us.",
    start_url: "/board",
    display: "standalone",
    orientation: "any",
    background_color: "#2e2017",
    theme_color: "#2e2017",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
