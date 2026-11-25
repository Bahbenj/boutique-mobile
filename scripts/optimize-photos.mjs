/**
 * Optimise les photos du client pour le web.
 *
 * Déposez les originaux (JPG, PNG, HEIC exporté en JPG…) dans
 * public/photos/originaux/ puis lancez :  npm run photos:optimize
 *
 * Pour chaque photo, produit dans public/photos/ des WebP en 640, 1280 et
 * 1920 px de large (sans jamais agrandir), qualité 78, métadonnées retirées
 * (localisation GPS comprise). Exemple : originaux/vitrine.jpg →
 * photos/vitrine-640.webp, vitrine-1280.webp, vitrine-1920.webp.
 * Utilisez ensuite "/photos/vitrine-1280.webp" dans le code ou l'admin :
 * next/image choisit lui-même la taille servie.
 *
 * Les originaux ne sont pas publiés tels quels : public/photos/originaux est
 * ignoré par git (voir .gitignore), gardez-en une copie ailleurs.
 * Ne téléchargez jamais d'images depuis Facebook : demandez les fichiers au client.
 */
import { mkdirSync, readdirSync } from "node:fs";
import { basename, extname, join } from "node:path";

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.error("Le module « sharp » est introuvable. Installez-le : npm install --save-dev sharp");
  process.exit(1);
}

const root = join(process.cwd(), "public", "photos");
const source = join(root, "originaux");
mkdirSync(source, { recursive: true });

const widths = [640, 1280, 1920];
const files = readdirSync(source).filter((f) => /\.(jpe?g|png|webp|avif|tiff?)$/i.test(f));
if (!files.length) {
  console.log("Aucune photo dans public/photos/originaux/.");
  process.exit(0);
}

const slug = (name) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

for (const file of files) {
  const name = slug(basename(file, extname(file)));
  const input = sharp(join(source, file)).rotate(); // applique l'orientation EXIF
  const { width = 0 } = await input.metadata();
  const sizes = widths.filter((w) => w <= width);
  if (!sizes.length) sizes.push(width); // photo plus petite que 640 px : taille d'origine
  for (const w of sizes) {
    const out = join(root, `${name}-${w}.webp`);
    const info = await input.clone().resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toFile(out);
    console.log(`${file} → photos/${name}-${w}.webp (${Math.round(info.size / 1024)} Ko)`);
  }
}
