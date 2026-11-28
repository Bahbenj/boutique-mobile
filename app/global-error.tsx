"use client";

import "./globals.css";

/**
 * Dernier recours (erreur dans le gabarit racine lui-même) : page autonome, sans
 * données ni composants du site, en français et aux couleurs de config/site.ts → theme
 * (recopiées : cette page ne peut pas lire le thème).
 */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, minHeight: "100svh", display: "grid", placeItems: "center", background: "#060709", color: "#F2EFEA", fontFamily: "system-ui, sans-serif", padding: 24 }}>
        <title>Erreur · Mobile Empire</title>
        <main style={{ maxWidth: 440, textAlign: "center" }}>
          <p style={{ fontSize: 56, fontWeight: 800, margin: 0, color: "#C8956C" }}>Oups</p>
          <h1 style={{ fontSize: 26, margin: "12px 0 8px" }}>Le site est momentanément indisponible</h1>
          <p style={{ color: "#A9A5A0", lineHeight: 1.5, margin: 0 }}>Réessayez dans un instant. Votre panier est conservé sur ce téléphone.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ marginTop: 24, minHeight: 48, padding: "0 28px", borderRadius: 999, border: 0, background: "#C8956C", color: "#060709", fontWeight: 700, fontSize: 16, cursor: "pointer" }}
          >
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
