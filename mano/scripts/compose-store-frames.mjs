// Composes the five App Store screenshots per language: a headline on CocoWash's own cotton
// paper, around the REAL app capture from testStoreScreensSevenLanguages (never a UI mock-up).
// On the three swipe screens the held card is lifted out of the phone: the capture is searched
// for the card's coloured edge and for its stamp, and both are drawn again in the same place,
// whole and on top (the app's own art, card proportions and lettering), so nothing is cut off.
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
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'docs/apple-readiness/storefront/library/manifest.json'), 'utf8'));
const langs = only ? only.split(',') : Object.keys(copy.words);
const uri = (file, type) => `data:${type};base64,${fs.readFileSync(file).toString('base64')}`;
const asset = (rel, type = 'image/webp') => uri(path.join(root, 'mano/public/assets', rel), type);
const library = name => uri(path.join(root, 'docs/apple-readiness/storefront/library', name), 'image/webp');
const W = 1320, H = 2868;
const SHOT = 1000, PT = SHOT / 440, SCREEN_X = (W - SHOT) / 2, SCREEN_Y = 626;
// The three held swipes (swipe.ts: right keeps, left discards, up favorites) and what the pile
// draws for each: the card's edge colour, the stamp's tilt (prototype.css .drag-stamp) and the photo.
const HELD = {
  '01-keep': { kind: 'keep', edge: [30, 116, 112], tilt: -8, photo: 'k1-beach-dog.webp' },
  '02-delete': { kind: 'discard', edge: [78, 90, 104], tilt: 6, photo: 'd1-pocket.webp' },
  '03-favorite': { kind: 'favorite', edge: [163, 64, 90], tilt: 0, photo: 'k3-pier-friends.webp' },
};
// Highlight colour by action: turquoise keeps, graphite discards, pink favorites, coffee otherwise.
const ACCENT = { '01-keep': '#1E7470', '02-delete': '#4E5A68', '03-favorite': '#B23E62' };
const dateOf = Object.fromEntries(manifest.items.map(i => [i.file, i.capturedAt.slice(0, 10)]));

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
h1{font-family:var(--brand);font-weight:600;font-size:108px;line-height:1.02;letter-spacing:-.012em;text-wrap:balance}
h1 em{font-style:normal;color:var(--accent,var(--coffee))}
p{font-family:var(--text);font-weight:500;font-size:56px;line-height:1.26;color:var(--ink-soft);text-wrap:pretty;max-width:1000px}
.screen{position:absolute;left:${SCREEN_X - 16}px;top:${SCREEN_Y - 16}px;padding:16px;border-radius:${Math.round(55 * PT) + 16}px;background:var(--ink);
  box-shadow:0 2px 0 rgba(255,255,255,.35) inset,0 44px 90px rgba(18,45,46,.24),0 10px 24px rgba(18,45,46,.14)}
.screen img{display:block;width:${SHOT}px;height:${Math.round(SHOT * H / W)}px;border-radius:${Math.round(55 * PT)}px}
.screen img.pending{object-fit:cover;opacity:.92}
/* The decision bar's «Conservar» pill: teal, ink outline, cream ring, Patua One capitals */
.pill{position:absolute;padding:20px 54px 24px;border-radius:999px;background:var(--teal);border:8px solid var(--ink);box-shadow:inset 0 0 0 7px var(--paper-light),0 18px 36px rgba(18,45,46,.22);
  font:400 64px/1 'Patua One',var(--brand);letter-spacing:.03em;text-transform:uppercase;color:var(--paper-light);z-index:5}
/* The lifted card: prototype.css .photo-card (paper-light, 8 pt frame, 32 pt caption) with the drag's coloured edge */
.lift{position:absolute;transform-origin:0 0;z-index:3}
.lift .card{position:absolute;inset:0;background:var(--paper-light);border-style:solid;border-radius:var(--r);transform:scale(1.035);transform-origin:50% 50%;
  box-shadow:0 34px 70px rgba(18,45,46,.34),0 10px 22px rgba(18,45,46,.18)}
