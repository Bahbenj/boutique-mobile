import { siteConfig } from "@/config/site";

/**
 * Réglages de mise en ligne, lus à la compilation (redéployer après un changement) :
 *
 *  NEXT_PUBLIC_ALLOW_INDEXING=1  le site peut être indexé par Google (À METTRE AU
 *                                LANCEMENT). Absente ou autre valeur : noindex partout
 *                                (robots.txt, balise meta, en-tête X-Robots-Tag).
 *                                Par défaut fermé : oublier une variable ne peut
 *                                jamais exposer une démo aux moteurs de recherche.
 *  NEXT_PUBLIC_DEMO_BANNER=1     petite pastille « Version de démonstration » sur le site.
 *  NEXT_PUBLIC_SITE_URL          adresse publique (liens des e-mails, Google, partages,
 *                                données structurées) ; repli : siteConfig.url.
 */
export const allowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "1";
export const demoBanner = process.env.NEXT_PUBLIC_DEMO_BANNER === "1";
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url).replace(/\/$/, "");
