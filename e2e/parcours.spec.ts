import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { E2E, createUser, runId, service } from "./fixtures";

/**
 * Parcours complet, dans l'ordre d'une vraie journée :
 *   admin   crée une catégorie et un produit (photo envoyée au stockage)
 *   client  s'inscrit (contrôles du formulaire), se connecte, commande avec une
 *           nouvelle adresse enregistrée au carnet, retrouve sa commande
 *   admin   confirme puis livre la commande, ajuste le stock, crée un code promo
 *   client  note le produit livré ; admin publie l'avis ; la fiche l'affiche
 *   visiteur demande un devis de réparation ; admin le fait avancer
 *   admin   parcourt toutes les pages (aucune erreur)
 * Comptes créés confirmés par la clé de service (aucun e-mail envoyé), tout est
 * effacé à la fin (global-teardown).
 */

const sb = service();
const RUN = runId();
const CATEGORY = `E2E Catégorie ${RUN}`;
const PRODUCT = `E2E Écouteurs test ${RUN}`;
const PHOTO = "public/photos/ecouteurs-conduction-yesido-640.webp";

let admin: { id: string; email: string };
let customer: { id: string; email: string };
let adminCtx: BrowserContext;
let customerCtx: BrowserContext;
let a: Page; // admin, écran d'ordinateur
let c: Page; // client, téléphone 390 px
let productSlug = "";
let orderNumber = "";

