import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig, storeAddress, telHref } from "@/config/site";
import { LegalPage } from "@/components/sections/LegalPage";

export const metadata: Metadata = {
  title: "Retours et garantie",
  description: `Échanges, retours et garantie des produits achetés chez ${siteConfig.name}.`,
  alternates: { canonical: "/retours-garantie" },
};

/**
 * Texte TYPE, à faire valider par le client (TODO client) : délai de retour,
 * durée de garantie, conditions. La durée vient de config/site.ts → warrantyMonths.
 */
export default function ReturnsPage() {
  const { warrantyMonths, phone, name } = siteConfig;
  return (
    <LegalPage
      title="Retours et garantie"
      lead="Un souci avec un produit ? Voici comment nous le réglons, simplement."
      updated="novembre 2026"
    >
      <section>
        <h2>1. Échange ou retour sous 7 jours</h2>
        <p>
          Vous disposez de <strong>7 jours</strong> après la réception pour demander un échange ou un retour, si le produit est dans
          son état d&apos;origine : non utilisé, complet (boîte, accessoires, notices) et non endommagé.
        </p>
        <ul>
          <li>Contactez-nous d&apos;abord sur WhatsApp ou par téléphone avec votre numéro de commande.</li>
          <li>Rapportez le produit au magasin ({storeAddress}) ou convenons ensemble d&apos;un retrait.</li>
          <li>Après vérification, nous vous proposons un échange, un avoir ou un remboursement.</li>
        </ul>
        <p>
          Ne sont ni repris ni échangés : les produits utilisés ou abîmés par l&apos;usage, les protections d&apos;écran posées et les
          produits personnalisés à votre demande.
        </p>
      </section>

      <section>
        <h2>2. Produit défectueux à la réception</h2>
        <p>
          Vérifiez le colis devant le livreur avant de payer. Si un produit ne fonctionne pas ou est abîmé, signalez-le-nous sous 48
          heures : nous l&apos;échangeons sans frais.
        </p>
      </section>

      <section>
        <h2>3. Garantie</h2>
        <p>
          Les appareils neufs sont garantis <strong>{warrantyMonths.new} mois</strong> à compter de l&apos;achat, facture à l&apos;appui,
          contre les défauts de fabrication. Les accessoires peuvent avoir une garantie plus courte, indiquée sur leur fiche.
        </p>
        <p>La garantie ne couvre pas :</p>
        <ul>
          <li>la casse, les chocs, les rayures et l&apos;oxydation (contact avec un liquide) ;</li>
          <li>l&apos;usure normale, notamment de la batterie ;</li>
          <li>un appareil ouvert ou réparé par un tiers, ou une modification du logiciel non effectuée par nous.</li>
        </ul>
      </section>

      <section>
        <h2>4. Réparations</h2>
        <p>
          Chaque réparation fait l&apos;objet d&apos;un devis accepté avant intervention. La pièce remplacée est garantie contre les défauts
          pendant une durée indiquée sur le devis. Les dommages sans rapport avec la réparation effectuée ne sont pas couverts.
        </p>
      </section>

      <section>
        <h2>5. Nous contacter</h2>
        <p>
          {name}, {storeAddress}. Téléphone et WhatsApp :{" "}
          <a href={telHref(phone)} className="font-semibold text-accent underline-offset-4 hover:underline">
            {phone}
          </a>
          . Voir aussi nos <Link href="/cgv" className="font-semibold text-accent underline-offset-4 hover:underline">conditions générales de vente</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
