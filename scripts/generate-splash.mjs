// Genererar splash.png + splash-dark.png med Björk-branding.
// Återskapar Logo.tsx (outline-hus + center-prick i ACC) som SVG, renderar
// via sharp till 2732×2732 PNG. Texten "Björk · Villa Björkdalen" ligger
// under huset i Fraunces-italic. Färgerna matchar Warm Home-tokens (light:
// paperHi #FBF6EA, ink #2B241B; dark: paperHi #2B2620, ink #F3ECDE).

import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT = resolve(ROOT, "assets");

const ACC = "#C96F4A";

const SIZE = 2732;
// Hus-storlek + position. Matchar manuellt original-splash:en (ikon ovan
// mitten, text strax under). Procentangivelser så det skalar identiskt.
const HOUSE_SIZE = Math.round(SIZE * 0.16);
const HOUSE_X = Math.round((SIZE - HOUSE_SIZE) / 2);
const HOUSE_Y = Math.round(SIZE * 0.42);
const TEXT_Y = HOUSE_Y + HOUSE_SIZE + Math.round(SIZE * 0.04);
const TEXT_SIZE = Math.round(SIZE * 0.025);

function svgFor({ bg, ink }) {
  // Hus-path tagen verbatim från src/components/Logo.tsx, viewBox 0..24,
  // skalad till HOUSE_SIZE via transform. strokeWidth 2 i originalet,
  // skalas proportionellt (×HOUSE_SIZE/24 = ungefär 36 vid 2732).
  const stroke = (2 * HOUSE_SIZE) / 24;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" fill="${bg}"/>
  <g transform="translate(${HOUSE_X} ${HOUSE_Y}) scale(${HOUSE_SIZE / 24})">
    <path
      d="M3 11 L12 3 L21 11 L21 20 Q21 21 20 21 L4 21 Q3 21 3 20 Z"
      fill="none"
      stroke="${ACC}"
      stroke-width="${stroke / (HOUSE_SIZE / 24)}"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <circle cx="12" cy="15" r="2.5" fill="${ACC}"/>
  </g>
  <text
    x="${SIZE / 2}"
    y="${TEXT_Y}"
    text-anchor="middle"
    font-family="Fraunces, Georgia, serif"
    font-style="italic"
    font-size="${TEXT_SIZE}"
    fill="${ink}"
    letter-spacing="0.5"
  >Björk · Villa Björkdalen</text>
</svg>`.trim();
}

await mkdir(OUT, { recursive: true });

// Light: paper-bakgrund (matchar dashboarden), mörk ink-text
const light = svgFor({ bg: "#FBF6EA", ink: "#2B241B" });
await sharp(Buffer.from(light)).png().toFile(resolve(OUT, "splash.png"));
console.log("✓ assets/splash.png");

// Dark: dark-tema-paper, ljus ink-text
const dark = svgFor({ bg: "#221E18", ink: "#F3ECDE" });
await sharp(Buffer.from(dark)).png().toFile(resolve(OUT, "splash-dark.png"));
console.log("✓ assets/splash-dark.png");
