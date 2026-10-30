// Demo-only render of the built native bundle with a MOCKED Capacitor bridge (no PhotoKit, no personal photos).
// Usage: node nativemock.mjs <manoDir> <outDir> <baseUrl>
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
const [manoDir, outDir, base] = process.argv.slice(2);
const require = createRequire(path.join(manoDir, 'package.json'));
const { chromium } = require('@playwright/test');
mkdirSync(outDir, { recursive: true });
const bridge = scenario => {
  window.webkit = { messageHandlers: { bridge: { postMessage() {} } } };
  const now = Date.now();
  const assets = Array.from({ length: 24 }, (_, i) => ({ id: `mock-${i}`, kind: i === 3 ? 'video' : i === 7 ? 'live' : 'photo', date: now - (24 - i) * 86400000, width: i % 4 === 1 ? 1500 : 1000, height: i % 4 === 1 ? 1000 : 1500, duration: i === 3 ? 4 : 0, modified: 1 }));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const slow = scenario.slow ? 1200 : 20;
  const impl = {
    authorize: async () => ({ status: scenario.status }),
    assets: async () => { if (scenario.assetsFail) throw new Error('mock failure'); return { assets, status: scenario.status }; },
    thumbnail: async () => { await wait(slow); return { path: '/assets/photos/lake.png' }; },
    albums: async () => ({ albums: [{ id: 'a1', title: 'Viajes' }, { id: 'a2', title: 'Familia' }, { id: 'a3', title: 'Recetas' }] }),
    addToAlbum: async () => undefined, createAlbum: async ({ title }) => ({ album: { id: 'n', title }, added: 1 }),
    metadata: async ({ id }) => ({ id, kind: 'photo', width: 1000, height: 1500, duration: 0, isFavorite: false, isHidden: false, exifStatus: 'absent' }),
    favorite: async () => ({ missing: [] }),
    deleteAssets: async () => { throw new Error('QA: deletion disabled in mock'); },
    preview: async () => undefined,
    prepareVideo: async () => { await wait(slow); return { path: '/assets/demo-video.mp4', mimeType: 'video/mp4', cached: true, bytes: 1 }; },
    cancelVideoPreparation: async () => ({ cancelled: true }), cancelThumbnailPreparation: async () => ({ cancelled: true }),
    releasePreparedVideos: async () => ({ released: 0 }),
    analyze: async ({ ids }) => ({ groups: [ids.slice(0, 4), ids.slice(10, 13)], skipped: 0, cancelled: false }),
    cancelAnalysis: async () => undefined, removeListener: async () => undefined,
  };
  window.Capacitor = {
    PluginHeaders: [{ name: 'PhotoLibrary', methods: [...Object.keys(impl).map(name => ({ name, rtype: 'promise' })), { name: 'addListener', rtype: 'callback' }] }],
    nativePromise: (_p, method, options) => impl[method](options || {}),
    nativeCallback: () => 'cb-1',
    convertFileSrc: p => p,
  };
};
const browser = await chromium.launch({ channel: 'msedge' });
const errors = [];
async function open(name, { width, height, scenario, motion = 'reduce' }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, reducedMotion: motion, hasTouch: true, isMobile: width < 700 });
  await ctx.addInitScript(bridge, scenario);
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`${name} pageerror ${e}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`${name} ${m.text()}`); });
  await page.goto(base + '/native.html', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  return { ctx, page, shot: async (n, t = 500) => { await page.waitForTimeout(t); await page.screenshot({ path: path.join(outDir, `${name}-${n}.png`) }); } };
}
const metrics = page => page.evaluate(() => {
  const r = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; };
  const small = [...document.querySelectorAll('button, [role=button], input, select')].filter(e => { const b = e.getBoundingClientRect(); return b.width && b.height && (b.width < 44 || b.height < 44) && getComputedStyle(e).visibility !== 'hidden'; }).map(e => `${(e.getAttribute('aria-label') || e.textContent || e.id).trim().slice(0, 24)} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`);
  return { doc: [document.documentElement.scrollWidth, document.documentElement.scrollHeight, innerWidth, innerHeight], header: r('.archive-header'), card: r('.photo-card.front'), decisions: r('.decision-buttons'), tools: r('.archive-tools'), small };
});
const sizes = [['se', 375, 667], ['mini', 375, 812], ['promax', 430, 932], ['ipad', 820, 1180]];
for (const [name, width, height] of sizes) {
  const { ctx, page, shot } = await open(name, { width, height, scenario: { status: 'authorized' } });
  await shot('welcome');
  await page.locator('#start-trigger').click();
  await page.locator('[data-testid="photo-hand"]').waitFor({ timeout: 20000 });
  await shot('session', 900);
  console.log(name, JSON.stringify(await metrics(page)));
  if (name === 'se' || name === 'ipad') {
    await page.locator('#filter-trigger').click(); await shot('filters', 700);
    await page.keyboard.press('Escape'); await page.waitForTimeout(500);
    await page.locator('#album-trigger').click(); await shot('albums', 700);
    await page.keyboard.press('Escape'); await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Descartar' }).click(); await page.waitForTimeout(600);
    await page.getByRole('button', { name: 'Descartar' }).click(); await page.waitForTimeout(600);
    await page.locator('#review-trigger').click(); await shot('review', 800);
    console.log(name, 'review', JSON.stringify(await metrics(page)));
  }
  await ctx.close();
}
{ const { ctx, page, shot } = await open('se', { width: 375, height: 667, scenario: { status: 'authorized', slow: true } });
  await page.locator('#start-trigger').click(); await shot('preparing', 700); await ctx.close(); }
{ const { ctx, page, shot } = await open('se', { width: 375, height: 667, scenario: { status: 'denied' } });
  await page.locator('#start-trigger').click(); await shot('denied', 900); await ctx.close(); }
{ const { ctx, page, shot } = await open('mini', { width: 375, height: 812, scenario: { status: 'limited' } });
  await page.locator('#start-trigger').click(); await page.locator('[data-testid="photo-hand"]').waitFor({ timeout: 20000 }); await shot('limited', 600); await ctx.close(); }
console.log('errors', JSON.stringify(errors));
await browser.close();
