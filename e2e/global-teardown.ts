import { cleanup, service } from "./fixtures";

/** Après les parcours, même en cas d'échec : efface toutes les données e2e. */
export default async function globalTeardown() {
  if (process.env.E2E_KEEP === "1") return console.log("[e2e] E2E_KEEP=1 : données de test conservées");
  console.log(`[e2e] nettoyage : ${await cleanup(service())}`);
}
