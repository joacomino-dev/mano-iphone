// Composes the five App Store screenshots per language: headline + brand ground + the REAL
// app capture from testStoreScreensSevenLanguages (never a mock-up of the UI).
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
const library = name => uri(path.join(root, 'docs/apple-readiness/storefront/library', name), 'image/webp');
const fredoka = uri(path.join(root, 'mano/public/assets/fonts/fredoka-latin-600.woff2'), 'font/woff2');
const W = 1320, H = 2868;

const css = `
@font-face{font-family:Fredoka;src:url(${fredoka}) format('woff2');font-weight:600}
:root{--petrol:#1D4042;--paper:#F2E7D5;--stamp:#B44238;--ink:#13292A}
*{box-sizing:border-box;margin:0}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{font-family:Fredoka,"Segoe UI","Yu Gothic UI","Meiryo","Noto Sans JP","Noto Sans Arabic",Tahoma,sans-serif;position:relative}
.ground{position:absolute;inset:0}
.ground.petrol{background:radial-gradient(1200px 900px at 50% 8%,#2B5A5C 0%,var(--petrol) 60%,#163436 100%)}
.ground.paper{background:radial-gradient(1200px 900px at 50% 8%,#FBF4E8 0%,var(--paper) 62%,#E8D9C0 100%)}
.copy{position:absolute;left:96px;right:96px;top:150px;display:flex;flex-direction:column;gap:30px}
h1{font-weight:600;font-size:112px;line-height:1.04;letter-spacing:-.01em;text-wrap:balance}
p{font-family:"Segoe UI","Yu Gothic UI","Meiryo","Noto Sans JP","Noto Sans Arabic",Tahoma,sans-serif;font-weight:500;font-size:52px;line-height:1.3;text-wrap:balance;opacity:.86}
.petrol-ink{color:var(--paper)} .paper-ink{color:var(--petrol)}
[dir=rtl] .copy{text-align:right}
.phone{position:absolute;left:130px;top:640px;width:1060px;padding:20px;border-radius:124px;background:#0C1718;box-shadow:0 60px 120px rgba(5,20,21,.45)}
.phone img,.phone .pending{display:block;width:1020px;height:${Math.round(1020 * H / W)}px;border-radius:104px;object-fit:cover}
.phone .pending{background:repeating-linear-gradient(45deg,#ddd 0 40px,#eee 40px 80px);display:grid;place-items:center;font-size:60px;color:#777}
.card{position:absolute;padding:14px;background:#fff;border-radius:30px;box-shadow:0 40px 80px rgba(5,20,21,.45)}
.card img{display:block;width:100%;border-radius:18px}
.stamp{position:absolute;left:50%;top:44%;translate:-50% -50%;rotate:-10deg;padding:6px 26px;border:8px solid var(--stamp);border-radius:18px;color:var(--stamp);background:rgba(255,255,255,.82);font-weight:600;font-size:66px;text-transform:uppercase;white-space:nowrap}
.badge{position:absolute;display:grid;place-items:center;border-radius:50%;background:var(--stamp);color:var(--paper);font-weight:600;rotate:10deg;box-shadow:0 24px 50px rgba(5,20,21,.4)}
.heart{position:absolute;left:-40px;top:-40px;width:128px;height:128px;border-radius:50%;background:var(--stamp);display:grid;place-items:center;box-shadow:0 16px 36px rgba(5,20,21,.4)}
`;

const heart = '<svg width="64" height="64" viewBox="0 0 24 24" fill="#F2E7D5"><path d="M12 21s-7.5-4.6-10-9.3C.4 8.4 2.3 4.5 6 4.5c2.2 0 3.6 1.2 4.4 2.5h3.2C14.4 5.7 15.8 4.5 18 4.5c3.7 0 5.6 3.9 4 7.2C19.5 16.4 12 21 12 21z"/></svg>';

function frame(lang, screen, raw) {
  const [headline, sub] = copy.frames[screen][lang];
  const words = copy.words[lang];
  const ground = ['02-filters', '04-done'].includes(screen) ? 'paper' : 'petrol';
  const shot = raw ? `<img src="${raw}" alt="">` : '<div class="pending">captura pendiente</div>';
  let extra = '';
  if (screen === '01-hero') extra = `
    <div class="card" style="left:34px;top:1240px;width:400px;rotate:-15deg"><img src="${library('k1-beach-dog-blurry.webp')}" alt=""><span class="stamp">${words.stamp}</span></div>
    <div class="badge" style="right:60px;top:560px;width:250px;height:250px;font-size:${words.free.length > 6 ? 56 : 70}px">${words.free}</div>`;
  if (screen === '03-review') extra = `
    <div class="card" style="right:34px;top:1180px;width:380px;rotate:9deg"><img src="${library('k2-cookies-hands.webp')}" alt=""><span class="heart">${heart}</span></div>`;
  return `<!doctype html><html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><style>${css}</style></head><body>
    <div class="ground ${ground}"></div>
    <div class="copy ${ground}-ink"><h1>${headline}</h1><p>${sub}</p></div>
    <div class="phone">${shot}</div>${extra}</body></html>`;
}

fs.mkdirSync(outDir, { recursive: true });
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
    // Long headlines (German, French) step down until they fit in two lines.
    const h1 = document.querySelector('h1');
    let size = 112;
    while (h1.getBoundingClientRect().height > 112 * 1.04 * 2 + 4 && size > 80) { size -= 4; h1.style.fontSize = size + 'px'; }
  });
  await page.screenshot({ path: path.join(outDir, `${lang}-${screen}.jpg`), type: 'jpeg', quality: 92 });
  made++;
}
await browser.close();
console.log(`STORE_FRAMES made=${made} pendingCaptures=${pending} out=${outDir}`);
