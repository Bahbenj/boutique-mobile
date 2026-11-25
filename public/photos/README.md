# Photos du magasin

- `provisoire/` : visuels provisoires sobres des rayons (générés par `node scripts/placeholders.mjs`). À remplacer par de vraies photos.
- `photos-originaux/` (à la racine du projet, hors de `public/` pour ne jamais être servi) : déposez ici les photos fournies par le client (produits, vitrine, atelier). Ce dossier n'est pas versionné. Les fichiers `*-source.jpg` sont les originaux avant retouche (`node scripts/client-images.mjs` : badge « 3/4 » et barre de capture retirés de la station de charge, texte publicitaire retiré des écouteurs, bloc de texte retiré de la fiche de la montre) ; ils ne sont jamais convertis.
- `videos/` : vidéos de réparation (MP4 720p, quelques Mo) et leur image d'aperçu, à déclarer dans `data/home.ts` → `repairVideos`.

**Optimisation :** `npm run photos:optimize` crée pour chaque original des WebP en 640, 1280 et 1920 px (métadonnées et position GPS retirées) directement dans ce dossier, ex. `photos/vitrine-1280.webp`. Utilisez ce chemin dans le code ou dans l'admin (champ photo d'un produit ou d'une catégorie).

**Règles :** ne chargez jamais d'image depuis Facebook (ni lien direct, ni copie) : demandez les fichiers originaux au client. Les **affiches** (texte, prix, autres numéros) ne sont jamais publiées : elles restent dans `reference-client/` à la racine du projet, hors de `public/` (tout ce qui est dans `public/` est accessible en ligne) et ignoré par git.

Photos fournies (novembre 2026) : petites (600 à 800 px), donc une seule taille WebP générée. TODO client : des photos plus grandes, sur fond neutre, donneraient un meilleur rendu sur ordinateur.

**Remplacer une photo :** donnez un nouveau nom au fichier (ex. `vitrine-v2.jpg`) plutôt que d'écraser l'ancien : le cache d'images de Next.js et des navigateurs continuerait sinon d'afficher l'ancienne version.
