import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/Button";

/**
 * Guide rapide : les gestes de tous les jours en 6 étapes, chacune avec un
 * petit écran dessiné (même code couleur que l'admin) et un lien direct.
 */

type Step = { title: string; points: ReactNode[]; href: string; cta: string; screen: ReactNode; staff?: boolean; adminOnly?: boolean };

function Phone({ children }: { children: ReactNode }) {
  return (
    <div aria-hidden="true" className="mx-auto w-44 shrink-0 rounded-[1.6rem] bg-canvas p-2 ring-1 ring-fg/15 shadow-lift">
      <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-fg/15" />
      <div className="space-y-1.5 rounded-[1.1rem] bg-surface p-2">{children}</div>
    </div>
  );
}
const Bar = ({ w = "w-full", className }: { w?: string; className?: string }) => <div className={cn("h-2 rounded-full bg-fg/15", w, className)} />;
const Btn = ({ children, tone = "gold" }: { children: ReactNode; tone?: "gold" | "blue" | "light" }) => (
  <div
    className={cn(
      "flex h-6 items-center justify-center rounded-full text-[0.6rem] font-bold",
      tone === "gold" && "bg-gold text-on-gold",
      tone === "blue" && "bg-accent text-on-accent",
      tone === "light" && "bg-raised text-fg ring-1 ring-line",
    )}
  >
    {children}
  </div>
);
const Pulse = ({ children }: { children: ReactNode }) => <div className="rounded-full ring-2 ring-accent ring-offset-2 ring-offset-surface">{children}</div>;
const Row = ({ children }: { children: ReactNode }) => <div className="flex items-center gap-1.5 rounded-xl bg-raised p-1.5">{children}</div>;
const Thumb = () => <div className="size-7 shrink-0 rounded-lg bg-navy ring-1 ring-accent/30" />;