/** Erreurs JavaScript de la page : un parcours ne doit en produire aucune. */
const watchErrors = (page: Page, sink: string[]) => {
  page.on("pageerror", (e) => sink.push(`${page.url()} : ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource|favicon|net::ERR_/.test(m.text())) sink.push(`${page.url()} : ${m.text()}`);
  });
};
const errors: string[] = [];

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  admin = await createUser(sb, "admin", { role: "owner", fullName: "Gérant E2E" });
  customer = await createUser(sb, "client", { fullName: "Client E2E", phone: E2E.customerPhone });
  adminCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  customerCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, permissions: ["geolocation"], geolocation: { latitude: 12.6392, longitude: -8.0029 } });
  a = await adminCtx.newPage();
  c = await customerCtx.newPage();
  watchErrors(a, errors);
  watchErrors(c, errors);
});

test.afterAll(async () => {
  await adminCtx?.close();
  await customerCtx?.close();
});

const toast = (page: Page, text: string | RegExp) => expect(page.getByRole("status").filter({ hasText: text }).first()).toBeVisible();

test("admin : connexion", async () => {
  await a.goto("/admin/login");
  await a.getByLabel("E-mail").fill(admin.email);
  await a.getByLabel("Mot de passe", { exact: true }).fill(E2E.password);
  await a.getByRole("button", { name: "Se connecter" }).click();
  await expect(a).toHaveURL(/\/admin\/?$/);
  await expect(a.getByRole("heading", { level: 1 })).toBeVisible();
});

test("admin : catégorie puis produit avec photo", async () => {
  await a.goto("/admin/categories");
  await a.getByRole("button", { name: "Nouvelle catégorie" }).click();
  await a.getByLabel("Nom *").fill(CATEGORY);
  await a.getByRole("button", { name: "Créer la catégorie" }).click();
  await toast(a, "Catégorie créée");

  await a.goto("/admin/produits/nouveau");
  // Vrai sélecteur de fichiers : attend que la page soit interactive
  const chooser = a.waitForEvent("filechooser");
  await a.getByRole("button", { name: "Choisir dans la galerie" }).click();
  await (await chooser).setFiles(PHOTO);
  await expect(a.locator("[data-photo-index]").first()).toBeVisible({ timeout: 30_000 });
  await a.getByLabel("Nom du produit *").fill(PRODUCT);
  await a.getByLabel("Catégorie *").selectOption({ label: CATEGORY });
  await a.getByLabel("Prix *").fill("5000");
  await a.getByLabel("Quantité en stock").fill("20");
  await a.getByRole("button", { name: "Ajouter le produit" }).click();
  await expect(a).toHaveURL(/\/admin\/produits\/[0-9a-f-]{36}$/);
  const { data } = await sb.from("products").select("slug, price, stock, is_active").eq("name", PRODUCT).single();
  expect(data).toMatchObject({ price: 5000, stock: 20, is_active: true });
  productSlug = data!.slug;
  expect(productSlug.startsWith(E2E.slugPrefix)).toBe(true);
});

test("site : le produit est en ligne (boutique, catégorie, fiche)", async () => {
  await c.goto("/boutique");
  await expect(c.getByText(PRODUCT).first()).toBeVisible();
  await c.goto(`/produit/${productSlug}`);
  await expect(c.getByRole("heading", { level: 1, name: PRODUCT })).toBeVisible();
  await expect(c.getByText(/5\s000/).first()).toBeVisible();
});

test("inscription : contrôles du formulaire", async () => {
  await c.goto("/compte/inscription");
  const form = c.locator("form").filter({ has: c.getByRole("button", { name: "Créer mon compte" }) });
  await form.getByLabel("Nom complet").fill("Client E2E");
  await form.getByLabel("E-mail").fill(`${E2E.emailPrefix}inscription-${RUN}${E2E.emailDomain}`);
  await form.getByLabel("Téléphone").fill("123");
  await form.getByLabel("Mot de passe (8 caractères au moins)", { exact: true }).fill("court");
  await form.getByRole("button", { name: "Créer mon compte" }).click();
  // Refus avant tout envoi : numéro, mot de passe, CGV
  await expect(c.getByText(/8 chiffres/).first()).toBeVisible();
  const { data } = await sb.auth.admin.listUsers({ perPage: 200 });
  expect(data.users.some((u) => u.email === `${E2E.emailPrefix}inscription-${RUN}${E2E.emailDomain}`)).toBe(false);
});

test("commande : panier, connexion exigée, nouvelle adresse enregistrée au carnet", async () => {
  await c.goto(`/produit/${productSlug}`);
  await c.getByRole("button", { name: "Ajouter au panier" }).first().click();
  await c.goto("/commande");
  // Session exigée : redirection vers la connexion, retour à la commande ensuite
  await expect(c).toHaveURL(/\/compte\/connexion\?next=%2Fcommande/);
  const login = c.locator("form").filter({ has: c.getByRole("button", { name: "Se connecter" }) });
  await login.getByLabel("E-mail").fill(customer.email);
  await login.getByLabel("Mot de passe", { exact: true }).fill(E2E.password);
  await login.getByRole("button", { name: "Se connecter" }).click();
  await expect(c).toHaveURL(/\/commande$/);

  await expect(c.getByText(PRODUCT).first()).toBeVisible();
  // Formulaire pré-rempli par le profil du compte
  await expect(c.getByLabel("Nom et prénom")).toHaveValue("Client E2E");
  await c.getByLabel("Nom et prénom").fill("Client E2E");
  await c.getByLabel("Téléphone").first().fill("70 00 00 01");
  await c.getByLabel("Région / commune").selectOption({ index: 1 });
  await c.getByLabel("Ville").fill("Kalaban Coura");
  await c.getByLabel("Adresse (rue, numéro, repère)").fill("Rue 45, porte 12, derrière la pharmacie");
  await c.getByLabel("Consignes pour le livreur (facultatif)").fill("Appeler en arrivant");
  const save = c.getByLabel("Enregistrer cette adresse dans mon carnet");
  if (!(await save.isChecked())) await save.check();
  await c.getByLabel("Nom de l'adresse (facultatif)").fill("Maison E2E");

  const popup = customerCtx.waitForEvent("page", { timeout: 10_000 }).catch(() => null);
  await c.getByRole("button", { name: "Valider la commande" }).click();
  const title = c.getByRole("heading", { name: /Commande CMD-\d+ enregistrée/ });
  await expect(title).toBeVisible({ timeout: 30_000 });
  orderNumber = (await title.textContent())!.match(/CMD-\d+/)![0];
  await (await popup)?.close();
  await expect(c.getByRole("link", { name: "Envoyer sur WhatsApp" })).toHaveAttribute("href", /wa\.me/);

  const { data: order } = await sb.from("orders").select("total, user_id, delivery_instructions, status").eq("number", orderNumber).single();
  expect(order).toMatchObject({ user_id: customer.id, delivery_instructions: "Appeler en arrivant", status: "nouvelle" });
  const { data: book } = await sb.from("customer_addresses").select("label").eq("user_id", customer.id);
  expect(book?.map((b) => b.label)).toContain("Maison E2E");
  const { data: p } = await sb.from("products").select("stock").eq("slug", productSlug).single();
  expect(p!.stock).toBe(19);
});

test("mon compte : commande, adresse et suivi", async () => {
  await c.goto("/compte");
  await expect(c.getByText(orderNumber).first()).toBeVisible();
  await expect(c.getByText("Maison E2E").first()).toBeVisible();
  await c.goto("/compte/commandes");
  await c.getByText(orderNumber).first().click();
  await expect(c).toHaveURL(/\/compte\/commandes\/[0-9a-f-]{36}$/);
  await expect(c.getByText(PRODUCT).first()).toBeVisible();
});

test("admin : la commande avance jusqu'à « Livrée »", async () => {
  await a.goto("/admin/commandes");
  await a.getByText(orderNumber).first().click();
  await expect(a.getByText("Appeler en arrivant").first()).toBeVisible();
  await expect(a.getByText(customer.email).first()).toBeVisible();
  for (const step of ["Confirmer la commande", "Marquer comme expédiée", "Marquer comme livrée"]) {
    await a.getByRole("button", { name: step }).click();
    await toast(a, /./);
  }
  await expect.poll(async () => (await sb.from("orders").select("status").eq("number", orderNumber).single()).data?.status).toBe("livree");
  await expect(a.getByRole("button", { name: "Demander un avis" }).or(a.getByRole("link", { name: "Demander un avis" })).first()).toBeVisible();
});

test("client : avis sur le produit livré (achat vérifié)", async () => {
  await c.goto(`/compte/avis?produit=${productSlug}`);
  await c.getByRole("radio", { name: /^4 étoiles/ }).click();
  await c.getByLabel("Titre (facultatif)").fill("Très bon test");
  await c.getByLabel("Votre avis *").fill("Produit conforme, livraison rapide, je recommande.");
  await c.getByText("Oui", { exact: true }).click();
  await c.getByRole("button", { name: /Publier/ }).click();
  await expect(c.getByText(/Merci/).first()).toBeVisible();
  const { data } = await sb.from("product_reviews").select("status, verified_purchase").eq("user_id", customer.id).single();
  expect(data).toMatchObject({ status: "pending", verified_purchase: true });
});

test("admin : publie l'avis, la fiche produit l'affiche", async () => {
  await a.goto("/admin/avis?onglet=produits");
  await a.getByRole("button", { name: "Publier" }).first().click();
  await expect.poll(async () => (await sb.from("product_reviews").select("status").eq("user_id", customer.id).single()).data?.status).toBe("published");
  await c.goto(`/produit/${productSlug}`);
  await expect(c.getByText("Très bon test")).toBeVisible();
  await expect(c.getByText("Achat vérifié").first()).toBeVisible();
});

test("réparation : demande de devis, puis suivi dans l'admin", async () => {
  await c.goto("/reparation#devis");
  await c.getByLabel("Votre nom").fill("Client E2E");
  await c.getByLabel("Téléphone (WhatsApp)").fill("70 00 00 02");
  await c.getByLabel("Modèle du téléphone").fill("Tecno Spark 10");
  await c.getByLabel("Panne constatée").fill("Écran fissuré, tactile qui ne répond plus.");
  await c.waitForTimeout(3_200); // délai anti-robots du formulaire
  const popup = customerCtx.waitForEvent("page", { timeout: 10_000 }).catch(() => null);
  await c.getByRole("button", { name: /WhatsApp|Envoyer/ }).last().click();
  await expect(c.getByText(/REP-\d+/).first()).toBeVisible({ timeout: 30_000 });
  await (await popup)?.close();
  const number = (await c.getByText(/REP-\d+/).first().textContent())!.match(/REP-\d+/)![0];

  await a.goto("/admin/reparations");
  await a.getByText(number).first().click();
  await a.getByLabel("Prix du devis (FCFA)").fill("15000");
  await a.getByLabel("Notes internes").fill("Note interne e2e");
  await a.getByRole("button", { name: /^Enregistrer/ }).first().click();
  await toast(a, /./);
  await expect.poll(async () => (await sb.from("repair_requests").select("quote_amount").eq("number", number).single()).data?.quote_amount).toBe(15000);
});

test("admin : stock ajusté avec motif, puis historique", async () => {
  await a.goto("/admin/stock");
  const row = a.getByText(PRODUCT).first();
  await expect(row).toBeVisible();
  await a.getByRole("button", { name: `Ajouter 1 au stock de ${PRODUCT}` }).click();
  await a.getByLabel("Motif du changement (facultatif)").fill("Arrivage e2e");
  // Le bouton de la ligne modifiée (celui du seuil d'alerte reste désactivé)
  await a.getByRole("button", { name: "Enregistrer", exact: true }).and(a.locator(":enabled")).click();
  await expect.poll(async () => (await sb.from("products").select("stock").eq("slug", productSlug).single()).data?.stock).toBe(20);
  // Historique : l'ajustement et son motif
  await a.getByRole("tab", { name: /Historique/ }).click();
  await expect(a.getByText("Arrivage e2e").first()).toBeVisible();
});

test("admin : code promo créé", async () => {
  await a.goto("/admin/promotions");
  await a.getByRole("button", { name: "Nouveau code" }).click();
  await a.getByLabel("Code *").fill(`${E2E.promoPrefix}${RUN}`.toUpperCase().slice(0, 20));
  await a.getByLabel("Pourcentage de remise").fill("10");
  await a.getByRole("button", { name: "Créer le code" }).click();
  await expect.poll(async () => (await sb.from("promo_codes").select("code").like("code", `${E2E.promoPrefix}%`)).data?.length).toBe(1);
});

test("admin : chaque page s'ouvre sans erreur", async () => {
  const pages = ["/admin", "/admin/commandes", "/admin/produits", "/admin/categories", "/admin/promotions", "/admin/stock", "/admin/reparations", "/admin/clients", "/admin/avis", "/admin/parametres", "/admin/journal", "/admin/aide", "/admin/compte"];
  for (const p of pages) {
    const res = await a.goto(p);
    expect(res?.status(), p).toBeLessThan(400);
    await expect(a.getByRole("heading", { level: 1 }).first(), p).toBeVisible();
    await expect(a.getByText(/Application error|Une erreur est survenue/i)).toHaveCount(0);
  }
  // Le journal garde la trace des actions du gérant
  await a.goto("/admin/journal");
  await expect(a.getByText(PRODUCT).first()).toBeVisible();
});

test("client : un client n'entre pas dans l'admin", async () => {
  await c.goto("/admin");
  await expect(c).not.toHaveURL(/\/admin\/?$/);
});

test("vendeur : commandes, réparations et stock seulement", async ({ browser }) => {
  const seller = await createUser(sb, "vendeur", { role: "seller", fullName: "Vendeur E2E" });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const v = await ctx.newPage();
  watchErrors(v, errors);
  await v.goto("/admin/login");
  await v.getByLabel("E-mail").fill(seller.email);
  await v.getByLabel("Mot de passe", { exact: true }).fill(E2E.password);
  await v.getByRole("button", { name: "Se connecter" }).click();
  await expect(v).toHaveURL(/\/admin\/commandes/);
  for (const p of ["/admin/produits", "/admin/parametres", "/admin/journal"]) {
    await v.goto(p);
    await expect(v, p).toHaveURL(/\/admin\/commandes/);
  }
  await v.goto("/admin/stock");
  await expect(v).toHaveURL(/\/admin\/stock/);
  await ctx.close();
});

test("client : suppression du compte refusée tant qu'une réparation est en cours, puis acceptée", async () => {
  await c.goto("/compte/supprimer");
  await c.getByLabel("Pour confirmer, tapez SUPPRIMER").fill("SUPPRIMER");
  await c.getByRole("button", { name: "Supprimer définitivement mon compte" }).click();
  await expect(c.getByText(/Une réparation est encore en cours/)).toBeVisible();

  await sb.from("repair_requests").update({ status: "recuperee" }).eq("phone", E2E.repairPhone);
  await c.getByLabel("Pour confirmer, tapez SUPPRIMER").fill("SUPPRIMER");
  await c.getByRole("button", { name: "Supprimer définitivement mon compte" }).click();
  await expect(c).toHaveURL(/compte=supprime/);
  const { data } = await sb.auth.admin.getUserById(customer.id);
  expect(data.user).toBeNull();
  // La commande livrée reste, détachée du compte
  const { data: order } = await sb.from("orders").select("user_id").eq("number", orderNumber).single();
  expect(order?.user_id).toBeNull();
});

test("pages introuvables en français (adresse inconnue, produit retiré)", async () => {
  const res = await c.goto("/adresse-qui-n-existe-pas");
  expect(res?.status()).toBe(404);
  await expect(c.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  await c.goto("/produit/produit-qui-n-existe-pas");
  await expect(c.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  await expect(c.getByRole("link", { name: /Voir la boutique/ }).first()).toBeVisible();
});

test("aucune erreur JavaScript pendant les parcours", async () => {
  expect(errors).toEqual([]);
});
