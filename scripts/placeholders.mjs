/**
 * Génère les visuels PROVISOIRES des rayons (public/photos/provisoire/*.svg) :
 * fond marine, nid d'abeille bleu, hexagone et pictogramme dorés. Sobres et
 * légers, ils remplacent les photos tant que le client n'a pas fourni les siennes.
 * Usage : node scripts/placeholders.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const icons = {
  smartphones: '<rect x="-34" y="-58" width="68" height="116" rx="12"/><path d="M-10 44h20"/>',
  "ecouteurs-casques": '<path d="M-46 14v-10a46 46 0 0 1 92 0v10"/><rect x="-54" y="10" width="22" height="38" rx="8"/><rect x="32" y="10" width="22" height="38" rx="8"/>',
  montres: '<rect x="-30" y="-34" width="60" height="68" rx="16"/><path d="M-18 -34l6-26h24l6 26M-18 34l6 26h24l6-26M0 -12v14l10 8"/>',
  accessoires: '<path d="M-22 -58v26M22 -58v26"/><rect x="-36" y="-32" width="72" height="44" rx="10"/><path d="M0 12v20a18 18 0 0 1-18 18h-14"/>',
  protections: '<path d="M0 -60l46 16v32c0 32-20 54-46 66c-26-12-46-34-46-66v-32z"/><path d="M-18 2l12 12l24-26"/>',
  gadgets: '<circle cx="-8" cy="-8" r="34"/><path d="M16 16l34 34"/>',
};

const svg = (icon) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="1200" height="1500">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1a3a"/><stop offset="1" stop-color="#060709"/></linearGradient>
<pattern id="hx" width="56" height="100" patternUnits="userSpaceOnUse"><path d="M28 66L0 50V16L28 0l28 16v34L28 66zm0 0v34" fill="none" stroke="#1a8fe6" stroke-opacity=".16" stroke-width="1.2"/></pattern>
</defs>
<rect width="400" height="500" fill="url(#bg)"/><rect width="400" height="500" fill="url(#hx)"/>
<g transform="translate(200 240)">
<polygon points="0,-118 102,-59 102,59 0,118 -102,59 -102,-59" fill="#111318" stroke="#c8956c" stroke-width="2.5" stroke-linejoin="round"/>
<g fill="none" stroke="#c8956c" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" transform="scale(.8)">${icon}</g>
</g>
<text x="200" y="430" text-anchor="middle" font-family="system-ui,sans-serif" font-size="15" letter-spacing="3" fill="#a9a5a0">PHOTO À VENIR</text>
</svg>
`;

const dir = join(process.cwd(), "public", "photos", "provisoire");
mkdirSync(dir, { recursive: true });
for (const [name, icon] of Object.entries(icons)) writeFileSync(join(dir, `${name}.svg`), svg(icon));
console.log(`public/photos/provisoire : ${Object.keys(icons).length} visuels`);
