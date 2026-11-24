import type { NextConfig } from "next";

// Domaine du projet Supabase (photos de l'admin), y compris un domaine personnalisé
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: ["boutique.test"],
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [60, 75],
    // Placeholders Unsplash en attendant les photos du magasin
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      // Photos envoyées depuis l'admin (Supabase Storage, bucket public « catalog »)
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      ...(supabase && !supabase.hostname.endsWith(".supabase.co")
        ? [
            {
              protocol: supabase.protocol.replace(":", "") as "http" | "https",
              hostname: supabase.hostname,
              port: supabase.port,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },
  turbopack: {
    root: __dirname, // un package-lock.json parent fausserait la racine détectée
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