.lift .card img{position:absolute;object-fit:cover}
.lift time{position:absolute;font-family:"IBM Plex Mono",ui-monospace,Consolas,monospace;color:var(--ink-soft);letter-spacing:.06em;white-space:nowrap}
.mark{position:absolute;display:flex;flex-direction:column;align-items:center;z-index:4;transform-origin:50% 0}
.mark img{filter:drop-shadow(0 8px 16px rgba(6,29,32,.3))}
/* prototype.css .stamp-lettering */
.mark span{border-radius:var(--lr);background:rgba(250,246,238,.97);box-shadow:inset 0 0 0 var(--lb) rgba(46,24,14,.18),0 6px 14px rgba(6,29,32,.18);font-family:var(--brand);font-weight:600;color:#3B1E10;white-space:nowrap;line-height:1.1}
`;

const day = (lang, iso) => new Date(`${iso}T12:00:00`).toLocaleDateString(lang, { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, '');

function frame(lang, screen, raw, standIn) {
  const [headline, sub] = copy.frames[screen][lang];
  const words = copy.words[lang];
  const shot = raw ? `<img id="shot" src="${raw}" alt="">` : `<img id="shot" class="pending" src="${standIn ?? ''}" alt="">`;
  const extra = screen === '01-keep' ? `<div class="pill" style="right:86px;top:540px;rotate:4deg">${words.free}</div>` : '';
  const accent = ACCENT[screen] ? ` style="--accent:${ACCENT[screen]}"` : '';
  return `<!doctype html><html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><style>${css}</style></head>
    <body${accent}><div class="copy"><h1>${headline}</h1><p>${sub}</p></div>
    <div class="screen">${shot}</div>${extra}</body></html>`;
}

// Runs in the page: finds the held card (its coloured edge) and the drag stamp (template match on
// the stamp art) in the capture, then draws both again on top, whole, at the same place and angle.
async function lift({ held, photo, stampArt, word, date, aspect, screenPt }) {
  const shotEl = document.getElementById('shot');
  await shotEl.decode();
  const iw = shotEl.naturalWidth, ih = shotEl.naturalHeight, k = shotEl.getBoundingClientRect().width / iw;
  const ox = shotEl.getBoundingClientRect().left, oy = shotEl.getBoundingClientRect().top;
  const c = document.createElement('canvas'); c.width = iw; c.height = ih;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(shotEl, 0, 0);
  const px = g.getImageData(0, 0, iw, ih).data;
  const near = (i, [r, gg, b], t) => Math.abs(px[i] - r) + Math.abs(px[i + 1] - gg) + Math.abs(px[i + 2] - b) < t;
  // 1 · the card's edge, inside the pile (below the header pills' row, above the decision bar).
  const y0 = Math.round(ih * (held.kind === 'favorite' ? .06 : .13)), y1 = Math.round(ih * .79);
  let tl = null, bl = null, tr = null, br = null, n = 0;
  for (let y = y0; y < y1; y += 2) for (let x = 0; x < iw; x += 2) {
    if (!near((y * iw + x) * 4, held.edge, 14)) continue; n++;
    const s = x + y, d = x - y;
    if (!tl || s < tl[0] + tl[1]) tl = [x, y]; if (!br || s > br[0] + br[1]) br = [x, y];
    if (!tr || d > tr[0] - tr[1]) tr = [x, y]; if (!bl || d < bl[0] - bl[1]) bl = [x, y];
  }
  if (n < 200) return { ok: false, reason: 'card edge not found', n };
  // The capture's scale: the iPhone screen is 440 pt wide (the web stand-in, 393).
  const side = held.kind === 'keep' ? [tl, bl] : held.kind === 'discard' ? [tr, br] : [bl, br];
  const s = iw / screenPt;
  // The card rectangle from the visible side, the photo's aspect and the frame (8 pt, 32 pt caption).
  const len = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  let TL, u, r, w, h;
  if (held.kind === 'favorite') {
    r = [(br[0] - bl[0]) / len(bl, br), (br[1] - bl[1]) / len(bl, br)]; u = [-r[1], r[0]];
    // The top edge shows between the header pills: measure the height instead of assuming it.
    let topY = Infinity;
    for (let y = y0; y < y1; y += 1) { for (let x = Math.round(bl[0]) + 40; x < br[0] - 40; x += 3) if (near((y * iw + x) * 4, held.edge, 14)) { topY = y; break; } if (topY < Infinity) break; }
    w = len(bl, br); h = topY < bl[1] - 100 ? bl[1] - topY : (w - 16 * s) / aspect + 40 * s; TL = [bl[0] - u[0] * h, bl[1] - u[1] * h];
  } else {
    const [top, bottom] = side;
    u = [(bottom[0] - top[0]) / len(top, bottom), (bottom[1] - top[1]) / len(top, bottom)]; r = [u[1], -u[0]];
    h = len(top, bottom); w = (h - 40 * s) * aspect + 16 * s;
    TL = held.kind === 'keep' ? top : [top[0] - r[0] * w, top[1] - r[1] * w];
  }
  const angle = Math.atan2(r[1], r[0]) * 180 / Math.PI;
  // 2 · the stamp: normalised cross-correlation of the stamp art (118 pt, the pile's tilt) on a
  // quarter-size copy of the pile, then refined at full size.
  const art = new Image(); art.src = stampArt; await art.decode();
  const match = (scale, cx0, cy0, rx, ry, stride) => {
    const size = Math.round(118 * s * scale), t = document.createElement('canvas'); t.width = t.height = size;
    const tg = t.getContext('2d'); tg.translate(size / 2, size / 2); tg.rotate(held.tilt * Math.PI / 180); tg.drawImage(art, -size / 2, -size / 2, size, size);
    const td = tg.getImageData(0, 0, size, size).data, tp = [];
    for (let y = 0; y < size; y += stride) for (let x = 0; x < size; x += stride) { const i = (y * size + x) * 4; if (td[i + 3] > 200) tp.push([x, y, (td[i] + td[i + 1] + td[i + 2]) / 3]); }
    const mean = tp.reduce((a, p) => a + p[2], 0) / tp.length, tv = tp.map(p => p[2] - mean), tn = Math.sqrt(tv.reduce((a, v) => a + v * v, 0));
    const sw = Math.round(iw * scale), sh = Math.round(ih * scale), sc = document.createElement('canvas'); sc.width = sw; sc.height = sh;
    const sg = sc.getContext('2d'); sg.drawImage(shotEl, 0, 0, sw, sh); const sd = sg.getImageData(0, 0, sw, sh).data;
    let best = [-2, 0, 0];
    for (let cy = cy0 - ry; cy <= cy0 + ry; cy += stride) for (let cx = cx0 - rx; cx <= cx0 + rx; cx += stride) {
      const x0 = Math.round(cx - size / 2), yy0 = Math.round(cy - size / 2); if (x0 < 0 || yy0 < 0 || x0 + size >= sw || yy0 + size >= sh) continue;
      let sum = 0; const vals = new Array(tp.length);
      for (let q = 0; q < tp.length; q++) { const i = ((yy0 + tp[q][1]) * sw + x0 + tp[q][0]) * 4; vals[q] = (sd[i] + sd[i + 1] + sd[i + 2]) / 3; sum += vals[q]; }
      const m = sum / tp.length; let num = 0, den = 0;
      for (let q = 0; q < tp.length; q++) { const v = vals[q] - m; num += v * tv[q]; den += v * v; }
      const score = num / (Math.sqrt(den) * tn + 1e-6); if (score > best[0]) best = [score, cx, cy];
    }
    return best;
  };
  // The pile's stamp sits in its upper half (top 30 %, 16 % for favorites): search 15–60 % of the height.
  const coarse = match(.25, Math.round(iw * .125), Math.round(ih * .25 * .375), Math.round(iw * .125), Math.round(ih * .25 * .225), 2);
  const fine = match(1, coarse[1] * 4, coarse[2] * 4, 14, 14, 2);
  const stamp = { x: fine[1], y: fine[2], score: fine[0] };
  // 3 · draw: card (scaled 3.5 % up, so the capture's own card never peeks out) and stamp on top.
  const P = v => v * s * k, card = document.createElement('div');
  card.className = 'lift';
  card.style.cssText = `left:${ox + TL[0] * k}px;top:${oy + TL[1] * k}px;width:${w * k}px;height:${h * k}px;transform:rotate(${angle}deg)`;
  card.innerHTML = `<div class="card" style="--r:${P(3)}px;border-width:${P(3)}px;border-color:rgb(${held.edge.join(',')})">
    <img src="${photo}" style="left:${P(5)}px;top:${P(5)}px;width:${w * k - P(16)}px;height:${h * k - P(40)}px">
    <time style="right:${P(10)}px;bottom:${P(9)}px;font-size:${P(13)}px">${date}</time></div>`;
  document.body.appendChild(card);
  const mark = document.createElement('div'), artW = P(118) * 1.06;
  mark.className = 'mark';
  mark.style.cssText = `left:${ox + stamp.x * k - artW / 2}px;top:${oy + stamp.y * k - artW / 2}px;width:${artW}px;transform:rotate(${held.tilt}deg);transform-origin:50% ${artW / 2}px;--lr:${P(14)}px;--lb:${P(1.5)}px`;
  mark.innerHTML = `<img src="${stampArt}" style="width:${artW}px"><span style="margin-top:${P(83) - artW / 2 - P(20)}px;padding:${P(5)}px ${P(16)}px ${P(6)}px;font-size:${P(24)}px">${word}</span>`;
  document.body.appendChild(mark);
  return { ok: true, s, angle, w, h, stamp, edgePixels: n };
}

fs.mkdirSync(outDir, { recursive: true });
// A design-only stand-in (the web demo's pile) may fill missing captures while drafting:
// STORE_STAND_IN=<dir with <screen>.png>. Files made that way are named DRAFT-… and never published.
const standIn = process.env.STORE_STAND_IN;
const standInFor = (lang, screen) => { if (!standIn) return null; const file = [path.join(standIn, lang, `${screen}.png`), path.join(standIn, `${screen}.png`)].find(f => fs.existsSync(f)); return file ? uri(file, 'image/png') : null; };
// STORE_STAND_IN_FINAL=1: the owner approved the web-app captures for the listing (2026-11-24),
// so they are written under their final names instead of DRAFT-….
const standInFinal = process.env.STORE_STAND_IN_FINAL === '1';
const browser = await chromium.launch({ channel: process.env.STORE_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined) });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
let made = 0, pending = 0;
for (const lang of langs) for (const screen of copy.order) {
  const file = path.join(rawDir, `${lang}-${screen}.png`);
  const raw = fs.existsSync(file) ? uri(file, 'image/png') : null;
  if (!raw) pending++;
  await page.setContent(frame(lang, screen, raw, standInFor(lang, screen)), { waitUntil: 'load' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    const h1 = document.querySelector('h1');
    let size = 108;
    while (h1.getBoundingClientRect().height > size * 1.02 * 2 + 6 && size > 76) { size -= 4; h1.style.fontSize = size + 'px'; }
    // Longer subtitles push the phone down (it may run off the bottom edge, never into the text).
    const bottom = document.querySelector('.copy').getBoundingClientRect().bottom, screen = document.querySelector('.screen');
    const top = Math.max(screen.getBoundingClientRect().top, bottom + 44);
    screen.style.top = top + 'px';
    const pill = document.querySelector('.pill'); if (pill) pill.style.top = (top - 74) + 'px';
  });
  const held = HELD[screen];
  if (held) {
    const result = await page.evaluate(lift, { held, photo: library(held.photo), stampArt: asset(`stamps/${held.kind}.webp`), word: copy.words[lang][held.kind], date: day(lang, dateOf[held.photo]),
      aspect: Number(process.env.STORE_PHOTO_ASPECT) || 3 / 4, screenPt: Number(process.env.STORE_SCREEN_PT) || 440 });
    console.log(`  ${lang}-${screen}: ${JSON.stringify(result)}`);
    if (!result.ok) throw new Error(`${lang}-${screen}: ${result.reason}`);
  }
  const name = raw || standInFinal ? `${lang}-${screen}.jpg` : `DRAFT-${lang}-${screen}.jpg`;
  await page.screenshot({ path: path.join(outDir, name), type: 'jpeg', quality: 92 });
  made++;
}
await browser.close();
console.log(`STORE_FRAMES made=${made} pendingCaptures=${pending} out=${outDir}`);
