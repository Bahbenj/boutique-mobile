"use client";

import { useState } from "react";

/**
 * « Partager ma position » : jamais obligatoire, demandé seulement au toucher du
 * bouton. Position arrondie à 6 décimales (≈ 10 cm, largement suffisant).
 */
export function useGeolocation(initial: { lat: number; lng: number } | null = null) {
  const [position, setPosition] = useState(initial);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locate = () => {
    if (!("geolocation" in navigator)) return setError("Ce téléphone ne permet pas de partager la position.");
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPosition({ lat: Math.round(p.coords.latitude * 1e6) / 1e6, lng: Math.round(p.coords.longitude * 1e6) / 1e6 });
        setLocating(false);
      },
      (e) => {
        setLocating(false);
        setError(e.code === e.PERMISSION_DENIED ? "Position refusée. Vous pouvez l'autoriser dans les réglages du navigateur, ou décrire un repère." : "Position introuvable. Réessayez à l'extérieur, ou décrivez un repère.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  };

  return { position, setPosition, locating, error, locate, clear: () => setPosition(null) };
}
