# Logo de Mobile Empire

Source fournie par le client : `logo-mobile-empire-bleu.jpg` (texte noir, éclairs bleus, fond blanc).

Variantes générées par `node scripts/logo-variants.mjs` (à relancer si la source change) :

| Fichier                                   | Usage                                                       |
| ----------------------------------------- | ----------------------------------------------------------- |
| `logo-mobile-empire-clair.png`            | thème sombre : texte blanc, bleu conservé, fond transparent (pied de page) |
| `logo-mobile-empire-clair-horizontal.png` | thème sombre, petites tailles : nom + sous-titre (barre de navigation) |
| `logo-mobile-empire-bleu.png`             | version d'origine, marges retirées (bon de livraison, fonds clairs) |
| `logo-mobile-empire-bleu-horizontal.png`  | version d'origine, petites tailles                          |

Chemins déclarés dans `config/site.ts` → `logo`. Couleurs : `npm run brand:colors -- public/brand/logo-mobile-empire-bleu.jpg` (bleu du logo : `#0684DB`, éclairci en `#1A8FE6` dans le thème pour rester lisible sur fond sombre).

TODO client : une version vectorielle (SVG ou PDF) du logo donnerait un rendu plus net, et un favicon carré (remplacer `app/favicon.ico`).
