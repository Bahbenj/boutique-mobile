import type { Metadata } from "next";
import { Suspense } from "react";
import { t } from "@/i18n";
import { getCustomer } from "@/lib/customer";
import { listMyAddresses } from "@/lib/customer-orders";
import { formatMlPhone } from "@/lib/phone";
import { getCheckoutSettings } from "@/lib/storefront";
import { Container } from "@/components/ui/Container";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export const metadata: Metadata = {
  title: t.checkout.title,
  robots: { index: false },
};

/**
 * Commande : réservée aux clients connectés (proxy.ts ; place_order revérifie).
 * Le formulaire est pré-rempli avec le profil du client.
 */
export default async function CheckoutPage() {
  // Zones, frais et paiements réglés dans /admin/parametres (en cache, invalidé à l'enregistrement)
  const settings = await getCheckoutSettings();
  return (
    <Container className="pt-28 pb-20 sm:pt-36 sm:pb-28">
      <h1 className="text-[clamp(2.75rem,10vw,5rem)] leading-[0.92] font-extrabold tracking-[-0.045em]">
        {t.checkout.title}
        <span className="text-gold">.</span>
      </h1>
      <p className="mt-4 mb-10 max-w-xl text-muted sm:text-lg">{t.checkout.lead}</p>
      {/* Squelette, pas un formulaire : un formulaire de repli serait remplacé à l'arrivée du profil,
          en effaçant ce que le client a déjà tapé (connexion lente). */}
      <Suspense fallback={<div className="skeleton h-96 rounded-card" aria-hidden="true" />}>
        <CheckoutWithProfile settings={settings} />
      </Suspense>
    </Container>
  );
}

async function CheckoutWithProfile({ settings }: { settings: Awaited<ReturnType<typeof getCheckoutSettings>> }) {
  const c = await getCustomer();
  const addresses = c ? await listMyAddresses() : [];
  return (
    <CheckoutForm
      settings={settings}
      addresses={addresses}
      profile={c ? { fullName: c.fullName, phone: c.phone ? formatMlPhone(c.phone) : "", email: c.email, zoneId: c.zoneId, city: c.city, address: c.address } : null}
    />
  );
}
