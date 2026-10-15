// Génère des couvertures SVG par catégorie (repli quand les photos ne sont pas disponibles).
// node scripts/generate-covers.mjs → public/images/covers/<categorie>-<1..3>.svg
import fs from "node:fs";
import path from "node:path";

const OUT = path.join(import.meta.dirname, "..", "public", "images", "covers");
fs.mkdirSync(OUT, { recursive: true });

const CATS = {
  karting: ["Karting", "#1F3D2F", "#FF5A36"],
  escalade: ["Bloc & escalade", "#2C4A3B", "#E9C46A"],
  quad: ["Quad & buggy", "#5B4636", "#FF5A36"],
  tir: ["Paintball & tir", "#1F3D2F", "#9BC53D"],
  kayak: ["Kayak", "#1D4E5F", "#F4A261"],
  trail: ["Trail", "#2F4F3A", "#E76F51"],
  trottinette: ["Trottinette", "#264653", "#E9C46A"],
  atelier: ["Ateliers créatifs", "#6B4E3D", "#F2CC8F"],
  cuisine: ["Ateliers culinaires", "#7A3E2E", "#F2CC8F"],
  nature: ["Nature & animaux", "#3A5A40", "#DDA15E"],
};

const shapes = [
  (a) =>
    `<circle cx="980" cy="210" r="260" fill="${a}" opacity=".9"/><path d="M0 760 C 300 600 520 820 820 680 S 1200 600 1200 600 V900 H0Z" fill="#FAF7F2" opacity=".12"/>`,
  (a) =>
    `<path d="M-40 900 L420 330 L700 640 L900 420 L1240 900Z" fill="${a}" opacity=".85"/><circle cx="260" cy="200" r="90" fill="#FAF7F2" opacity=".16"/>`,
  (a) =>
    `<rect x="720" y="-80" width="560" height="560" rx="120" transform="rotate(18 1000 200)" fill="${a}" opacity=".85"/><path d="M0 820 Q 600 640 1200 820 V900 H0Z" fill="#FAF7F2" opacity=".14"/>`,
];

for (const [slug, [label, bg, accent]] of Object.entries(CATS)) {
  shapes.forEach((shape, i) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" role="img" aria-label="${label}">
<rect width="1200" height="900" fill="${bg}"/>
${shape(accent)}
<text x="72" y="800" font-family="Bricolage Grotesque, DM Sans, sans-serif" font-weight="700" font-size="88" fill="#FAF7F2">${label.replace("&", "&amp;")}</text>
</svg>`;
    fs.writeFileSync(path.join(OUT, `${slug}-${i + 1}.svg`), svg);
  });
}
console.log(`Couvertures générées dans ${OUT}`);
