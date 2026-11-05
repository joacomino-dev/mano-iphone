// QA capture for build 24 visual audit. Demo/fixture data only: no photos, no
// native bridge. Writes PNGs and a JSON index to ../work/qa-b24/.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const base = process.env.COCOWASH_QA_URL ?? 'http://127.0.0.1:4312';
const out = '../work/qa-b24'; fs.mkdirSync(out, { recursive: true });
const index = [], errors = [];
const browser = await chromium.launch({ channel: 'msedge', headless: true });

function fixture(state) {
  localStorage.setItem('cocowash-onboarding-v2', 'done');
  const assets = Array.from({ length: 12 }, (_, i) => ({ id: `demo-${i + 1}`, kind: 'photo', date: 1700000000000 + i * 86400000, width: 1000, height: 1500, duration: 0, demo: true }));
  const people = Array.from({ length: state.groupCount ?? 0 }, (_, g) => ({ id: `p${g}`, name: g === 0 ? 'Ana' : `Persona ${g + 1}`, count: 5 + g * 7, representative: 'demo-1',
    portraits: assets.slice(g % 3, g % 3 + Math.max(1, 4 - (g % 4))).map((a, i) => ({ id: a.id, face: `face-${g}-${i}` })) }));
  const s = { available: true, consent: true, running: false, phase: 'paused', hasPublication: false, revision: 0, minimumPhotos: 5, protectionRevision: 0,
    processed: 0, total: 0, remaining: 0, waiting: 0, aliases: {}, groups: people, ...state.status };
  const libraryMethods = ['permissionStatus', 'assets', 'sizes', 'classify', 'cancelClassify', 'analyze', 'cancelAnalysis', 'diagnostic', 'haptic', 'place', 'releasePreparedVideos', 'authorize', 'albums', 'share'];
  const headers = name => ({ name, methods: [...(name === 'People' ? ['command'] : libraryMethods).map(name => ({ name, rtype: 'promise' })), { name: 'addListener', rtype: 'callback' }, { name: 'removeListener', rtype: 'promise' }] });
  window.CapacitorCustomPlatform = { name: 'ios' };
  window.Capacitor = { PluginHeaders: [headers('People'), headers('PhotoLibrary')], nativeCallback: () => 'fixture-listener', nativePromise: async (plugin, method, o = {}) => {
    if (method === 'removeListener') return {};
    if (plugin === 'PhotoLibrary') {
      if (method === 'permissionStatus' || method === 'authorize') return { status: 'authorized' };
      if (method === 'assets') return { status: 'authorized', assets };
      if (method === 'sizes') return { sizes: {} };
      if (method === 'classify') return { results: {}, skipped: 0, cancelled: false };
      if (method === 'analyze') return { groups: [], skipped: 0, cancelled: false };
      if (method === 'albums') return { albums: [] };
      return {};
    }
    if (o.action === 'portrait') return { path: `/assets/demo/postcard-${(Number(o.face.split('-').pop()) % 8) + 1}.svg` };
    if (o.action === 'redact') { await new Promise(r => setTimeout(r, state.slowRedact ?? 80)); return { path: `/assets/demo/postcard-3.svg?protected=${o.style}` }; }
    if (o.action === 'person') return { ids: assets.slice(0, 6).map(a => a.id), items: assets.slice(0, 2).map((a, i) => ({ id: a.id, faces: [{ id: `f${i}`, box: [0.3, 0.2, 0.25, 0.2] }, { id: `g${i}`, box: [0.6, 0.3, 0.15, 0.12] }] })) };
    if (o.action === 'scan' && state.failScan) throw new Error('fixture');
    if (o.action === 'pause' || o.action === 'scan' || o.action === 'status' || o.action === 'refresh') return { ...s };
    return { ...s };
  } };
}

