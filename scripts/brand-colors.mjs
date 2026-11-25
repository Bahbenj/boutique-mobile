/**
 * Échantillonne les couleurs du logo pour config/site.ts → theme.
 * Usage : npm run brand:colors -- public/brand/logo-dore.png
 *
 * Réduit l'image, ignore les pixels transparents, quasi noirs, quasi blancs ou gris,
 * regroupe les teintes proches et affiche les couleurs dominantes avec leur
 * contraste sur le fond noir du site (#060709). À reporter à la main dans
 * `gold` (or du logo) et `accent` / `navy` (bleus), en gardant un contraste
 * ≥ 4,5:1 pour le texte. Charte : ni jaune vif ni rouge.
 */
const file = process.argv[2];
if (!file) {
  console.error("Usage : npm run brand:colors -- <chemin du logo (PNG, JPG, WebP ou SVG)>");
  process.exit(1);
}

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.error("Le module « sharp » est introuvable. Installez-le : npm install --save-dev sharp");
  process.exit(1);
}

const { data, info } = await sharp(file).resize(96, 96, { fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

const bins = new Map();
for (let i = 0; i < data.length; i += info.channels) {
  const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
  if (a < 200) continue;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max < 40 || min > 225) continue; // fond noir ou blanc
  if (max - min < 30) continue; // gris (anticrénelage du texte) : pas une couleur de marque
  const key = [r, g, b].map((v) => v >> 4).join(",");
  const bin = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
  bin.n++;
  bin.r += r;
  bin.g += g;
  bin.b += b;
  bins.set(key, bin);
}

const lum = (c) => {
  const [r, g, b] = c.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (c) => (lum(c) + 0.05) / (lum([6, 7, 9]) + 0.05);
const hex = (c) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();

const total = [...bins.values()].reduce((s, b) => s + b.n, 0);
const top = [...bins.values()].sort((a, b) => b.n - a.n).slice(0, 8);
if (!top.length) {
  console.log("Aucune couleur exploitable (logo uniquement noir et blanc ?).");
  process.exit(0);
}
console.log("Couleurs dominantes du logo (hors noir et blanc) :");
for (const b of top) {
  const c = [b.r / b.n, b.g / b.n, b.b / b.n];
  const ratio = contrast(c);
  console.log(`  ${hex(c)}  ${String(Math.round((b.n / total) * 100)).padStart(3)} %  contraste sur noir ${ratio.toFixed(1)}:1${ratio < 4.5 ? "  (trop sombre pour du texte)" : ""}`);
}
