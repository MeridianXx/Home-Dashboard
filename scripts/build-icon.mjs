import sharp from "sharp";

// Genererar Boets app-ikon (1024×1024) och splash-bilder (2732×2732 light + dark)
// från husmotivet i src/app/icon.svg. Alla tre konsumeras av @capacitor/assets
// som bakar in dem i ios/App/App/Assets.xcassets/.

const HOUSE_PATH = `<path d="M3 11 L12 3 L21 11 L21 20 Q21 21 20 21 L4 21 Q3 21 3 20 Z"/>
<circle cx="12" cy="15" r="2.5" fill="#C96F4A" stroke="none"/>`;

const ACC = "#C96F4A";        // terracotta
const PAPER_HI = "#FFFBF0";   // Warm Home paperHi (matchar logga-bg)
const DARK_BG = "#1A1712";    // Warm Home dark bg
const INK_LIGHT = "#2B241B";  // Warm Home light ink
const INK_DARK = "#F3ECDE";   // Warm Home dark ink

// Splash-undertitel renderas via SVG <text>. Sharp's resvg-renderare har
// inte tillgång till webfonten Fraunces, men Georgia (macOS-systemserif)
// ger nära matchning av karaktären.
const SPLASH_FONT = "Georgia, 'Times New Roman', serif";

function iconSvg(canvas, bg, houseSize) {
  const inset = (canvas - houseSize) / 2;
  const scale = houseSize / 24;
  return `<svg width="${canvas}" height="${canvas}" viewBox="0 0 ${canvas} ${canvas}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${canvas}" height="${canvas}" fill="${bg}"/>
    <g transform="translate(${inset} ${inset}) scale(${scale})" fill="none" stroke="${ACC}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      ${HOUSE_PATH}
    </g>
  </svg>`;
}

function splashSvg({ canvas, bg, ink }) {
  const houseSize = Math.round(canvas * 0.25);
  // Centrera hus + undertitel som ett block — undertiteln offset:as
  // ned med `gap` från husets nedre kant.
  const blockHeight = houseSize + 130;
  const blockTop = (canvas - blockHeight) / 2;
  const houseInset = (canvas - houseSize) / 2;
  const scale = houseSize / 24;
  const textY = blockTop + houseSize + 90;
  const center = canvas / 2;
  return `<svg width="${canvas}" height="${canvas}" viewBox="0 0 ${canvas} ${canvas}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${canvas}" height="${canvas}" fill="${bg}"/>
    <g transform="translate(${houseInset} ${blockTop}) scale(${scale})" fill="none" stroke="${ACC}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      ${HOUSE_PATH}
    </g>
    <text x="${center}" y="${textY}" font-family="${SPLASH_FONT}" font-size="56" font-style="italic" fill="${ink}" text-anchor="middle" letter-spacing="0.5">Boet · Villa Björkdalen</text>
  </svg>`;
}

// 1. App-ikon: 1024×1024, hus inset 8.3 % (matchar apple-icon.tsx-proportionerna)
await sharp(Buffer.from(iconSvg(1024, PAPER_HI, Math.round(1024 * (150 / 180)))))
  .png()
  .toFile("assets/icon.png");
console.log("✓ assets/icon.png (1024×1024)");

// 2. Splash light: 2732×2732 cream-bg, hus + undertitel centrerat
await sharp(Buffer.from(splashSvg({ canvas: 2732, bg: PAPER_HI, ink: INK_LIGHT })))
  .png()
  .toFile("assets/splash.png");
console.log("✓ assets/splash.png (2732×2732 light, med undertitel)");

// 3. Splash dark: 2732×2732 mörk bg, ljus undertitel
await sharp(Buffer.from(splashSvg({ canvas: 2732, bg: DARK_BG, ink: INK_DARK })))
  .png()
  .toFile("assets/splash-dark.png");
console.log("✓ assets/splash-dark.png (2732×2732 dark, med undertitel)");
