<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Mobile Empire · notes du projet

Boutique en ligne de **Mobile Empire** (smartphones et accessoires, N'Tabacoro, Bamako, Mali, depuis 2018). Slogan : « Vendre avec passion, servir avec excellence. » Site en français, FCFA (XOF, sans décimales), numéros maliens +223 à 8 chiffres (`lib/phone.ts`).

## Où modifier quoi

- **Identité, contact, horaires, réseaux, couleurs** : `config/site.ts` (rien n'est codé en dur dans les composants). WhatsApp = premier numéro, **à confirmer par le client** (TODO).
- **Produits et rayons d'exemple** : `data/products.ts` (9 produits, 6 catégories), puis `npm run seed:generate` et `npm run db:all-in-one`. Le site public lit encore ce fichier via `lib/catalog.ts` ; l'admin lit Supabase (branchement du catalogue public : étape 4).
- **Textes de l'accueil** (hero, services, FAQ, avis d'exemple) : `data/home.ts` ; libellés d'interface : `i18n/fr.ts`.
- **Zones, frais de livraison, retrait, modes de paiement** : réglés dans `/admin/parametres` (tables `delivery_zones` et `settings`), lus côté site par `lib/storefront.ts` (`"use cache"`, tag `settings`, invalidé par l'admin), avec repli sur `config/site.ts` sans base. Paiement à la livraison seul activé par défaut. Les mêmes réglages alimentent le seuil « livraison offerte » du panier (`app/(site)/layout.tsx` → `CartDrawer`), la FAQ et les étapes de commande (`buildFaqs`, `buildOrderSteps` dans `data/home.ts`) : ne jamais y relire `siteConfig.delivery` ni `paymentMethods` directement.
- **Page À propos** : `app/(site)/a-propos/page.tsx` (TODO client : compléter l'histoire et présenter l'équipe, sans rien inventer).
- **Avis clients** : `/admin/avis` (table `reviews`, migration 9). Section masquée tant qu'aucun avis n'est publié ; les avis de `data/home.ts` ne servent que sans Supabase.

## Thème (sombre « tech »)

- Couleurs dans `config/site.ts → theme`, injectées en variables CSS par `app/layout.tsx` ; valeurs par défaut et dérivées dans `app/globals.css`. Utiliser les classes sémantiques : `bg-canvas` (fond noir), `bg-surface` (cartes anthracite), `bg-raised`, `text-fg`, `text-muted`, `border-line`, `bg-accent` / `text-on-accent` (bleu électrique), `bg-gold` / `text-gold-text` (rose doré, détails et badges), `text-danger` / `bg-danger-soft` (erreurs, lavande), `text-success`.
- **Charte client : aucun rouge ni jaune, même pour les alertes.** Pas de `red-*`, `amber-*`, `yellow-*`, `orange-*` de Tailwind. Ne pas utiliser `bg-white` pour une carte (`bg-surface`) ; `text-white` / `bg-white/xx` seulement sur photo.
- Contraste AA vérifié (texte ≥ 4,5:1) : le bleu et le rose doré se posent avec du texte **noir** (`text-on-accent`, `text-on-gold`), jamais blanc. Le rose doré en texte : `text-gold-text`.
- `data-theme="light"` (variables claires) est réservé à l'impression (bon de livraison, `app/admin/(print)`).

## Meta Pixel

`NEXT_PUBLIC_META_PIXEL_ID` (vide = désactivé). `lib/meta-pixel.ts` (file d'attente + `track()`), `components/layout/MetaPixel.tsx` (script `lazyOnload`, PageView à chaque navigation). Événements : ViewContent (page produit), AddToCart (`lib/use-add-to-cart.ts`), InitiateCheckout et Purchase + Lead (`CheckoutForm`). Identifiants de contenu = `slug` du produit, montants en `XOF`.

## Base de données

Migrations dans `supabase/migrations/` (rejouables, ne jamais écraser une saisie du commerçant : mise à jour seulement si la valeur est encore celle d'exemple). Après toute modification SQL ou de `data/products.ts` : `npm run seed:generate && npm run db:all-in-one`. Mode d'emploi : `supabase/README.md`.

## Vérifications

Pas de suite de tests automatisés : `npx tsc --noEmit`, `npm run lint` et `npm run build` doivent passer.