const steps: Step[] = [
  {
    title: "Ajouter un produit",
    adminOnly: true,
    href: "/admin/produits/nouveau",
    cta: "Ajouter un produit",
    points: [
      <>Touchez <strong>+ Ajouter un produit</strong> (en bas à droite de la liste, ou dans « Plus »).</>,
      <>Prenez la photo avec le téléphone, puis le <strong>nom</strong>, la <strong>catégorie</strong> et le <strong>prix</strong>. Le reste est facultatif.</>,
      <>Regardez l&apos;<strong>aperçu</strong> « comme le client le voit », puis <strong>Ajouter</strong>. Rien n&apos;est perdu si vous quittez : le brouillon est gardé.</>,
    ],
    screen: (
      <Phone>
        <div className="grid h-14 place-items-center rounded-xl border-2 border-dashed border-line text-[0.6rem] font-semibold text-muted">+ Photo</div>
        <Bar w="w-3/4" />
        <Bar w="w-1/2" />
        <Row>
          <span className="text-[0.6rem] font-bold">25 000 FCFA</span>
        </Row>
        <Pulse>
          <Btn>Ajouter</Btn>
        </Pulse>
      </Phone>
    ),
  },
  {
    title: "Changer un prix ou le stock",
    adminOnly: true,
    href: "/admin/produits",
    cta: "Voir mes produits",
    points: [
      <>Dans <strong>Produits</strong>, touchez le prix pour le modifier sur place, ou <strong>−</strong> / <strong>+</strong> pour le stock.</>,
      <>L&apos;interrupteur <strong>En vente / Masqué</strong> retire un produit du site sans l&apos;effacer.</>,
      <>Une erreur ? Touchez <strong>Annuler</strong> dans le message qui apparaît en bas.</>,
    ],
    screen: (
      <Phone>
        {[0, 1].map((i) => (
          <Row key={i}>
            <Thumb />
            <div className="flex-1 space-y-1">
              <Bar w="w-4/5" />
              <div className="flex gap-1">
                <span className={cn("rounded-md px-1 text-[0.55rem] font-bold", i === 0 && "ring-2 ring-accent")}>15 000</span>
                <span className="rounded-md bg-surface px-1 text-[0.55rem] font-bold">− 5 +</span>
              </div>
            </div>
          </Row>
        ))}
        <div className="flex items-center justify-between rounded-xl bg-fg px-2 py-1.5 text-[0.55rem] font-semibold text-canvas">
          Prix : 14 000 FCFA <span className="text-accent">Annuler</span>
        </div>
      </Phone>
    ),
  },
  {
    title: "Mettre à jour le stock",
    staff: true,
    href: "/admin/stock",
    cta: "Ouvrir le stock",
    points: [
      <>Dans <strong>Stock</strong>, les produits en rupture et en stock faible sont en haut.</>,
      <>À l&apos;arrivage, touchez <strong>+</strong> ou tapez le nombre, ajoutez un motif (« Arrivage du lundi ») puis <strong>Enregistrer</strong>.</>,
      <>L&apos;onglet <strong>Historique</strong> montre chaque vente, annulation et correction, avec qui et quand.</>,
    ],
    screen: (
      <Phone>
        <Row>
          <Thumb />
          <div className="flex-1 space-y-1">
            <Bar w="w-3/4" />
            <span className="rounded-full bg-danger-soft px-1.5 text-[0.5rem] font-bold text-danger">Rupture</span>
          </div>
        </Row>
        <div className="flex items-center justify-between rounded-full bg-raised px-2 py-1 text-[0.6rem] font-bold ring-1 ring-line">
          − <span>12</span> +
        </div>
        <div className="rounded-full bg-raised px-2 py-1 text-[0.55rem] text-muted ring-1 ring-line">Motif : arrivage</div>
        <Pulse>
          <Btn>Enregistrer</Btn>
        </Pulse>
      </Phone>
    ),
  },
  {
    title: "Traiter une commande",
    staff: true,
    href: "/admin/commandes",
    cta: "Voir les commandes",
    points: [
      <>Chaque nouvelle commande arrive dans <strong>Commandes</strong>, avec son numéro (CMD-…).</>,
      <>Ouvrez-la, appelez ou écrivez au client avec <strong>WhatsApp</strong> (message déjà rédigé).</>,
      <>Avancez d&apos;un geste : <strong>Confirmer</strong>, <strong>Expédier</strong>, <strong>Livrée</strong>. Imprimez le <strong>bon de livraison</strong> si besoin.</>,
    ],
    screen: (
      <Phone>
        <div className="flex items-center justify-between">
          <span className="text-[0.6rem] font-extrabold">CMD-1024</span>
          <span className="rounded-full bg-accent-soft px-1.5 text-[0.5rem] font-bold">Nouvelle</span>
        </div>
        <Bar w="w-2/3" />
        <Bar w="w-1/2" />
        <Btn tone="light">WhatsApp</Btn>
        <Pulse>
          <Btn>Confirmer la commande</Btn>
        </Pulse>
      </Phone>
    ),
  },
  {
    title: "Suivre une réparation",
    staff: true,
    href: "/admin/reparations",
    cta: "Voir les réparations",
    points: [
      <>Les demandes de devis du site arrivent dans <strong>Réparations</strong> (REP-…).</>,
      <>Indiquez le <strong>prix du devis</strong>, puis <strong>Devis envoyé</strong> : le message WhatsApp contient le montant.</>,
      <>Passez à <strong>En cours</strong>, <strong>Prête</strong>, puis <strong>Récupérée</strong>. Les notes internes ne sont jamais montrées au client.</>,
    ],
    screen: (
      <Phone>
        <div className="flex items-center justify-between">
          <span className="text-[0.6rem] font-extrabold">REP-1007</span>
          <span className="rounded-full bg-raised px-1.5 text-[0.5rem] font-bold">Écran cassé</span>
        </div>
        <div className="rounded-xl bg-raised px-2 py-1 text-[0.6rem] font-bold">Devis : 25 000 FCFA</div>
        <Bar w="w-3/4" />
        <Pulse>
          <Btn tone="blue">Devis envoyé</Btn>
        </Pulse>
      </Phone>
    ),
  },
  {
    title: "Faire une promotion",
    adminOnly: true,
    href: "/admin/promotions",
    cta: "Ouvrir les promotions",
    points: [
      <>Un seul produit : mettez un <strong>prix promo</strong> sur sa fiche (dates facultatives).</>,
      <>Une catégorie ou tout le site : <strong>Promotions → Nouvelle promotion</strong>, en % ou en FCFA. Le prix baisse tout seul pendant les dates.</>,
      <>Pour vos clients fidèles : un <strong>code promo</strong> (ex. BIENVENUE10) à partager sur WhatsApp ; le bandeau d&apos;annonce (Paramètres) le fait connaître.</>,
    ],
    screen: (
      <Phone>
        <div className="relative h-14 rounded-xl bg-navy">
          <span className="absolute start-1.5 top-1.5 rounded-full bg-gold px-1.5 text-[0.55rem] font-bold text-on-gold">−10 %</span>
        </div>
        <p className="text-[0.6rem] font-bold">
          22 500 FCFA <span className="font-normal text-muted line-through">25 000</span>
        </p>
        <div className="rounded-lg border border-dashed border-gold px-2 py-1 text-center font-mono text-[0.6rem] font-bold text-gold-text">BIENVENUE10</div>
        <Btn>Nouvelle promotion</Btn>
      </Phone>
    ),
  },
  {
    title: "Régler la boutique et l'équipe",
    adminOnly: true,
    href: "/admin/parametres",
    cta: "Ouvrir les paramètres",
    points: [
      <>Dans <strong>Paramètres</strong> : numéros, horaires, adresse et lien Google Maps affichés sur le site.</>,
      <>Zones et frais de <strong>livraison</strong>, modes de <strong>paiement</strong>, et le <strong>bandeau</strong> en haut du site.</>,
      <>Le propriétaire ajoute ses employés dans <strong>Équipe</strong> : Gérant (tout) ou Vendeur (commandes, réparations, stock).</>,
    ],
    screen: (
      <Phone>
        <div className="rounded-full bg-gold px-2 py-1 text-center text-[0.55rem] font-bold text-on-gold">Bandeau : arrivage samedi !</div>
        <Row>
          <span className="text-[0.55rem] font-semibold">Tous les jours · 8h – 21h</span>
        </Row>
        <Row>
          <span className="flex-1 text-[0.55rem] font-semibold">moussa</span>
          <span className="rounded-full bg-accent px-1.5 text-[0.5rem] font-bold text-on-accent">Vendeur</span>
        </Row>
        <Btn tone="light">Enregistrer</Btn>
      </Phone>
    ),
  },
];

export function QuickGuide({ seller }: { seller: boolean }) {
  // Vendeur : ses trois écrans ; propriétaire et gérant : les 6 gestes principaux (le stock est dans « prix et stock »)
  const list = seller ? steps.filter((s) => s.staff) : steps.filter((s) => s.title !== "Mettre à jour le stock");
  return (
    <ol className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
      {list.map((s, i) => (
        <li key={s.title} className="flex flex-col gap-4 rounded-card bg-surface p-5 shadow-soft sm:flex-row sm:items-start">
          {s.screen}
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 text-lg font-extrabold">
              <span className="hex grid h-8 w-7 shrink-0 place-items-center bg-accent text-sm font-extrabold text-on-accent">{i + 1}</span>
              {s.title}
            </h2>
            <ul className="mt-3 space-y-2 text-[0.9375rem] leading-snug">
              {s.points.map((p, k) => (
                <li key={k} className="flex gap-2">
                  <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-gold" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <Link href={s.href} className={buttonClasses("light", "md", "mt-4 max-sm:w-full")}>
              {s.cta}
            </Link>
          </div>
        </li>
      ))}
    </ol>
  );
}
