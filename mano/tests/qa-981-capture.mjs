// 9.8.1 visual QA: the real ManoApp with a simulated bridge (demo postcards only),
// in each language. QA_OUT folder; QA_LANGS (comma list) to limit languages.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const base = process.env.COCOWASH_QA_URL ?? 'http://127.0.0.1:4311';
const out = process.env.QA_OUT ?? '../work/qa-981'; fs.mkdirSync(out, { recursive: true });
const langs = (process.env.QA_LANGS ?? 'es,en,fr,ar,ja').split(',');
const index = [], errors = [];
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
async function open(opts, viewport = { width: 390, height: 844 }) {
  const page = await browser.newPage({ viewport, reducedMotion: opts.reduced ? 'reduce' : 'no-preference' });
  page.on('pageerror', e => errors.push(`${opts.lang}/${opts.tag}: ${e.message}`));
  page.on('console', m => { if (m.text().startsWith('[qa]')) console.log(opts.tag, m.text()); });
  await page.addInitScript(bridge, opts);
  await page.goto(`${base}/tests/app-ui.html`);
  return page;
}
async function shot(page, name, note) { await page.screenshot({ path: `${out}/${name}.png` }); index.push({ name, note }); }
const ready = async page => { await page.locator('.hand-space article.front').first().waitFor({ timeout: 20000 }); await page.locator('.splash').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {}); await page.waitForTimeout(900); };
const scrollSheet = (page, y) => page.locator('.native-sheet .mano-sheet-body').first().evaluate((e, y) => { e.scrollTop = y; }, y).catch(() => {});
const tab = (page, n) => page.locator('.sheet-tabs button').nth(n).click();

for (const lang of langs) {
  // Splash with the version under Zángano.
  { const page = await open({ lang, tag: 'splash' }); await page.waitForTimeout(900); await shot(page, `${lang}-01-splash`, 'Arranque con versión'); await page.close(); }
  // Pile, sheets, anchored view.
  { const page = await open({ lang, tag: 'pile', test: true }); await ready(page);
    for (let i = 0; i < 6 && await page.locator('article.front .inline-media').count(); i++) { await page.locator('.archive-tools .later').click(); await page.waitForTimeout(700); }
    await shot(page, `${lang}-02-pile`, 'Pila');
    await page.locator('.zoom-access').first().dispatchEvent('click'); await page.waitForTimeout(900); await shot(page, `${lang}-03-anchored`, 'Foto anclada: solo Anclada y Cerrar');
    await page.mouse.click(4, 420); await page.waitForTimeout(700); index.push({ name: `${lang}-03-anchored-closed-by-outside-tap`, closed: !(await page.locator('.inspection.is-pinned').count()) });
    await page.locator('#filter-trigger').click(); await page.waitForTimeout(700); await shot(page, `${lang}-04-filters`, 'Filtros');
    await scrollSheet(page, 520); await page.waitForTimeout(250); await shot(page, `${lang}-05-filters-dates`, 'Filtros: contenido, fecha, orden');
    await tab(page, 1); await page.waitForTimeout(500); await scrollSheet(page, 0); await page.waitForTimeout(200); await shot(page, `${lang}-06-settings`, 'Ajustes arriba');
    await scrollSheet(page, 560); await page.waitForTimeout(250); await shot(page, `${lang}-07-settings-dates`, 'Ajustes: formatos de fecha y hora');
    await page.locator('.settings-panel fieldset').nth(6).scrollIntoViewIfNeeded().catch(() => {}); await page.waitForTimeout(250); await shot(page, `${lang}-08-settings-lang`, 'Ajustes: iCloud e idioma');
    await tab(page, 2); await page.waitForTimeout(700); await scrollSheet(page, 0); await page.waitForTimeout(200); await shot(page, `${lang}-09-support`, 'Apoyo: sellos');
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    await page.close(); }
  // Test mode with ads: deck letter slot, then review sheet with its fixed letter, then summary.
  { const page = await open({ lang, tag: 'ads', test: true, ads: true }); await ready(page);
    for (let i = 0; i < 3; i++) { await page.locator('.bar-discard').first().click().catch(() => {}); await page.waitForTimeout(800); }
    await page.locator('#review-trigger').click(); await page.waitForTimeout(1200); await shot(page, `${lang}-10-review`, 'Una última mirada con carta fija');
    // First round in test mode: the summary letter is due, so the review one gives way (adCadence finishDue).
    await page.locator('.review-primary .danger').first().click().catch(() => {}); await page.waitForTimeout(1600); await shot(page, `${lang}-11-summary`, 'Resumen');
    index.push({ name: `${lang}-11-summary-fit`, fit: await page.evaluate(() => { const card = document.querySelector('.session-done')?.getBoundingClientRect(); const slot = document.querySelector('.cw-ad-finish')?.getBoundingClientRect(); return slot && card ? { inside: slot.bottom <= card.bottom + 1 && slot.top >= card.top, scrolls: document.querySelector('.session-done').scrollHeight > document.querySelector('.session-done').clientHeight } : null; }) });
    await page.close(); }
  // Introduction, card 3 at the tap and hold phases.
  { const page = await open({ lang, tag: 'intro', onboarded: false }); await page.locator('.ob-next').waitFor({ timeout: 20000 }); await page.locator('.splash').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
    await page.locator('.ob-next').click(); await page.waitForTimeout(7600); await page.locator('.ob-next').click(); await page.waitForTimeout(2600); await shot(page, `${lang}-12-intro-tap`, 'Intro 3: toca');
    await page.waitForTimeout(4400); await shot(page, `${lang}-13-intro-hold`, 'Intro 3: mantén y ancla'); await page.waitForTimeout(3700); await shot(page, `${lang}-14-intro-pinch`, 'Intro 3: pellizca');
    await page.close(); }
}
// Narrow phone, larger text, Spanish: support and settings.
{ const page = await open({ lang: 'es', tag: 'narrow' }, { width: 375, height: 667 }); await ready(page); await page.addStyleTag({ content: 'html{font-size:130%}' });
  await page.locator('#filter-trigger').click(); await tab(page, 2); await page.waitForTimeout(700); await shot(page, 'es-15-support-narrow-large', 'Apoyo en iPhone SE con texto 130 %');
  await tab(page, 1); await page.waitForTimeout(500); await scrollSheet(page, 560); await page.waitForTimeout(250); await shot(page, 'es-16-settings-narrow-large', 'Ajustes en iPhone SE con texto 130 %'); await page.close(); }
fs.writeFileSync(`${out}/index.json`, JSON.stringify({ base, errors, index }, null, 1));
console.log(JSON.stringify({ shots: index.length, errors, extra: index.filter(i => 'closed' in i || 'fit' in i) }, null, 1));
await browser.close();
