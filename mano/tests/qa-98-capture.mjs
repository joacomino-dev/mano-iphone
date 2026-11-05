// 9.8 visual QA: real ManoApp with a simulated bridge (demo postcards only).
// QA_OUT folder, QA_TAG suffix. Normal mode and «Modo de prueba» (ads).
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const base = process.env.COCOWASH_QA_URL ?? 'http://127.0.0.1:4312';
const out = process.env.QA_OUT ?? '../work/qa-98'; fs.mkdirSync(out, { recursive: true });
const index = [], errors = [];
const browser = await chromium.launch({ channel: 'msedge', headless: true });

function bridge(opts) {
  if (opts.onboarded) localStorage.setItem('cocowash-onboarding-v2', 'done');
  if (opts.test) localStorage.setItem('cocowash-test-mode-v1', '1');
  const assets = Array.from({ length: 14 }, (_, i) => ({ id: `demo-${i + 1}`, kind: i === 2 ? 'video' : 'photo', date: 1700000000000 + i * 86400000, width: i === 2 ? 1500 : 1000, height: i === 2 ? 1000 : 1500, duration: i === 2 ? 2 : 0, demo: true, hasLocation: true }));
  const methods = ['permissionStatus', 'assets', 'sizes', 'classify', 'cancelClassify', 'analyze', 'cancelAnalysis', 'diagnostic', 'haptic', 'place', 'releasePreparedVideos', 'authorize', 'albums', 'share', 'favorite', 'deleteAssets'];
  const header = (name, list) => ({ name, methods: [...list.map(n => ({ name: n, rtype: 'promise' })), { name: 'addListener', rtype: 'callback' }, { name: 'removeListener', rtype: 'promise' }] });
  window.CapacitorCustomPlatform = { name: 'ios' };
  window.Capacitor = { PluginHeaders: [header('PhotoLibrary', methods), header('CocoMonetization', ['status', 'catalog', 'buy', 'restore', 'prepare', 'show', 'hide', 'privacy'])],
    nativeCallback: () => 'listener', nativePromise: async (plugin, method) => {
      if (method === 'removeListener') return {};
      if (plugin === 'CocoMonetization') {
        if (method === 'catalog') return { adFree: false, products: [{ id: 'work.joaquin.mano.noads.year', price: 'US$3,99' }, { id: 'work.joaquin.mano.noads.lifetime', price: 'US$10,00' }, { id: 'work.joaquin.mano.coffee', price: 'US$1,50' }] };
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
async function open(opts = {}, viewport = { width: 390, height: 844 }) {
  const page = await browser.newPage({ viewport, reducedMotion: opts.reduced ? 'reduce' : 'no-preference' });
  page.on('pageerror', e => errors.push(`${opts.tag}: ${e.message}`));
  await page.addInitScript(bridge, { onboarded: true, ...opts });
  await page.goto(`${base}/tests/app-ui.html`);
  return page;
}
async function shot(page, name, note) { await page.screenshot({ path: `${out}/${name}.png` }); index.push({ name, note }); }
const ready = async page => { await page.locator('.hand-space article.front').first().waitFor({ timeout: 20000 }); await page.locator('.splash').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {}); await page.waitForTimeout(800); };

// Splash with the maker lockup.
{ const page = await open({ tag: 'splash' }); await page.waitForTimeout(700); await shot(page, '01-splash', 'Arranque con Zángano Studio'); await page.close(); }
// Main pile, photo card with Compartir top-right.
{ const page = await open({ tag: 'pile' }); await ready(page); await shot(page, '02-pile-photo', 'Pila: foto con Compartir arriba a la derecha');
  for (let i = 0; i < 4 && !(await page.locator('article.front .video-toggles').count()); i++) { await page.getByRole('button', { name: /para más tarde/ }).first().click(); await page.waitForTimeout(700); }
  await page.waitForTimeout(800); await shot(page, '03-pile-video', 'Vídeo: Compartir en la fila de volumen y VHS');
  const row = await page.locator('article.front .video-toggles button').evaluateAll(b => b.map(x => { const r = x.getBoundingClientRect(); return { label: x.getAttribute('aria-label'), top: Math.round(r.top), w: Math.round(r.width) }; }));
  index.push({ name: '03-video-row', row });
  // Filters, Ajustes, Apoyo.
  await page.locator('#filter-trigger').click(); await page.waitForTimeout(600); await shot(page, '04-filters', 'Filtros');
  await page.locator('.mano-sheet-body, .sheet-content').first().evaluate(e => { (e.closest('.sheet-content') ?? e).scrollTop = 900; }).catch(() => {}); await page.waitForTimeout(300); await shot(page, '05-filters-lower', 'Filtros (abajo)');
  await page.getByRole('button', { name: 'Ajustes', exact: true }).click(); await page.waitForTimeout(500);
  await page.locator('.sheet-content, .native-sheet').first().evaluate(e => { e.scrollTop = 0; }).catch(() => {}); await shot(page, '06-settings', 'Ajustes (arriba)');
  for (const [n, y] of [['07-settings-mid', 1400], ['08-settings-end', 99999]]) { await page.locator('.sheet-content, .native-sheet').first().evaluate((e, y) => { e.scrollTop = y; }, y).catch(() => {}); await page.waitForTimeout(300); await shot(page, n, 'Ajustes'); }
  await page.getByRole('button', { name: 'Apoyo', exact: true }).click(); await page.waitForTimeout(700);
  await page.locator('.sheet-content, .native-sheet').first().evaluate(e => { e.scrollTop = 0; }).catch(() => {}); await shot(page, '09-support', 'Apoyo: sellos de compra');
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click(); await page.waitForTimeout(400);
  // Terminar with nothing pending → round summary without Filtros.
  await page.getByRole('button', { name: /^Eliminar/ }).first().click(); await page.waitForTimeout(700);
  await page.locator('#review-trigger').click(); await page.waitForTimeout(900); await shot(page, '10a-review', 'Una última mirada');
  await page.getByRole('button', { name: /^Eliminar \d/ }).first().click(); await page.waitForTimeout(1500); await shot(page, '10-summary', 'Resumen tras eliminar, sin Filtros');
  index.push({ name: '10-summary-filters', filtersVisible: await page.locator('#filter-trigger').count() });
  await page.close(); }
// Test mode: chip and ad letter placeholder after a few decisions.
{ const page = await open({ tag: 'test', test: true, ads: true }); await ready(page); await shot(page, '11-test-mode', 'Modo de prueba: indicador');
  for (let i = 0; i < 7 && !(await page.locator('.cw-ad-slot').count()); i++) { await page.getByRole('button', { name: /Conservar/ }).first().click().catch(() => {}); await page.waitForTimeout(900); }
  await page.waitForTimeout(600); await shot(page, '12-test-ad-slot', 'Modo de prueba: hueco de la carta (la carta nativa se dibuja encima en el iPhone)');
  await page.close(); }
// Narrow phone + larger text on Apoyo and Ajustes.
{ const page = await open({ tag: 'narrow' }, { width: 375, height: 667 }); await page.addStyleTag({ content: 'html{font-size:130%}' }).catch(() => {}); await ready(page);
  await page.addStyleTag({ content: 'html{font-size:130%}' });
  await page.locator('#filter-trigger').click(); await page.getByRole('button', { name: 'Apoyo', exact: true }).click(); await page.waitForTimeout(600); await shot(page, '13-support-narrow-large', 'Apoyo en iPhone SE con texto 130 %');
  await page.close(); }
fs.writeFileSync(`${out}/index.json`, JSON.stringify({ base, errors, index }, null, 1));
console.log(JSON.stringify({ shots: index.length, errors, extra: index.filter(i => i.row || 'filtersVisible' in i) }, null, 1));
await browser.close();
