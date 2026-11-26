/**
 * Chemin de retour après connexion : uniquement une page interne du site
 * (« /commande », « /compte/commandes »…). Refuse les adresses externes,
 * « //exemple.com », les barres obliques inverses, l'admin et les pages de
 * connexion elles-mêmes (pas de redirection ouverte ni de boucle).
 */
export function safeNextPath(next: unknown, fallback = "/compte") {
  if (typeof next !== "string" || next.length > 200) return fallback;
  if (!/^\/(?![/\\])[\w\-./]*(\?[\w\-=&%.]*)?$/.test(next)) return fallback;
  if (/^\/(admin|compte\/(connexion|inscription|confirmer))(\/|\?|$)/.test(next)) return fallback;
  return next;
}
