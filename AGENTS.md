<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Mobile Empire · notes du projet

Boutique en ligne de **Mobile Empire** (smartphones et accessoires, N'Tabacoro, Bamako, Mali, depuis 2018). Slogan : « Vendre avec passion, servir avec excellence. » Site en français, FCFA (XOF, sans décimales), numéros maliens +223 à 8 chiffres (`lib/phone.ts`).

## Où modifier quoi

- **Identité, contact, horaires, réseaux, couleurs, logo** : `config/site.ts` (rien n'est codé en dur dans les composants). Sous-titre « smartphone repair & E-commerce » et description repris de la page Facebook. TODO client : numéro WhatsApp, second numéro (73 92 31 35 ou 74 05 86 18), horaires.
- **Catalogue (site public)** : lu dans Supabase par `lib/catalog.ts` (`getCatalog`, `"use cache"`, tag `CATALOG_TAG` = "catalog"), invalidé par `updateTag(CATALOG_TAG)` dans chaque action admin (produits, catégories, commandes) et après chaque commande (stock). Repli sur `data/products.ts` si Supabase n'est pas configuré ou injoignable (cache de quelques minutes seulement). `lib/catalog.ts` est **serveur uniquement** : les composants client importent `lib/product-helpers.ts` (stock, remise, cadrage des photos).
- **Promos et cadrage** : colonnes `old_price` (prix barré), `tag` (pastille, ex. « Promo »), `free_delivery` (livraison offerte, appliquée par `place_order`), `image_bg` (photo entière sur ce fond, sinon recadrée), modifiables dans `/admin/produits` (migration 11).
- **Produits d'exemple** : `data/products.ts` (11 produits, 6 catégories, tirés des publications et photos du client), source du seed : `npm run seed:generate` puis `npm run db:all-in-one`. **Tous les prix sont TODO** ; ne jamais inventer de caractéristique technique (seules celles publiées par le client).
- **Commande** : `app/(site)/commande/actions.ts` → `placeOrder` appelle `place_order` avec la clé de service (prix relus en base, stock décrémenté, zone et paiement vérifiés), puis le client ouvre WhatsApp avec le numéro de commande. Si la base est indisponible (ou catalogue de secours), envoi WhatsApp seul, sans numéro, pour ne pas perdre la vente.
- **Textes** (hero, services, parcours de réparation, vidéos, FAQ) : `data/home.ts` ; libellés d'interface : `i18n/fr.ts`. Page Réparation : `app/(site)/reparation/page.tsx` ; vidéos à déclarer dans `repairVideos`.
- **Photos et logo** : jamais d'image chargée depuis Facebook, jamais d'affiche publiée (elles restent dans `reference-client/`, hors de `public/`, ignoré par git). Logo dans `public/brand/` (variantes via `node scripts/logo-variants.mjs`, voir son README). Photos : originaux dans `photos-originaux/` (racine, hors de `public/`, non versionnés), retouches via `node scripts/client-images.mjs`, puis `npm run photos:optimize` (WebP). Visuels provisoires : `public/photos/provisoire/` (`npm run photos:placeholders`).
- **Déblocage** : formulation imposée « Déblocage de votre propre appareil (compte oublié, verrouillage d'entreprise) sur présentation d'une preuve d'achat ou de propriété. Nous nous réservons le droit de refuser une demande. » Jamais « bypass », « supprimer le FRP » ni « MDM » sur le site.
- **Pages légales** : `app/(site)/cgv`, `app/(site)/retours-garantie` (gabarit `components/sections/LegalPage.tsx`), textes types à faire valider par le client (RCCM, NIF à compléter).
- **Zones, frais de livraison, retrait, modes de paiement** : réglés dans `/admin/parametres` (tables `delivery_zones` et `settings`), lus côté site par `lib/storefront.ts` (`"use cache"`, tag `settings`, invalidé par l'admin), avec repli sur `config/site.ts` sans base. Paiement à la livraison seul activé par défaut. Les mêmes réglages alimentent le seuil « livraison offerte » du panier (`app/(site)/layout.tsx` → `CartDrawer`), la FAQ et les étapes de commande (`buildFaqs`, `buildOrderSteps` dans `data/home.ts`) : ne jamais y relire `siteConfig.delivery` ni `paymentMethods` directement.
- **Page À propos** : `app/(site)/a-propos/page.tsx` (TODO client : compléter l'histoire et présenter l'équipe, sans rien inventer).
- **Avis clients** : `/admin/avis` (table `reviews`, migration 9). Section masquée tant qu'aucun avis n'est publié (aucun avis d'exemple, même sans base). Lien « Laisser un avis » = WhatsApp pré-rempli (`reviewRequestMessage`).

## Thème (sombre, or et bleu, motif hexagonal)

- Couleurs dans `config/site.ts → theme`, injectées en variables CSS par `app/layout.tsx` ; valeurs par défaut et dérivées dans `app/globals.css`. Classes sémantiques : `bg-canvas` (fond noir), `bg-surface` (cartes anthracite), `bg-raised`, `bg-navy` (bleu marine, fonds à motif), `text-fg`, `text-muted`, `border-line`, `bg-gold` / `text-on-gold` / `text-gold-text` (or bronze rosé du logo : boutons principaux `Button variant="primary"`, détails), `bg-accent` / `text-on-accent` (bleu du logo éclairci, #1A8FE6 : liens, états actifs, focus, hexagones), `text-danger` / `bg-danger-soft` (erreurs, lavande), `text-success`.
- **Motif hexagonal** : `components/ui/Hex.tsx` (`HexIcon`, `HexDot`, `HexDivider`, `HexPattern`) et classes `.hex`, `.hex-soft`, `.hex-wide`, `.aspect-hex`, `.hex-pattern` (`app/globals.css`). Grandes images éditoriales en `hex-soft` ; les photos produit restent rectangulaires arrondies (lisibilité). Logo : `components/layout/Logo.tsx`, variantes `dark` (texte blanc) et `light` (version d'origine, bon de livraison), tailles `compact` (nom seul) et `full` (avec les éclairs).
- **Charte client : ni rouge ni jaune vif, même pour les alertes.** Pas de `red-*`, `amber-*`, `yellow-*`, `orange-*` de Tailwind. Ne pas utiliser `bg-white` pour une carte (`bg-surface`) ; `text-white` / `bg-white/xx` seulement sur photo. Typographie : espace insécable avant « ? ! : ; » et dans « 35 dB ».
- Contraste AA vérifié (texte ≥ 4,5:1, y compris sur `bg-navy`) : l'or et le bleu se posent avec du texte **noir** (`text-on-gold`, `text-on-accent`), jamais blanc.
- `data-theme="light"` (variables claires) est réservé à l'impression (bon de livraison, `app/admin/(print)`).

## Meta Pixel

`NEXT_PUBLIC_META_PIXEL_ID` (vide = désactivé). `lib/meta-pixel.ts` (file d'attente + `track()`), `components/layout/MetaPixel.tsx` (script `lazyOnload`, PageView à chaque navigation). Événements : ViewContent (page produit), AddToCart (`lib/use-add-to-cart.ts`), InitiateCheckout et Purchase + Lead (`CheckoutForm`). Identifiants de contenu = `slug` du produit, montants en `XOF`.

## Base de données

Migrations dans `supabase/migrations/` (rejouables, ne jamais écraser une saisie du commerçant : mise à jour seulement si la valeur est encore celle d'exemple). Après toute modification SQL ou de `data/products.ts` : `npm run seed:generate && npm run db:all-in-one`. Mode d'emploi : `supabase/README.md`.

## Vérifications

Pas de suite de tests automatisés : `npx tsc --noEmit`, `npm run lint` et `npm run build` doivent passer. Vérifier aussi l'affichage à 360 px et 1280 px (aucun débordement horizontal, boutons longs en `max-sm:w-full max-sm:whitespace-normal`).
