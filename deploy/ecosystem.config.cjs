/**
 * PM2 : garde le site en marche (redémarrage en cas de plantage et au démarrage du serveur).
 * Utilisé par deploy/mise-a-jour.sh ; voir DEPLOIEMENT.md.
 *
 * UNE seule instance, volontairement : le cache du catalogue (« use cache ») est gardé
 * dans la mémoire du processus. Avec deux instances, une modification faite dans l'admin
 * ne viderait le cache que de l'une des deux, et l'autre afficherait d'anciens prix.
 * Pour plusieurs instances, il faudrait un cache partagé (Redis, cacheHandlers).
 */
const APP_DIR = process.env.APP_DIR || "/srv/mobile-empire";

module.exports = {
  apps: [
    {
      name: "mobile-empire",
      // « current » pointe vers la dernière version construite (deploy/mise-a-jour.sh)
      cwd: `${APP_DIR}/current`,
      script: "node_modules/next/dist/bin/next",
      // 127.0.0.1 : joignable seulement par Caddy / Nginx, jamais directement depuis Internet
      args: "start -H 127.0.0.1 -p 3000",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_memory_restart: "700M",
      kill_timeout: 8000,
      env: {
        NODE_ENV: "production",
        // Optimisation des images (sharp) sous Linux : évite une mémoire qui gonfle sans fin
        MALLOC_ARENA_MAX: "2",
        // Version en ligne (commit), posée par deploy/mise-a-jour.sh : voir deploymentId (next.config.ts)
        DEPLOYMENT_VERSION: process.env.DEPLOYMENT_VERSION || "",
      },
      time: true,
    },
  ],
};
