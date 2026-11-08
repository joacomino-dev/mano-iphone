// Memory growth across delete → finish → new round cycles (browser, synthetic bridge).
// Not iPhone evidence: measures what the web layer retains between rounds.
// Usage (from mano/, dev server running): node tests/leak-cycles.mjs [cycles]
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { installAppleFixture } from './apple-fixture.mjs';
import assert from 'node:assert/strict';

const url = process.env.APPLE_AUDIT_URL || 'http://127.0.0.1:4186/native.html';
const output = path.resolve(process.env.APPLE_AUDIT_OUTPUT || '../work/apple-readiness/leak-cycles');
const cycles = Number(process.argv[2] ?? 6);
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.APPLE_BROWSER_CHANNEL || 'msedge', headless: true, args: ['--js-flags=--expose-gc'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
await context.addInitScript(installAppleFixture, { nativeMedia: process.env.LEAK_NATIVE === '1', measured:process.env.LEAK_MEASURED==='1' });
// A bigger synthetic library so every round has fresh cards.
await context.addInitScript(native => { window.__leakNative = native;
  const many = Array.from({ length: 400 }, (_, i) => ({ id: `fixture-${i}`, kind: 'photo', date: 1700000000000 + i * 86400000,
    width: 1000, height: 1500, duration: 0, hasLocation: false, demo: !window.__leakNative, bytes: 1000000 }));
  window.appleFixture.assets = many; window.appleFixture.deleteMode = 'success';
}, process.env.LEAK_NATIVE === '1');
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send('Performance.enable');
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto(url);
await page.locator('.photo-card').first().waitFor();
await page.waitForFunction(() => !document.querySelector('.splash-lockup'));

async function measure(label) {
  const {calls,items} = await page.evaluate(() => { const calls = {},items={}; for (const c of window.appleFixture.calls) {calls[c.method] = (calls[c.method] ?? 0) + 1;items[c.method]=(items[c.method]??0)+(c.args?.ids?.length??0);} window.appleFixture.calls.length = 0; return {calls,items}; });
  for (let i = 0; i < 3; i++) { await page.evaluate(() => window.gc?.()); await page.waitForTimeout(300); }
  const { metrics } = await cdp.send('Performance.getMetrics');
  const m = Object.fromEntries(metrics.map(x => [x.name, x.value]));
  const dom = await page.evaluate(() => ({
    elements: document.getElementsByTagName('*').length,
    videos: document.querySelectorAll('video').length,
    images: document.querySelectorAll('img').length,
    storageBytes: Object.keys(localStorage).reduce((n, k) => n + k.length + (localStorage.getItem(k)?.length ?? 0), 0),
    removed: JSON.parse(localStorage.getItem('cocowash-library-session-v1') || 'null')?.record?.removed?.length ?? null,
  }));
  const row = { label, heapMB: +(m.JSHeapUsedSize / 1048576).toFixed(2), nodes: m.Nodes, listeners: m.JSEventListeners,
    documents: m.Documents, layoutObjects: m.LayoutObjects, ...dom, calls,items };
  console.log(JSON.stringify(row));
  return row;
}

const rows = [await measure('start')];
for (let c = 1; c <= cycles; c++) {
  for (let i = 0; i < 4; i++) { await page.getByRole('button', { name: 'Eliminar', exact: true }).click(); await page.waitForTimeout(250); }
  await page.getByRole('button', { name: /^Terminar/ }).click();
  await page.getByRole('heading', { name: 'Una última mirada', exact: true }).waitFor();
  await page.getByRole('button', { name: /^Eliminar \d/ }).click();
  await page.waitForTimeout(600);
  // The summary sends people to Photos to empty «Eliminado recientemente»: leave and come back.
  if (process.env.LEAK_STAY !== '1') await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(200);
  if (process.env.LEAK_STAY !== '1') await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /Seguir revisando/ }).click();
  await page.locator('.photo-card').first().waitFor();
  await page.waitForTimeout(800);
  rows.push(await measure(`cycle ${c}`));
}
await fs.writeFile(path.join(output, 'leak-cycles.json'), JSON.stringify({ url, cycles, errors, rows }, null, 2));
console.log('errors', errors.length);
await browser.close();
assert.deepEqual(errors,[],'No browser runtime errors');
if(process.env.LEAK_ASSERT_INCREMENTAL==='1'){
  assert.equal(rows.reduce((sum,r)=>sum+(r.calls.analyze??0),0),1,'Deletion-only cycles must reuse the completed similarity pass');
  if(process.env.LEAK_MEASURED==='1')for(const row of rows.slice(1)){
    assert.equal(row.items.classify??0,0,'Unchanged successful classifications must be retained');
    assert.equal(row.items.sizes??0,0,'Unchanged successful weights must be retained');
  }
  assert.ok(rows.slice(1).every(r=>r.calls.assets>=1),'Foreground library and permission refresh must remain active');
}
