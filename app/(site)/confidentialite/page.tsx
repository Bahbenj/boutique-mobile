import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { LegalPage } from "@/components/sections/LegalPage";
import { pixelEnabled } from "@/lib/meta-pixel";
import { getStoreInfo } from "@/lib/storefront";
import { storeAddressOf } from "@/lib/store-info";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: `Comment ${siteConfig.name} collecte, utilise et protège vos données personnelles, et comment supprimer votre compte.`,
  alternates: { canonical: "/confidentialite" },
};

/**
 * Texte TYPE, à faire valider par le client (et idéalement un juriste) : TODO client
 * signalés dans le code et dans le README (durées de conservation, hébergeur,
 * déclaration auprès de l'APDP).
 */
export default async function PrivacyPage() {
  const store = await getStoreInfo();
  const { name } = siteConfig;
  const contact = [store.phone && `téléphone ou WhatsApp ${store.phone}`, store.email && `e-mail ${store.email}`].filter(Boolean).join(", ");
  return (
    <LegalPage
      title="Politique de confidentialité"
      lead={`Quelles données ${name} recueille quand vous utilisez ce site, pourquoi, combien de temps, et comment les faire supprimer.`}
      updated="novembre 2026"
    >
      <section>
        <h2>1. Qui est responsable de vos données</h2>
        <p>
          {name}, {storeAddressOf(store)}, Mali. Pour toute question sur vos données : {contact}.
        </p>
      </section>

      <section>
        <h2>2. Les données que nous recueillons</h2>
        <ul>
          <li>
            <strong>Votre compte</strong> : nom, adresse e-mail, numéro de téléphone, et votre mot de passe (enregistré chiffré : personne, pas même nous, ne peut le lire). Si
            vous vous connectez avec Google, nous recevons seulement votre nom et votre adresse e-mail.
          </li>
          <li>
            <strong>Vos commandes</strong> : articles, montants, zone, quartier et adresse de livraison, mode de paiement choisi, remarques.
          </li>
          <li>
            <strong>Vos demandes de réparation</strong> : nom, téléphone, modèle de l&apos;appareil et panne décrite.
          </li>
          <li>
            <strong>Données techniques</strong> : un cookie de session pour rester connecté, votre panier gardé dans votre navigateur, et une empreinte chiffrée de votre
            adresse IP pour bloquer les robots (l&apos;adresse elle-même n&apos;est jamais enregistrée).
          </li>
        </ul>
        <p>Nous ne collectons aucune donnée de paiement : aucun paiement ne se fait sur le site.</p>
      </section>

      <section>
        <h2>3. Pourquoi nous les utilisons</h2>
        <ul>
          <li>Préparer, livrer et suivre vos commandes et vos réparations, et vous contacter à leur sujet (appel, SMS, WhatsApp).</li>
          <li>Vous permettre de retrouver vos commandes et de commander plus vite (adresse enregistrée).</li>
          <li>Protéger le site contre les abus (tentatives de connexion répétées, faux comptes).</li>
          <li>Tenir notre comptabilité, comme la loi nous y oblige.</li>
          {pixelEnabled && <li>Mesurer l&apos;efficacité de nos publicités sur Facebook et Instagram (Meta Pixel : pages vues, ajouts au panier, commandes).</li>}
        </ul>
        <p>Nous ne vendons jamais vos données et ne les utilisons pas pour vous envoyer de la publicité sans votre accord.</p>
      </section>

      <section>
        <h2>4. Qui peut y accéder</h2>
        <ul>
          <li>L&apos;équipe de {name}, seulement pour ce dont elle a besoin (un vendeur voit les commandes, pas les réglages de la boutique).</li>
          <li>
            Nos prestataires techniques, qui hébergent le site et la base de données (Supabase) et, si vous l&apos;utilisez, la connexion avec Google. Leurs serveurs peuvent
            se trouver hors du Mali.
            {/* TODO client : préciser l'hébergeur du site (ex. Vercel) et la région de la base Supabase */}
          </li>
          {pixelEnabled && <li>Meta (Facebook), pour la mesure de nos publicités.</li>}
        </ul>
      </section>

      <section>
        <h2>5. Combien de temps nous les gardons</h2>
        {/* TODO client : faire valider ces durées */}
        <ul>
          <li>
            <strong>Compte</strong> : tant qu&apos;il existe. Vous pouvez le supprimer à tout moment.
          </li>
          <li>
            <strong>Commandes</strong> : 10 ans, pour la comptabilité (règles comptables OHADA). Après suppression du compte, elles ne sont plus rattachées à vous.
          </li>
          <li>
            <strong>Demandes de réparation</strong> : 3 ans après la dernière intervention (garantie et suivi).
          </li>
          <li>
            <strong>Empreintes anti-robots</strong> : 24 heures au plus.
          </li>
        </ul>
      </section>

      <section>
        <h2>6. Vos droits</h2>
        <p>
          Vous pouvez consulter et corriger vos informations dans{" "}
          <Link href="/compte" className="font-semibold text-accent underline-offset-4 hover:underline">
            Mon compte
          </Link>
          , et{" "}
          <Link href="/compte/supprimer" className="font-semibold text-accent underline-offset-4 hover:underline">
            supprimer votre compte et vos données
          </Link>{" "}
          vous-même, à tout moment (sauf commande ou réparation en cours). Pour toute autre demande (copie de vos données, opposition), contactez-nous : {contact}.
        </p>
        <p>
          Conformément à la loi malienne n° 2013-015 du 21 mai 2013 sur la protection des données à caractère personnel, vous pouvez aussi saisir l&apos;Autorité de
          Protection des Données à caractère Personnel (APDP).
        </p>
      </section>

      <section>
        <h2>7. Sécurité</h2>
        <p>
          Accès chiffré (HTTPS), mots de passe chiffrés, chaque client ne voit que ses propres commandes, et l&apos;équipe n&apos;accède qu&apos;aux écrans de son rôle. Aucun
          système n&apos;est infaillible : prévenez-nous si vous remarquez quelque chose d&apos;anormal sur votre compte.
        </p>
      </section>

      <section>
        <h2>8. Modifications</h2>
        <p>Nous pouvons mettre à jour cette page ; la date en haut indique la dernière version. En cas de changement important, nous vous en informerons.</p>
      </section>
    </LegalPage>
  );
}
