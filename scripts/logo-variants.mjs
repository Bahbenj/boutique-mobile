/**
 * Variantes du logo à partir de public/brand/logo-mobile-empire-bleu.jpg
 * (logo d'origine : texte noir et éclairs bleus sur fond blanc).
 *  - logo-mobile-empire-bleu.png : version d'origine, marges blanches retirées
 *    (bon de livraison, fonds clairs)
 *  - logo-mobile-empire-clair.png : pour le thème sombre, fond transparent,
 *    texte noir passé en blanc, bleu conservé
 * Usage : node scripts/logo-variants.mjs
 */
import sharp from "sharp";
import { join } from "node:path";

const dir = join(process.cwd(), "public", "brand");
const src = join(dir, "logo-mobile-empire-bleu.jpg");

// Marges blanches retirées (avec un petit liseré)
const trimmed = await sharp(src).trim({ background: "#ffffff", threshold: 30 }).extend({ top: 12, bottom: 12, left: 12, right: 12, background: "#ffffff" }).toBuffer();
await sharp(trimmed).png().toFile(join(dir, "logo-mobile-empire-bleu.png"));

const { data, info } = await sharp(trimmed).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const out = Buffer.alloc(info.width * info.height * 4);
for (let p = 0, q = 0; p < data.length; p += 3, q += 4) {
  const [r, g, b] = [data[p], data[p + 1], data[p + 2]];
  const blue = b - r > 18; // pixel « bleu » du logo, bords adoucis compris (le gris a r ≈ b)
  if (blue) {
    // Couleur bleue conservée ; opacité selon l'écart au blanc (bords lissés)
    const alpha = Math.min(255, (255 - Math.min(r, g)) * 1.4);
    const k = alpha / 255;
    // « dé-mélange » du blanc pour garder un bleu pur sur fond sombre
    out[q] = Math.max(0, Math.min(255, (r - 255 * (1 - k)) / k));
    out[q + 1] = Math.max(0, Math.min(255, (g - 255 * (1 - k)) / k));
    out[q + 2] = Math.max(0, Math.min(255, (b - 255 * (1 - k)) / k));
    out[q + 3] = alpha;
  } else {
    // Noir → blanc ; opacité = noirceur (le blanc du fond devient transparent)
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    out[q] = out[q + 1] = out[q + 2] = 255;
    out[q + 3] = Math.max(0, Math.min(255, (255 - lum) * 1.15));
  }
}
await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(join(dir, "logo-mobile-empire-clair.png"));
console.log(`logos : ${info.width}×${info.height} px (bleu d'origine recadré, variante claire transparente)`);

// Déclinaisons horizontales (petites tailles : barre de navigation, admin) :
// bande du nom et du sous-titre seulement, détectée sur la variante claire.
{
  const clair = join(dir, "logo-mobile-empire-clair.png");
  const { data: px, info: meta } = await sharp(clair).raw().toBuffer({ resolveWithObject: true });
  const rows = [];
  for (let y = 0; y < meta.height; y++) {
    let n = 0;
    for (let x = 0; x < meta.width; x++) {
      const i = (y * meta.width + x) * 4;
      if (px[i] > 230 && px[i + 1] > 230 && px[i + 2] > 230 && px[i + 3] > 128) n++;
    }
    if (n > 20) rows.push(y);
  }
  const top = Math.max(0, rows[0] - 10);
  const height = Math.min(meta.height - top, rows.at(-1) - rows[0] + 20);
  for (const name of ["logo-mobile-empire-clair", "logo-mobile-empire-bleu"]) {
    // extract puis trim en deux passes (sharp applique sinon trim avant extract)
    const band = await sharp(join(dir, `${name}.png`)).extract({ left: 0, top, width: meta.width, height }).png().toBuffer();
    await sharp(band).trim({ threshold: 10 }).png().toFile(join(dir, `${name}-horizontal.png`));
  }
  console.log(`déclinaisons horizontales : bande y ${top}–${top + height}`);
}
