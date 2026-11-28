// npm run test:e2e:clean : efface les données de test restées après un arrêt brutal.
import { loadEnvConfig } from "@next/env";
import { cleanup, service } from "./fixtures";

loadEnvConfig(process.cwd());
cleanup(service()).then((r) => console.log(`[e2e] nettoyage : ${r}`));
