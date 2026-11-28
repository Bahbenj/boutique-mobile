import type { NextConfig } from "next";

// Domaine du projet Supabase (photos de l'admin), y compris un domaine personnalisé
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;

// Démo : en-tête « noindex » sur toutes les pages tant que le lancement n'est pas décidé
const allowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "1";
const isDev = process.env.NODE_ENV === "development";

/**
 * Politique de sécurité du contenu (CSP). Sans nonce, volontairement : un nonce
 * rendrait chaque page dynamique (plus de prérendu partiel, site plus lent).
 * Les scripts en ligne de Next.js restent donc permis ('unsafe-inline'), mais
 * seuls ces domaines peuvent fournir scripts, images, connexions et cadres :
 *   Supabase (API, photos, session), Meta Pixel (si activé), Google Maps (plan
 *   intégré), Unsplash (visuels provisoires). Ajouter ici tout nouveau service.
 */
const supabaseOrigin = supabase ? supabase.origin : "https://*.supabase.co";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://connect.facebook.net`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabaseOrigin} https://images.unsplash.com https://www.facebook.com`,
  `media-src 'self' blob: ${supabaseOrigin}`,
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin} ${supabaseOrigin.replace(/^http/, "ws")} https://connect.facebook.net https://www.facebook.com${isDev ? " ws:" : ""}`,
  "frame-src https://www.google.com https://maps.google.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  `form-action 'self' ${supabaseOrigin} https://accounts.google.com`,
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // HTTPS imposé pendant un an (ignoré par le navigateur tant que le site est en HTTP)
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Position : carnet d'adresses ; appareil photo : photos d'avis et de l'admin (champ fichier)
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(self), microphone=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: [...securityHeaders, ...(allowIndexing ? [] : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }])] },
    ];
  },
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
