/**
 * One-off generator for the Givest app icon set.
 * Renders the brand mark (white on near-black) with sharp.
 *
 * Run: node scripts/generate-icon.js
 * (Falls back to the sharp install in ../stockdrops/web if not local.)
 */
const path = require("path");
const fs = require("fs");

let sharp;
try {
  sharp = require("sharp");
} catch {
  sharp = require("/Users/russ/stockdrops/web/node_modules/sharp");
}

const MARK_PATH =
  "M 256 0 L 256 128 A 128 128 0 1 1 128 0 Z M 128 176 A 48 48 0 1 0 128 80 A 48 48 0 0 0 128 176 Z";
const DARK = "#17191f";
const OUT = path.join(__dirname, "..", "assets", "images");

function markSvg({ size, markRatio, markColor, background }) {
  const markSize = size * markRatio;
  const offset = (size - markSize) / 2;
  const scale = markSize / 256;
  const bg = background
    ? `<rect width="${size}" height="${size}" fill="${background}"/>`
    : "";
  return Buffer.from(
    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      ${bg}
      <g transform="translate(${offset}, ${offset}) scale(${scale})">
        <path d="${MARK_PATH}" fill="${markColor}"/>
      </g>
    </svg>`,
  );
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  // App icon: near-black background, white mark at ~55%.
  await sharp(
    markSvg({ size: 1024, markRatio: 0.55, markColor: "#ffffff", background: DARK }),
  )
    .png()
    .toFile(path.join(OUT, "icon.png"));

  // Splash icon: dark mark on transparent (splash background is white).
  await sharp(markSvg({ size: 512, markRatio: 0.62, markColor: DARK }))
    .png()
    .toFile(path.join(OUT, "splash-icon.png"));

  // Android adaptive foreground: white mark inside the safe zone.
  await sharp(markSvg({ size: 1024, markRatio: 0.42, markColor: "#ffffff" }))
    .png()
    .toFile(path.join(OUT, "android-icon-foreground.png"));

  // Android monochrome: same silhouette.
  await sharp(markSvg({ size: 1024, markRatio: 0.42, markColor: "#ffffff" }))
    .png()
    .toFile(path.join(OUT, "android-icon-monochrome.png"));

  // Web favicon.
  await sharp(
    markSvg({ size: 128, markRatio: 0.62, markColor: "#ffffff", background: DARK }),
  )
    .resize(48, 48)
    .png()
    .toFile(path.join(OUT, "favicon.png"));

  console.log("Icons written to", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