async function shot(name, page, note) { await page.screenshot({ path: `${out}/${name}.png` }); index.push({ name, note, viewport: page.viewportSize() }); }
async function people(name, state, note, { viewport = { width: 390, height: 844 }, motion = 'no-preference', scale = 1, after } = {}) {
  const page = await browser.newPage({ viewport, reducedMotion: motion });
  page.on('pageerror', e => errors.push(`${name}: ${e.message}`));
  await page.addInitScript(fixture, state);
  if (scale !== 1) await page.addInitScript(s => document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.fontSize = `${s * 100}%`; }), scale);
  await page.goto(`${base}/tests/people-ui.html?application`);
  await page.locator('.hand-space article.front').waitFor(); await page.waitForTimeout(1200);
  await page.locator('#filter-trigger').click(); await page.locator('#people-entry').click(); await page.locator('#people-view').waitFor();
  await page.waitForTimeout(700);
  if (after) await after(page);
  await shot(name, page, note); await page.close();
}

const part = process.env.QA_PART ?? 'all';
const groups = { groupCount: 6, status: { phase: 'ready', hasPublication: true, revision: 2 } };
if (part !== 'demo') {
await people('p01-consent', { status: { consent: false } }, 'Consentimiento');
await people('p02-indexing', { status: { running: true, phase: 'indexing', processed: 1040, total: 1530, remaining: 478, waiting: 12 } }, 'Primera pasada con fotos sin vista local');
await people('p03-waiting-memory', { status: { running: true, phase: 'indexing', blocked: 'memory', processed: 1040, total: 1530, remaining: 490 } }, 'En espera por recursos (build 24 memoria)');
await people('p04-paused', { status: { running: false, phase: 'paused', processed: 1040, total: 1530, remaining: 490 } }, 'Pausado por el usuario');
await people('p05-interrupted-b24', { status: { running: false, phase: 'paused', blocked: 'interrupted', interruptedPhase: 'group', guarded: ['group'], skipped: 2, processed: 1040, total: 1530, remaining: 488 } }, 'Build 24: cierre abrupto, fase, pausa de seguridad y fotos apartadas');
await people('p06-error', { failScan: true, status: { running: true, phase: 'indexing', processed: 1040, total: 1530, remaining: 490 } }, 'Error recuperable', { after: async p => { await p.waitForSelector('.date-error', { timeout: 8000 }).catch(() => {}); } });
await people('p07-reconciling', { status: { running: true, phase: 'reconciling', processed: 1530, total: 1530, remaining: 0 } }, 'Organizando los grupos');
await people('p08-ready-groups', groups, 'Grupos publicados con mosaicos', { after: async p => { await p.locator('.people-groups').scrollIntoViewIfNeeded(); await p.waitForTimeout(500); } });
await people('p09-group-selected', groups, 'Grupo seleccionado', { after: async p => { await p.locator('.people-groups>button').first().click(); await p.getByRole('button', { name: 'Revisar estas fotografías' }).scrollIntoViewIfNeeded(); await p.waitForTimeout(400); } });
await people('p10-corrections', groups, 'Corregir grupo con recuadros', { after: async p => { await p.locator('.people-groups>button').first().click(); await p.locator('details summary').click(); await p.locator('.people-corrections').scrollIntoViewIfNeeded(); await p.waitForTimeout(600); } });
await people('p11-interrupted-narrow-large', { status: { running: false, phase: 'paused', blocked: 'interrupted', interruptedPhase: 'reconcile-group', guarded: ['reconcile-group'], skipped: 1, processed: 1530, total: 1530, remaining: 0 } }, 'iPhone SE + texto 130 %', { viewport: { width: 375, height: 667 }, scale: 1.3 });
await people('p12-groups-narrow-large', groups, 'Mosaicos iPhone SE + texto 130 %', { viewport: { width: 375, height: 667 }, scale: 1.3, after: async p => { await p.locator('.people-groups').scrollIntoViewIfNeeded(); await p.waitForTimeout(500); } });

// Censored review: broken heart, covered loading state, then derivative.
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', e => errors.push(`censor: ${e.message}`));
  await page.addInitScript(fixture, { ...groups, slowRedact: 2500 });
  await page.goto(`${base}/tests/people-ui.html?application`); await page.locator('.hand-space article.front').waitFor(); await page.waitForTimeout(1000);
  await page.locator('#filter-trigger').click(); await page.locator('#people-entry').click();
  await page.locator('.people-groups>button').first().click();
  await page.getByRole('button', { name: 'Ajustar Breakup Mode' }).click();
  await page.getByRole('group', { name: 'Modo de Breakup' }).getByRole('button', { name: 'Rostro censurado' }).click();
  await shot('c01-breakup-settings', page, 'Ajustes de Breakup Mode');
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await page.waitForTimeout(300); await shot('c02-censor-covered', page, 'Cubierta durante la carga del derivado');
  await page.waitForFunction(() => document.querySelector('.photo-window img')?.getAttribute('src')?.includes('protected='), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400); await shot('c03-censor-ready', page, 'Derivado protegido con corazón roto');
  const tree = await page.locator('article.front').evaluate(e => [...e.querySelectorAll('[aria-label],[role]')].map(n => `${n.getAttribute('role') ?? n.tagName.toLowerCase()}:${n.getAttribute('aria-label') ?? ''}`).slice(0, 40));
  index.push({ name: 'c03-a11y', note: 'Etiquetas accesibles en la tarjeta protegida', tree });
  await page.close();
}

}
// Demo application inside the protected preview runtime: pile, video, VHS, seals.
for (const motion of ['no-preference', 'reduce']) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1100 }, reducedMotion: motion });
  page.on('pageerror', e => errors.push(`demo-${motion}: ${e.message}`));
  await page.addInitScript(() => localStorage.setItem('cocowash-onboarding-v2', 'done'));
  await page.goto(base); await page.locator('article.front').first().waitFor(); await page.waitForTimeout(6000);
  const tag = motion === 'reduce' ? 'reduce' : 'normal';
  await shot(`d01-pile-${tag}`, page, `Pila al inicio (${motion})`);
  const others = page.getByRole('button', { name: /Elegir las demás/ });
  if (await others.count()) { await others.first().click(); await page.waitForTimeout(700); await shot(`d02-pile-all-${tag}`, page, `Pila con todas seleccionadas (${motion})`); }
  const counter = await page.locator('.stack-count, [class*="selection"]').allTextContents().catch(() => []);
  index.push({ name: `d02-counter-${tag}`, counter });
  if (motion === 'reduce') { await page.close(); continue; }
  // Advance with «Más tarde» until a video is in front.
  for (let i = 0; i < 12 && !(await page.locator('article.front video, article.front .video-chip').count()); i++) {
    await page.getByRole('button', { name: /para más tarde/ }).first().click(); await page.waitForTimeout(900);
  }
  await page.waitForTimeout(1500); await shot('d03-video-card', page, 'Vídeo en tarjeta con VHS');
  const hide = page.getByRole('button', { name: 'Ocultar letras VHS' });
  if (await hide.count()) { await hide.first().click(); await page.waitForTimeout(500); await shot('d04-vhs-hidden', page, 'VHS oculto'); await page.getByRole('button', { name: 'Mostrar letras VHS' }).first().click(); await page.waitForTimeout(700); await shot('d05-vhs-back', page, 'VHS tras volver a mostrar'); }
  const controls = await page.locator('article.front button').evaluateAll(b => b.map(x => ({ label: x.getAttribute('aria-label') ?? x.textContent.trim(), w: Math.round(x.getBoundingClientRect().width), h: Math.round(x.getBoundingClientRect().height) })));
  index.push({ name: 'd05-card-controls', controls });
  await page.getByRole('button', { name: /^Filtros/ }).first().click(); await page.waitForTimeout(600);
  const seal = page.locator('.seal-explainer'); if (await seal.count()) { await seal.scrollIntoViewIfNeeded(); await page.waitForTimeout(400); await shot('d06-seals', page, 'Explicación de sellos'); }
  const select = page.locator('select').filter({ hasText: 'Todos los niveles' });
  if (await select.count()) { await select.selectOption('5'); await page.waitForTimeout(400); await shot('d07-seal-v', page, 'Sello V elegido'); }
  await page.close();
}
fs.writeFileSync(`${out}/index-${part}.json`, JSON.stringify({ base, errors, index }, null, 2));
console.log(JSON.stringify({ shots: index.length, errors }, null, 1));
await browser.close();
