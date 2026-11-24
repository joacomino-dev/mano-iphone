// Composes the five App Store screenshots per language: a headline on CocoWash's own cotton
// paper, around the REAL app capture from testStoreScreensSevenLanguages (never a UI mock-up).
// Every material comes from the app: paper texture, palette, Fredoka/Patua One, the stamps,
// Coqui, and the photo card's proportions (prototype.css .photo-card at 3x, scaled with the screen).
// Usage (from mano/): node scripts/compose-store-frames.mjs <raw-captures-dir> <output-dir> [lang,...]
// Output: <lang>-<screen>.jpg, 1320×2868, RGB without alpha (App Store 6.9" slot).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const [rawDir, outDir, only] = process.argv.slice(2);
if (!rawDir || !outDir) { console.error('usage: compose-store-frames.mjs <raw-dir> <out-dir> [langs]'); process.exit(2); }
const copy = JSON.parse(fs.readFileSync(path.join(root, 'docs/apple-readiness/storefront/store-frames.json'), 'utf8'));
const langs = only ? only.split(',') : Object.keys(copy.words);
const uri = (file, type) => `data:${type};base64,${fs.readFileSync(file).toString('base64')}`;
const asset = (rel, type = 'image/webp') => uri(path.join(root, 'mano/public/assets', rel), type);
const library = name => uri(path.join(root, 'docs/apple-readiness/storefront/library', name), 'image/webp');
const W = 1320, H = 2868;
// The capture is 1320 px for a 440 pt screen (3x); shown 1000 px wide (whole screen visible) it is 2.27 px per point.
const SHOT = 1000, PT = SHOT / 440;
// The pile card (236 pt wide) and the drag stamp (~130 pt) at the screen's scale.
const CARD = Math.round(236 * PT), STAMP = Math.round(130 * PT);

const css = `
@font-face{font-family:Fredoka;src:url(${asset('fonts/fredoka-latin-600.woff2', 'font/woff2')}) format('woff2');font-weight:600}
@font-face{font-family:'Patua One';src:url(${asset('fonts/patua-one-latin-400.woff2', 'font/woff2')}) format('woff2')}
:root{--paper:#F2E7D5;--paper-light:#FAF6EE;--ink:#122D2E;--ink-soft:#3B4E4B;--coffee:#90481D;--teal:#1E7470;
  --brand:Fredoka,"Hiragino Maru Gothic ProN","Yu Gothic UI","Meiryo","Segoe UI",Tahoma,sans-serif;
  --text:-apple-system,"SF Pro Text","Segoe UI","Yu Gothic UI","Meiryo",Tahoma,sans-serif}
*{box-sizing:border-box;margin:0}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{background:var(--paper) url(${asset('paper-cotton.webp')}) 0 0/${Math.round(512 * PT / 2)}px;position:relative;color:var(--ink)}
.copy{position:absolute;inset-inline:104px;top:150px;display:flex;flex-direction:column;gap:26px}
.has-coqui .copy{inset-inline-end:520px}
h1{font-family:var(--brand);font-weight:600;font-size:108px;line-height:1.02;letter-spacing:-.012em;text-wrap:balance}
h1 em{font-style:normal;color:var(--coffee)}
p{font-family:var(--text);font-weight:500;font-size:46px;line-height:1.28;color:var(--ink-soft);text-wrap:pretty;max-width:1000px}
.screen{position:absolute;left:${(W - SHOT) / 2 - 16}px;top:610px;padding:16px;border-radius:${Math.round(55 * PT) + 16}px;background:var(--ink);
  box-shadow:0 2px 0 rgba(255,255,255,.35) inset,0 44px 90px rgba(18,45,46,.24),0 10px 24px rgba(18,45,46,.14)}
.screen img,.screen .pending{display:block;width:${SHOT}px;height:${Math.round(SHOT * H / W)}px;border-radius:${Math.round(55 * PT)}px}
.screen .pending{object-fit:cover;opacity:.92}
/* prototype.css .photo-card: paper-light frame, 8 pt sides, 32 pt caption band, 3 pt radius, card shadow */
.card{position:absolute;padding:${Math.round(8 * PT)}px ${Math.round(8 * PT)}px ${Math.round(32 * PT)}px;border-radius:${Math.round(3 * PT)}px;background:var(--paper-light);
  box-shadow:0 0 0 2px rgba(18,45,46,.07),0 5px 10px rgba(18,45,46,.10),0 26px 60px rgba(18,45,46,.22)}
.card img{display:block;width:100%;aspect-ratio:3/4;object-fit:cover}
.card.is-keep{outline:${Math.round(3 * PT)}px solid var(--teal)}
.card.is-discard{outline:${Math.round(3 * PT)}px solid #4E5A68}
.card.is-favorite{outline:${Math.round(3 * PT)}px solid #B8444B}
.card .stamp img{aspect-ratio:auto;object-fit:contain}
.card time{position:absolute;inset-inline-end:${Math.round(10 * PT)}px;bottom:${Math.round(9 * PT)}px;font:400 ${Math.round(13 * PT)}px/1 "IBM Plex Mono",ui-monospace,Consolas,monospace;color:var(--ink-soft);letter-spacing:.04em}
.stamp{position:absolute;width:300px;display:flex;flex-direction:column;align-items:center;gap:6px}
.stamp img{width:100%;filter:drop-shadow(0 14px 22px rgba(18,45,46,.22))}
/* prototype.css .stamp-lettering, scaled with the screen */
.stamp span{padding:${Math.round(5 * PT)}px ${Math.round(16 * PT)}px ${Math.round(6 * PT)}px;border-radius:${Math.round(14 * PT)}px;background:rgba(250,246,238,.96);box-shadow:inset 0 0 0 3px rgba(46,24,14,.18),0 10px 20px rgba(18,45,46,.16);
  font:600 ${Math.round(24 * PT)}px/1.1 var(--brand);color:#3B1E10;white-space:nowrap}
/* The decision bar's «Conservar» pill: teal, ink outline, cream ring, Patua One capitals */
.pill{position:absolute;padding:20px 54px 24px;border-radius:999px;background:var(--teal);border:8px solid var(--ink);box-shadow:inset 0 0 0 7px var(--paper-light),0 18px 36px rgba(18,45,46,.22);
  font:400 64px/1 'Patua One',var(--brand);letter-spacing:.03em;text-transform:uppercase;color:var(--paper-light)}
.coqui{position:absolute;top:150px;inset-inline-end:64px;height:340px}
`;

