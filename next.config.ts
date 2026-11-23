import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: ["boutique.test"],
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [60, 75],
    // Placeholders Unsplash en attendant les photos du magasin
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com", pathname: "/**" }],
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
