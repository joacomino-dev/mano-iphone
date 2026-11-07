// Visual comparison iPhone ↔ Android (Pixel 10) of the same screens, demo data only
// (CocoWash's own postcards; no photos, no native bridge). Writes PNGs and an index
// to ../work/qa-android-compare/. Needs the preview server (vite) running.
//   COCOWASH_QA_URL=http://127.0.0.1:4184 node tests/qa-android-compare.mjs
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const base = process.env.COCOWASH_QA_URL ?? 'http://127.0.0.1:4184';
const out = process.env.QA_OUT ?? '../work/qa-android-compare';
fs.mkdirSync(out, { recursive: true });
const index = [], errors = [];
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const wait = (page, ms) => page.waitForTimeout(ms);

async function phone(page, name, note) {
  const frame = page.locator('[data-phone-screen]').first();
  const box = await frame.boundingBox();
  // The device bezel around the screen: a little margin on every side.
  const pad = 22;
  await page.screenshot({ path: `${out}/${name}.png`, clip: { x: box.x - pad, y: box.y - pad, width: box.width + pad * 2, height: box.height + pad * 2 } });
  index.push({ name, note });
}

async function previewRun(device) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1100 }, reducedMotion: 'reduce' });
  page.on('pageerror', e => errors.push(`${device}: ${e.message}`));
  await page.addInitScript(() => { localStorage.setItem('cocowash-onboarding-v2', 'done'); localStorage.setItem('cocowash-language-v1', 'es'); });
  await page.goto(base);
  if (device === 'pixel-10') {
    await page.getByTestId('device-picker').click();
    await page.getByTestId('device-option-pixel-10').click();
  }
  await page.locator('article.front').first().waitFor({ timeout: 20_000 });
  await wait(page, 5000);
  await phone(page, `${device}-01-pile`, 'Pila con la barra de decisiones');

  await page.getByRole('button', { name: /^Filtros/ }).first().click(); await wait(page, 900);
  await phone(page, `${device}-02-filters`, 'Filtros');
  await page.locator('.sheet-tabs button').nth(1).click(); await wait(page, 700);
  await phone(page, `${device}-03-settings`, 'Ajustes');
  await page.keyboard.press('Escape'); await wait(page, 800);

  // Three cards to delete, then «Terminar» → «Una última mirada».
  for (let i = 0; i < 3; i++) {
    const del = page.locator('.decision-bar button, [class*="decision"] button').filter({ hasText: /Eliminar/ }).first();
    await del.click().catch(() => {}); await wait(page, 900);
  }
  await phone(page, `${device}-04-after-decisions`, 'Tras tres «Eliminar» (contador en Terminar)');
  await page.getByRole('button', { name: /Terminar/ }).first().click(); await wait(page, 1500);
  await phone(page, `${device}-05-review`, 'Una última mirada');
  const remove = page.locator('.sheet-action.danger').first();
  if (await remove.count()) { await remove.click(); await wait(page, 2500); await phone(page, `${device}-06-summary`, 'Resumen tras eliminar (simulado)'); }
  await page.close();
}

/** «Apoyo» exists only in the native app: a native platform with simulated plugins. */
async function supportRun(platform) {
  const viewport = platform === 'android' ? { width: 412, height: 915 } : { width: 393, height: 852 };
  const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
  page.on('pageerror', e => errors.push(`support-${platform}: ${e.message}`));
  await page.addInitScript(platform => {
    localStorage.setItem('cocowash-onboarding-v2', 'done'); localStorage.setItem('cocowash-language-v1', 'es');
    const assets = Array.from({ length: 12 }, (_, i) => ({ id: `demo-${i}`, kind: 'photo', date: 1700000000000 + i * 86400000, width: 1000, height: 1500, duration: 0, demo: true }));
    const methods = names => names.map(name => ({ name, rtype: 'promise' })).concat([{ name: 'addListener', rtype: 'callback' }, { name: 'removeListener', rtype: 'promise' }]);
    window.CapacitorCustomPlatform = { name: platform };
    window.Capacitor = {
      PluginHeaders: [
        { name: 'PhotoLibrary', methods: methods(['permissionStatus', 'assets', 'sizes', 'classify', 'cancelClassify', 'analyze', 'cancelAnalysis', 'diagnostic', 'haptic', 'place', 'releasePreparedVideos', 'authorize', 'albums', 'share', 'backHandling']) },
        { name: 'CocoMonetization', methods: methods(['status', 'catalog', 'buy', 'restore', 'prepare', 'show', 'hide', 'privacy']) },
      ],
      nativeCallback: () => 'fixture-listener',
      nativePromise: async (plugin, method) => {
        if (method === 'removeListener') return {};
        if (plugin === 'CocoMonetization') {
          if (method === 'catalog') return { adFree: false, products: [{ id: 'work.joaquin.mano.noads.year', price: 'US$3,99' }, { id: 'work.joaquin.mano.noads.lifetime', price: 'US$9,99' }, { id: 'work.joaquin.mano.coffee', price: 'US$1,99' }] };
          if (method === 'prepare') return { ready: false };
          if (method === 'show') return { shown: false };
          return { adFree: false };
        }
        if (method === 'permissionStatus' || method === 'authorize') return { status: 'authorized' };
        if (method === 'assets') return { status: 'authorized', assets };
        if (method === 'sizes') return { sizes: {} };
        if (method === 'classify') return { results: {}, skipped: 0, cancelled: false };
        if (method === 'analyze') return { groups: [], skipped: 0, cancelled: false };
        if (method === 'albums') return { albums: [] };
        return {};
      },
    };
  }, platform);
  await page.goto(`${base}/native.html`);
  await page.locator('article.front').first().waitFor({ timeout: 20_000 }).catch(() => {});
  await wait(page, 3500);
  await page.getByRole('button', { name: /^Filtros/ }).first().click(); await wait(page, 900);
  const tab = page.locator('.sheet-tabs button').nth(2);
  if (await tab.count()) { await tab.click(); await wait(page, 1200); }
  await page.screenshot({ path: `${out}/${platform}-07-support.png` });
  index.push({ name: `${platform}-07-support`, note: 'Apoyo (compras), plugins simulados' });
  await page.close();
}

for (const device of ['iphone', 'pixel-10']) await previewRun(device);
for (const platform of ['ios', 'android']) await supportRun(platform);
fs.writeFileSync(`${out}/index.json`, JSON.stringify({ base, errors, index }, null, 2));
console.log(JSON.stringify({ shots: index.length, errors }, null, 1));
await browser.close();
