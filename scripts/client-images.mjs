/**
 * Préparation ponctuelle des images fournies par le client (avant
 * npm run photos:optimize). Rejouable : lit photos-originaux/*-source.jpg
 * et écrit les versions retouchées à côté.
 *
 *  - station-charge-3en1 : retire la barre blanche à gauche (capture d'écran)
 *    et le badge « 3/4 » en bas à droite. Le badge chevauchant le bord du socle,
 *    la zone est reconstruite par diffusion depuis les pixels voisins.
 *  - ecouteurs-conduction-yesido : retire le titre publicitaire (anglais) du haut.
 *  - montre-yesido-io22 : garde les montres, sans le bloc de texte de la fiche.
 *  - batterie-porte-cles : retire la marge blanche autour du fond bleu clair.
 */
import sharp from "sharp";
import { join } from "node:path";

const dir = join(process.cwd(), "photos-originaux"); // hors de public/ : jamais servi

async function station() {
  const src = join(dir, "station-charge-3en1-source.jpg");
  const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const lum = (x, y) => { const i = (y * W + x) * 3; return data[i] + data[i + 1] + data[i + 2]; };
  // Boîte du badge : pixels sombres du coin bas-droit
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let y = Math.floor(H * 0.85); y < H; y++)
    for (let x = Math.floor(W * 0.8); x < W; x++)
      if (lum(x, y) < 420) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const pad = 4;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);
  // Comblement par diffusion : chaque pixel inconnu prend la moyenne de ses voisins connus
  const out = Buffer.from(data);
  let known = new Uint8Array(W * H).fill(1);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) known[y * W + x] = 0;
  for (let changed = 1; changed; ) {
    changed = 0;
    const next = new Uint8Array(known);
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const k = y * W + x;
        if (known[k]) continue;
        const s = [0, 0, 0]; let n = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H || !known[yy * W + xx]) continue;
          const i = (yy * W + xx) * 3; s[0] += out[i]; s[1] += out[i + 1]; s[2] += out[i + 2]; n++;
        }
        if (n) { const i = k * 3; out[i] = s[0] / n; out[i + 1] = s[1] / n; out[i + 2] = s[2] / n; next[k] = 1; changed++; }
      }
    known = next;
  }
  // Barre blanche à gauche : premières colonnes retirées
  await sharp(out, { raw: { width: W, height: H, channels: 3 } })
    .extract({ left: 24, top: 0, width: W - 24, height: H })
    .jpeg({ quality: 92 })
    .toFile(join(dir, "station-charge-3en1.jpg"));
  console.log(`station-charge-3en1 : badge ${x1 - x0}×${y1 - y0} px comblé, 24 px retirés à gauche`);
}

async function crop(name, box) {
  await sharp(join(dir, `${name}-source.jpg`)).extract(box).jpeg({ quality: 92 }).toFile(join(dir, `${name}.jpg`));
  console.log(`${name} : recadré ${box.width}×${box.height}`);
}

await station();
await crop("ecouteurs-conduction-yesido", { left: 0, top: 330, width: 790, height: 570 });
await crop("montre-yesido-io22", { left: 0, top: 0, width: 600, height: 1080 });

// Marge blanche autour du visuel (fond bleu clair conservé)
await sharp(join(dir, "batterie-porte-cles-source.jpg")).trim({ background: "#ffffff", threshold: 12 }).jpeg({ quality: 92 }).toFile(join(dir, "batterie-porte-cles.jpg"));
console.log("batterie-porte-cles : marge blanche retirée");
