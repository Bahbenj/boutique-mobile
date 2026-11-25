# Photos du magasin

- `provisoire/` : visuels provisoires sobres des rayons (générés par `node scripts/placeholders.mjs`). À remplacer par de vraies photos.
- `originaux/` : déposez ici les photos fournies par le client (produits, vitrine, atelier). Ce dossier n'est pas versionné.
- `videos/` : vidéos de réparation (MP4 720p, quelques Mo) et leur image d'aperçu, à déclarer dans `data/home.ts` → `repairVideos`.

**Optimisation :** `npm run photos:optimize` crée pour chaque original des WebP en 640, 1280 et 1920 px (métadonnées et position GPS retirées) directement dans ce dossier, ex. `photos/vitrine-1280.webp`. Utilisez ce chemin dans le code ou dans l'admin (champ photo d'un produit ou d'une catégorie).

**Règle :** ne chargez jamais d'image depuis Facebook (ni lien direct, ni copie) : demandez les fichiers originaux au client.
