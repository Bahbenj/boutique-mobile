import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { repairStatusLabels } from "@/lib/admin/repairs-shared";
import { getCustomer, profileComplete } from "@/lib/customer";
import { listMyAddresses, listMyOrders, listMyRepairs, listMyReviews, reviewStatus } from "@/lib/customer-orders";
import { AddressBook } from "@/components/account/AddressBook";
import { formatMlPhone } from "@/lib/phone";
import { getCheckoutSettings } from "@/lib/storefront";
import { formatPrice } from "@/lib/utils";
import { MyInfoForm, SignOutButton } from "@/components/account/AccountForms";
import { Alert } from "@/components/account/AuthForms";
import { OrderCard, formatDay } from "@/components/account/OrderBits";
import { Stars } from "@/components/product/Stars";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = { title: "Mon compte", robots: { index: false } };

/** Mon compte : commandes, réparations, informations, déconnexion, suppression. */
export default function AccountPage({ searchParams }: PageProps<"/compte">) {
  return (
    <Container className="pt-28 pb-20 sm:pt-36 sm:pb-28">
      <Suspense fallback={<div className="skeleton h-96 rounded-card" />}>
        <Account searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

function Section({ title, action, children, id }: { title: string; action?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-28 rounded-card bg-surface p-5 shadow-soft sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

async function Account({ searchParams }: Pick<PageProps<"/compte">, "searchParams">) {
  const customer = await getCustomer();
  if (!customer) redirect("/compte/connexion?next=/compte");
  if (!profileComplete(customer)) redirect("/compte/completer?next=/compte");
  const [sp, orders, repairs, settings, { reviews, toReview }, addresses] = await Promise.all([
    searchParams,
    listMyOrders(5),
    listMyRepairs(),
    getCheckoutSettings(),
    listMyReviews(),
    listMyAddresses(),
  ]);
  const first = customer.fullName.split(" ")[0];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[clamp(2.25rem,9vw,3.5rem)] leading-[0.95] font-extrabold tracking-[-0.04em]">
            Bonjour {first}
            <span className="text-gold">.</span>
          </h1>
          <p className="mt-2 truncate text-muted">{customer.email}</p>
        </div>
        <SignOutButton className="max-sm:w-full" />
      </header>

      {sp["mot-de-passe"] === "change" && <Alert tone="ok">Mot de passe changé.</Alert>}

      <Section
        title="Mes commandes"
        action={
          orders.length > 0 && (
            <Link href="/compte/commandes" className="text-sm font-semibold text-accent underline-offset-4 hover:underline">
              Tout voir
            </Link>
          )
        }
      >
        {orders.length ? (
          <ul className="space-y-2">
            {orders.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </ul>
        ) : (
          <div className="text-center">
            <p className="text-muted">Pas encore de commande.</p>
            <Link href="/boutique" className={buttonClasses("primary", "md", "mt-3")}>
              Voir la boutique
            </Link>
          </div>
        )}
      </Section>

      {toReview.length > 0 && (
        <Section title="Vos produits reçus : votre avis compte">
          <ul className="space-y-2">
            {toReview.map((p) => (
              <li key={p.product_id} className="flex items-center gap-3 rounded-2xl bg-raised/50 p-3 ring-1 ring-line">
                <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-raised">
                  {p.image && <Image src={p.image} alt="" fill sizes="48px" className="object-cover" />}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
                <Link href={`/compte/avis?produit=${p.slug}`} className={buttonClasses("primary", "sm", "shrink-0")}>
                  Noter
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Mes avis" id="avis">
        {reviews.length ? (
          <ul className="space-y-2">
            {reviews.map((r) => {
              const st = reviewStatus[r.status];
              return (
                <li key={r.id} className="rounded-2xl bg-raised/50 p-3 ring-1 ring-line">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link href={`/produit/${r.product_slug}`} className="font-bold hover:underline">
                      {r.product_name}
                    </Link>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        st.tone === "on" && "bg-success/15 text-success",
                        st.tone === "wait" && "bg-accent-soft ring-1 ring-accent/40",
                        st.tone === "off" && "bg-danger-soft text-danger",
                      )}
                    >
                      {st.label}
                    </span>
                  </div>
                  <p className="mt-1 flex items-center gap-2 text-sm text-muted">
                    <Stars value={r.rating} size={14} />
                    {r.title || "Sans titre"}
                  </p>
                  {r.status === "rejected" && r.reject_reason && <p className="mt-1 text-sm">Motif : {r.reject_reason}</p>}
                  {r.reply && <p className="mt-1 text-sm text-muted">Réponse de la boutique : {r.reply}</p>}
                  <Link href={`/compte/avis?produit=${r.product_slug}`} className="mt-2 inline-flex min-h-9 items-center text-sm font-semibold text-accent underline-offset-4 hover:underline">
                    Modifier ou supprimer
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted">Vous n&apos;avez pas encore donné d&apos;avis. Après une commande livrée, vos produits apparaissent ici pour être notés.</p>
        )}
      </Section>

      <Section
        title="Mes réparations"
        action={
          <Link href="/reparation#devis" className="text-sm font-semibold text-accent underline-offset-4 hover:underline">
            Demander un devis
          </Link>
        }
      >
        {repairs.length ? (
          <ul className="space-y-2">
            {repairs.map((r) => (
              <li key={r.id} className="rounded-2xl bg-raised/50 p-3 ring-1 ring-line">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-bold">{r.number}</span>
                  <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold ring-1 ring-accent/40">{repairStatusLabels[r.status]}</span>
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  {r.device} · {formatDay(r.created_at)}
                  {r.quote_amount != null && ` · devis ${formatPrice(r.quote_amount)}`}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">Aucune demande de réparation pour l&apos;instant.</p>
        )}
      </Section>

      <Section title="Mes adresses de livraison" id="adresses">
        <AddressBook addresses={addresses} zones={settings.zones} defaults={{ name: customer.fullName, phone: customer.phone ? formatMlPhone(customer.phone) : "" }} />
      </Section>

      <Section title="Mes informations">
        <p className="mb-4 text-sm text-muted">Elles remplissent automatiquement votre prochaine commande.</p>
        <MyInfoForm
          info={{ fullName: customer.fullName, phone: customer.phone ? formatMlPhone(customer.phone) : "", zoneId: customer.zoneId, city: customer.city, address: customer.address }}
          zones={settings.zones}
        />
      </Section>

      <Section title="Sécurité et confidentialité">
        <ul className="space-y-2 text-[0.9375rem]">
          <li>
            <Link href="/compte/nouveau-mot-de-passe" className="font-semibold text-accent underline-offset-4 hover:underline">
              {customer.provider === "google" ? "Ajouter un mot de passe" : "Changer mon mot de passe"}
            </Link>
          </li>
          <li>
            <Link href="/confidentialite" className="font-semibold text-accent underline-offset-4 hover:underline">
              Politique de confidentialité
            </Link>
          </li>
          <li>
            <Link href="/compte/supprimer" className="font-semibold text-danger underline-offset-4 hover:underline">
              Supprimer mon compte et mes données
            </Link>
          </li>
        </ul>
      </Section>
    </div>
  );
}
