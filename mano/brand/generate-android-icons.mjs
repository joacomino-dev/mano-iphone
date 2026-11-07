// Android launcher icons from the approved iOS app icon (1024 px, logo on cream).
// Run with COCO_SHARP_MODULE pointing to an installed sharp package when it is
// not installed locally. No network or user photos. Writes into android/app/src/main/res.
//
// - Legacy icons (ic_launcher.png, ic_launcher_round.png) for each density.
// - Adaptive icon (Android 8+): cream background colour + the logo centred on a
//   transparent 108 dp foreground, scaled to 68 dp so every launcher mask (circle,
//   squircle, teardrop) keeps the whole «Coco / Wash» lettering inside the safe zone.
// - Monochrome layer (Android 13 themed icons): the same lettering as a single-colour
//   silhouette (alpha only; the system tints it).
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const sharp = require(process.env.COCO_SHARP_MODULE || 'sharp');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
const res = path.join(root, 'android/app/src/main/res');
const CREAM = '#FDF9F6'; // the icon's own background (sampled)
const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

/** The lettering alone: pixels clearly darker than the cream become opaque. */
async function silhouette(size) {
  const { data, info } = await sharp(source).resize(size, size).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    const dark = 255 - Math.min(data[i], data[i + 1], data[i + 2]);
    const a = Math.max(0, Math.min(255, (dark - 30) * 2.2));
    out[j] = out[j + 1] = out[j + 2] = 255; out[j + 3] = a;
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

/** 108 dp canvas with the art centred at 68 dp. */
async function layer(art, scale) {
  const canvas = Math.round(108 * scale), inner = Math.round(68 * scale);
  const resized = await sharp(art).resize(inner, inner).png().toBuffer();
  const off = Math.round((canvas - inner) / 2);
  return sharp({ create: { width: canvas, height: canvas, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: resized, left: off, top: off }]).png().toBuffer();
}

const transparentLogo = await (async () => {
  // Foreground: lettering in its own colours over transparency (cream removed).
  const { data, info } = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    const dark = 255 - Math.min(data[i], data[i + 1], data[i + 2]);
    const a = Math.max(0, Math.min(255, (dark - 8) * 4));
    // Un-premultiply against the cream so edges keep their own colour.
    const k = a / 255, bg = [253, 249, 246];
    for (let c = 0; c < 3; c++) out[j + c] = k > 0 ? Math.max(0, Math.min(255, Math.round((data[i + c] - bg[c] * (1 - k)) / k))) : 0;
    out[j + 3] = a;
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
})();
const mono = await silhouette(1024);

for (const [name, scale] of Object.entries(densities)) {
  const dir = path.join(res, `mipmap-${name}`);
  await fs.mkdir(dir, { recursive: true });
  const legacy = Math.round(48 * scale);
  await sharp(source).resize(legacy, legacy).png().toFile(path.join(dir, 'ic_launcher.png'));
  const round = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${legacy}" height="${legacy}"><circle cx="${legacy / 2}" cy="${legacy / 2}" r="${legacy / 2}"/></svg>`);
  await sharp(source).resize(legacy, legacy).composite([{ input: round, blend: 'dest-in' }]).png().toFile(path.join(dir, 'ic_launcher_round.png'));
  await fs.writeFile(path.join(dir, 'ic_launcher_foreground.png'), await layer(transparentLogo, scale));
  await fs.writeFile(path.join(dir, 'ic_launcher_monochrome.png'), await layer(mono, scale));
}
await fs.writeFile(path.join(res, 'values/ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${CREAM}</color>\n</resources>\n`);
const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>
</adaptive-icon>
`;
await fs.writeFile(path.join(res, 'mipmap-anydpi-v26/ic_launcher.xml'), adaptive);
await fs.writeFile(path.join(res, 'mipmap-anydpi-v26/ic_launcher_round.xml'), adaptive);
console.log('Android icons written to', res);
