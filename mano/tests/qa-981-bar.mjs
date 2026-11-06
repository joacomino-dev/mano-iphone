// Close-up of the decision bar per language (2× scale): word fit and arrow sides.
import { chromium } from '@playwright/test';
const base = 'http://127.0.0.1:4311';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
function bridge(opts) {
  localStorage.setItem('cocowash-language-v1', opts.lang);
  if (opts.onboarded !== false) localStorage.setItem('cocowash-onboarding-v2', 'done');
  if (opts.test) localStorage.setItem('cocowash-test-mode-v1', '1');
  const assets = Array.from({ length: 14 }, (_, i) => ({ id: `demo-${i + 1}`, kind: i === 2 ? 'video' : 'photo', date: 1700000000000 + i * 86400000, width: i === 2 ? 1500 : 1000, height: i === 2 ? 1000 : 1500, duration: i === 2 ? 2 : 0, demo: true, hasLocation: true }));
  const methods = ['permissionStatus', 'assets', 'sizes', 'classify', 'cancelClassify', 'analyze', 'cancelAnalysis', 'diagnostic', 'haptic', 'place', 'releasePreparedVideos', 'authorize', 'albums', 'share', 'favorite', 'deleteAssets'];
  const header = (name, list) => ({ name, methods: [...list.map(n => ({ name: n, rtype: 'promise' })), { name: 'addListener', rtype: 'callback' }, { name: 'removeListener', rtype: 'promise' }] });
  window.CapacitorCustomPlatform = { name: 'ios' };
  window.CocoLocale = { preferred: [opts.lang] };
  window.Capacitor = { PluginHeaders: [header('PhotoLibrary', methods), header('CocoMonetization', ['status', 'catalog', 'buy', 'restore', 'prepare', 'show', 'hide', 'privacy'])],
    nativeCallback: () => 'listener', nativePromise: async (plugin, method) => {
      if (method === 'removeListener') return {};
      if (plugin === 'CocoMonetization') {
        if (method === 'catalog') return opts.prices === false ? { adFree: false, products: [] } : { adFree: false, products: [{ id: 'work.joaquin.mano.noads.year', price: 'US$3,99' }, { id: 'work.joaquin.mano.noads.lifetime', price: 'US$10,00' }, { id: 'work.joaquin.mano.coffee', price: 'US$1,50' }] };
        if (method === 'prepare') return { ready: !!opts.ads };
        if (method === 'show') return { shown: !!opts.ads };
        return { adFree: false };
      }
      if (method === 'permissionStatus' || method === 'authorize') return { status: 'authorized' };
      if (method === 'assets') return { status: 'authorized', assets };
      if (method === 'sizes') return { sizes: {} };
      if (method === 'classify') return { results: {}, skipped: 0, cancelled: false };
      if (method === 'analyze') return { groups: [], skipped: 0, cancelled: false };
      if (method === 'albums') return { albums: [] };
      if (method === 'deleteAssets') return { deleted: [] };
      return {};
    } };
}
for (const lang of ['de', 'it']) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await page.addInitScript(bridge, { lang });
  await page.goto(`${base}/tests/app-ui.html`);
  await page.locator('.hand-space article.front').first().waitFor({ timeout: 20000 });
  await page.locator('.splash').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.locator('.decision-bar').screenshot({ path: `../work/qa-986b/${lang}-bar.png` });
  await page.locator('.archive-header').screenshot({ path: `../work/qa-986b/${lang}-header.png` });
  await page.close();
}
await browser.close();
