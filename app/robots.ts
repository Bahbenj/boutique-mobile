import type { MetadataRoute } from "next";
import { allowIndexing, siteUrl } from "@/lib/site-mode";

/**
 * robots.txt. Démo (par défaut) : tout est interdit aux robots.
 * Lancement (NEXT_PUBLIC_ALLOW_INDEXING=1) : le site est ouvert, sauf l'admin,
 * l'espace client et la commande (pages privées, sans intérêt pour la recherche).
 */
export default function robots(): MetadataRoute.Robots {
  if (!allowIndexing) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/compte", "/commande"] },
    host: siteUrl,
  };
}
