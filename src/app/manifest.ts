import type { MetadataRoute } from "next";
import { copy } from "@/lib/copy";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Déniche — activités originales autour de Liège",
    short_name: "Déniche",
    description: copy.brand.promise,
    lang: "fr-BE",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FAF7F2",
    theme_color: "#1F3D2F",
    categories: ["lifestyle", "travel", "sports"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Surprends-moi", url: "/surprise", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Mes réservations", url: "/reservations", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
