# À faire avant le lancement

État relevé le 28 novembre 2026 (code et base Supabase). Presque tout se règle **dans l'admin**, sans toucher au code. Classé par importance.

## 1. Bloquant : le site affiche aujourd'hui des informations inventées

| # | Quoi | Où | État actuel |
| --- | --- | --- | --- |
| 1 | **Prix réels des 11 produits** (et leur stock) | Admin → Produits | Valeurs d'exemple ou lues sur des affiches, aucune confirmée (Samsung 100 000, Tecno 80 000, montre 25 000…). Un client paierait ces prix. |
| 2 | **Numéro WhatsApp** qui reçoit les commandes et les demandes de réparation | Admin → Paramètres → Boutique | `+223 63 51 55 82` supposé être aussi le WhatsApp : à confirmer, sinon les commandes partent au mauvais numéro. |
| 3 | **Frais de livraison par zone** et seuil « livraison offerte » | Admin → Paramètres → Livraison | 16 zones aux tarifs d'exemple (1 500 à 10 000 FCFA), offerte dès 100 000 FCFA. |
| 4 | **Mentions légales** : forme juridique, **RCCM**, **NIF** | `app/(site)/cgv/page.tsx` (code) | « À compléter » dans les CGV. |
| 5 | **Validation des textes légaux** (CGV, retours et garantie, confidentialité) puis retrait du bandeau « Texte type » | `app/(site)/cgv`, `retours-garantie`, `confidentialite`, `components/sections/LegalPage.tsx` | Textes types. Confidentialité : durées de conservation, hébergeur (Vercel ou serveur), région Supabase, déclaration APDP. Garantie : délais et retour sous 7 jours à confirmer. |
| 6 | **Domaine définitif** | `NEXT_PUBLIC_SITE_URL` + `config/site.ts → url` (encore `https://www.example.com`) | Voir `DEPLOIEMENT.md`, section D. |

## 2. Important : visible par tous les clients

| # | Quoi | Où | État actuel |
| --- | --- | --- | --- |
| 7 | **Photos réelles** de 6 produits | Admin → Produits → la fiche → Photos | Dessins provisoires : Samsung, Tecno, Écouteurs sans fil, Casque ANC EP07, Loupe d'écran, Casque Super Bass (l'affiche publiée sur Facebook n'est pas réutilisable). |
| 8 | **Photos des catégories** | Admin → Catégories | Smartphones, Coques et protections, Gadgets : dessins provisoires ; Accessoires : photo de banque d'images (Unsplash). |
| 9 | **Horaires** | Admin → Paramètres → Boutique | « Tous les jours 8 h – 21 h » (premier questionnaire), à confirmer. |
| 10 | **Second numéro** | Admin → Paramètres → Boutique | `74 05 86 18` affiché ; l'autre candidat était `73 92 31 35`. |
| 11 | **Épingle Google Maps exacte** du magasin | Admin → Paramètres → Boutique (lien Maps) et `config/site.ts → mapEmbedUrl` (carte intégrée) | Recherche générique « N'Tabacoro, Bamako » : la carte ne pointe pas sur la boutique. |
| 12 | **Paiement mobile** (Orange Money, Moov Money, Wave), si souhaité | Admin → Paramètres → Paiement | Désactivés, avec des numéros d'exemple (`+223 70 00 00 00`…) : saisir les vrais numéros **avant** d'activer. Seul le paiement à la livraison est actif. |
| 13 | **Visuels de l'accueil et de la page Réparation** | `data/home.ts` (code) | 5 photos de banque d'images (Unsplash) dans le grand bandeau d'accueil et la page Réparation : à remplacer par des photos de la boutique. |
| 14 | **E-mail de contact** | Admin → Paramètres → Boutique | Une adresse Gmail personnelle : envisager une adresse au nom de la boutique (aussi utile comme expéditeur des e-mails de compte, section 6 bis du README Supabase). |

## 3. À compléter ensuite

| # | Quoi | Où |
| --- | --- | --- |
| 15 | **Logo en haute définition** (fichier d'origine, idéalement vectoriel SVG) : le logo actuel est retravaillé à partir d'une image JPEG | `public/brand/` puis `node scripts/logo-variants.mjs` |
| 16 | **Image de partage** (aperçu quand on partage le lien sur WhatsApp ou Facebook) : aucune pour l'instant | ajouter `app/opengraph-image.jpg` (1 200 × 630) |
| 17 | **Page À propos** : histoire de la boutique, équipe (prénoms, photo), sans rien inventer | `app/(site)/a-propos/page.tsx` |
| 18 | **Vidéos de réparation** (TikTok de la boutique) | `data/home.ts → repairVideos` |
| 19 | **Libellés des services** et conditions repris de Facebook, à valider | `data/home.ts` |
| 20 | **Premiers avis clients** (témoignages) : la section reste masquée tant qu'il n'y en a aucun | Admin → Avis clients |
| 21 | **Bandeau d'annonce** (promo, horaires de fête…), facultatif | Admin → Paramètres → Annonce |

## Côté technique (une fois, au lancement)

- Supabase : coller `supabase/all-in-one.sql` (migration 26 : limites de commandes et de photos), puis les réglages de `supabase/README.md`, section 6 bis (SMTP, Google, URL).
- Variables : `NEXT_PUBLIC_ALLOW_INDEXING=1`, sans `NEXT_PUBLIC_DEMO_BANNER` (`DEPLOIEMENT.md`, section D).
- Sauvegardes hebdomadaires et premier essai de restauration (`deploy/sauvegarde/LISEZMOI.md`).
- Annuler puis effacer les commandes de test (README Supabase, section 7 H).
