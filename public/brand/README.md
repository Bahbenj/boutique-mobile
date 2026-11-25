# Logo de Mobile Empire

Déposez ici le logo fourni par le client (jamais une copie téléchargée depuis Facebook) :

| Fichier                 | Variante                         | Utilisé pour                       |
| ----------------------- | -------------------------------- | ---------------------------------- |
| `logo-dore.svg` (ou .png) | doré sur fond noir / transparent | site (thème sombre)                |
| `logo-bleu.svg` (ou .png) | bleu sur fond blanc / transparent | bon de livraison, fonds clairs     |

De préférence en SVG ; sinon PNG transparent d'au moins 600 px de large.

Puis :

1. Renseignez les chemins dans `config/site.ts` → `logo.onDark` et `logo.onLight` (ex. `"/brand/logo-dore.svg"`). Tant qu'ils valent `null`, le site affiche le logo texte provisoire (hexagone « ME » + « MOBILE EMPIRE »).
2. Échantillonnez les couleurs du logo : `npm run brand:colors -- public/brand/logo-dore.png`, puis reportez l'or dans `theme.gold` (et les bleus dans `theme.accent` / `theme.navy`) en gardant un contraste ≥ 4,5:1 (le script l'affiche).
3. Favicon : remplacez `app/favicon.ico` par une version carrée du monogramme.