// The card caption is the photo's date, written the way the app writes it (Filters.tsx display()).
const day = (lang, iso) => new Date(`${iso}T12:00:00`).toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' });

function frame(lang, screen, raw) {
  const [headline, sub] = copy.frames[screen][lang];
  const words = copy.words[lang];
  const shot = raw ? `<img src="${raw}" alt="">` : `<img class="pending" src="${standInFor(screen) ?? ''}" alt="">`;
  let extra = '', coqui = false;
  const card = (kind, photo, iso, style, stamp = '') => `<div class="card is-${kind}" style="width:${CARD}px;${style}"><img src="${library(photo)}" alt=""><time>${day(lang, iso)}</time>${stamp}</div>`;
  const stamp = (kind, word, style, tilt) => `<div class="stamp" style="width:${STAMP}px;${style}"><img src="${asset(`stamps/${kind}.webp`)}" alt=""><span style="rotate:${tilt}deg">${word}</span></div>`;
  // Each frame draws the card that just left, the way the pile draws a drag (swipe.ts: right
  // keeps, left discards, up favorites): its coloured edge, its tilt, and the stamp with the
  // app's own word. The capture under it is the pile right after, with the next photo waiting.
  if (screen === '01-keep') extra = card('keep', 'k1-beach-dog.webp', '2026-11-22', 'left:744px;top:1130px;rotate:6deg')
    + stamp('keep', words.keep, 'left:300px;top:1390px', -4)
    + `<div class="pill" style="right:86px;top:540px;rotate:4deg">${words.free}</div>`;
  if (screen === '02-delete') extra = card('discard', 'd1-pocket.webp', '2026-11-22', 'left:40px;top:1130px;rotate:-6deg')
    + stamp('discard', words.discard, 'left:720px;top:1390px', 4);
  if (screen === '05-favorite') extra = card('favorite', 'k3-pier-friends.webp', '2026-11-15', `left:${Math.round((W - CARD) / 2)}px;top:780px`,
    stamp('favorite', words.favorite, `left:50%;top:${Math.round(CARD * .62)}px;translate:-50% -50%`, 0));
  return `<!doctype html><html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><style>${css}</style></head>
    <body class="${coqui ? 'has-coqui' : ''}"><div class="copy"><h1>${headline}</h1><p>${sub}</p></div>
    <div class="screen">${shot}</div>${extra}</body></html>`;
}

fs.mkdirSync(outDir, { recursive: true });
// A design-only stand-in (the web demo's pile) may fill missing captures while drafting:
// STORE_STAND_IN=<png>. It is labelled as such in the file name and never published.
const standIn = process.env.STORE_STAND_IN;
const standInFor = screen => { if (!standIn) return null; const file = fs.statSync(standIn).isDirectory() ? path.join(standIn, `${screen}.png`) : standIn; return fs.existsSync(file) ? uri(file, 'image/png') : null; };
const browser = await chromium.launch({ channel: process.env.STORE_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined) });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
let made = 0, pending = 0;
for (const lang of langs) for (const screen of copy.order) {
  const file = path.join(rawDir, `${lang}-${screen}.png`);
  const raw = fs.existsSync(file) ? uri(file, 'image/png') : null;
  if (!raw) pending++;
  await page.setContent(frame(lang, screen, raw), { waitUntil: 'load' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    // Long headlines step down until they fit in two lines.
    const h1 = document.querySelector('h1');
    let size = 108;
    while (h1.getBoundingClientRect().height > size * 1.02 * 2 + 6 && size > 76) { size -= 4; h1.style.fontSize = size + 'px'; }
  });
  const name = raw ? `${lang}-${screen}.jpg` : `DRAFT-${lang}-${screen}.jpg`;
  await page.screenshot({ path: path.join(outDir, name), type: 'jpeg', quality: 92 });
  made++;
}
await browser.close();
console.log(`STORE_FRAMES made=${made} pendingCaptures=${pending} out=${outDir}`);
