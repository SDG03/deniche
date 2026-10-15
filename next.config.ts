import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components désactivé : prix recalculés à la minute et session lue
  // sur quasiment chaque page, tout est dynamique (voir DECISIONS.md).
  cacheComponents: false,
  experimental: {
    // Photos des partenaires (4 Mo max chacune, plusieurs par envoi)
    serverActions: { bodySizeLimit: "20mb" },
  },
  images: {
    // Couvertures SVG de repli (fichiers internes uniquement), servies sans scripts.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
