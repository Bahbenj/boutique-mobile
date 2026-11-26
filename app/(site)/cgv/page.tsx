import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { LegalPage } from "@/components/sections/LegalPage";
import { getStoreInfo } from "@/lib/storefront";
import { storeAddressOf } from "@/lib/store-info";

export const metadata: Metadata = {
  title: "Conditions générales de vente",
  description: `Conditions générales de vente de ${siteConfig.name} : commande, prix, livraison, paiement, retours.`,
  alternates: { canonical: "/cgv" },
};

/**
 * Texte TYPE, à faire valider par le client et, idéalement, par un juriste
 * (TODO client) : identité légale (forme, RCCM, NIF), droit applicable.
 */
export default async function TermsPage() {
  const store = await getStoreInfo();
  const { name } = siteConfig;
  const { email, phone } = store;
  const storeAddress = storeAddressOf(store);
  return (
    <LegalPage
      title="Conditions générales de vente"
      lead={`Les règles qui s'appliquent à vos achats chez ${name}, en ligne et au magasin.`}
      updated="novembre 2026"
    >
      <section>
        <h2>1. Le vendeur</h2>
        <p>
          {name}, {storeAddress}, Mali. Téléphone : {phone}.{email && ` E-mail : ${email}.`}
          {/* TODO client : forme juridique, numéro RCCM et NIF */}
          {" "}Numéro RCCM et NIF : à compléter.
        </p>
      </section>

      <section>
        <h2>2. Commandes</h2>
        <p>
          Vous commandez sur le site, sur WhatsApp, par téléphone ou au magasin. Une commande passée en ligne n&apos;est définitive
          qu&apos;après sa confirmation par un conseiller, par téléphone ou WhatsApp. Nous pouvons refuser une commande en cas de
          rupture de stock, d&apos;erreur manifeste de prix ou de coordonnées incomplètes.
        </p>
      </section>

      <section>
        <h2>3. Prix</h2>
        <p>
          Les prix sont indiqués en francs CFA (FCFA). Les frais de livraison sont affichés avant la validation de la commande et
          dépendent de la zone. Le prix applicable est celui affiché au moment de la commande, sauf erreur manifeste.
        </p>
      </section>

      <section>
        <h2>4. Paiement</h2>
        <p>
          Aucun paiement en ligne n&apos;est demandé sur le site. Vous payez à la livraison, après avoir vérifié le colis, ou au
          magasin. D&apos;autres moyens de paiement peuvent être proposés au moment de la confirmation.
        </p>
      </section>

      <section>
        <h2>5. Livraison</h2>
        <p>
          Nous livrons dans tout le Mali. Les délais sont indicatifs et dépendent de la zone. Vérifiez votre colis devant le livreur :
          un produit abîmé ou non conforme doit nous être signalé sous 48 heures. Le retrait au magasin est gratuit.
        </p>
      </section>

      <section>
        <h2>6. Retours et garantie</h2>
        <p>
          Les échanges, retours et la garantie sont décrits sur la page{" "}
          <Link href="/retours-garantie" className="font-semibold text-accent underline-offset-4 hover:underline">
            Retours et garantie
          </Link>
          .
        </p>
      </section>

      <section>
        <h2>7. Réparation et déblocage</h2>
        <p>
          Toute réparation est précédée d&apos;un devis. Le déblocage ne concerne que votre propre appareil (compte oublié, verrouillage
          d&apos;entreprise) et se fait sur présentation d&apos;une preuve d&apos;achat ou de propriété. Nous nous réservons le droit de
          refuser une demande. Pensez à sauvegarder vos données avant toute intervention : nous ne pouvons pas être tenus
          responsables de leur perte.
        </p>
      </section>

      <section>
        <h2>8. Données personnelles</h2>
        <p>
          Vos nom, téléphone et adresse servent uniquement à traiter votre commande et à vous contacter. Ils ne sont ni vendus ni
          cédés. Le site peut utiliser un outil de mesure publicitaire (Meta Pixel) pour connaître l&apos;efficacité de nos publicités.
          Pour toute question ou demande de suppression de vos données : {email}.
        </p>
      </section>

      <section>
        <h2>9. Litiges</h2>
        <p>
          Les présentes conditions sont soumises au droit malien. En cas de désaccord, nous cherchons d&apos;abord une solution amiable
          avec vous ; à défaut, les tribunaux compétents de Bamako pourront être saisis.
        </p>
      </section>
    </LegalPage>
  );
}
