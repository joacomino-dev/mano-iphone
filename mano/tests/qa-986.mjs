// 9.8.6: review (top / end), summary (390 and SE), card controls on photo and video.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const base = 'http://127.0.0.1:4311', out = '../work/qa-986'; fs.mkdirSync(out, { recursive: true });
const src = fs.readFileSync(new URL('./qa-981-capture.mjs', import.meta.url), 'utf8');
const bridge = new Function(`return (${src.slice(src.indexOf('function bridge(opts) {'), src.indexOf('async function open('))})`)();
const browser = await chromium.launch({ channel: 'msedge', headless: true });
async function open(viewport, opts) {
  const page = await browser.newPage({ viewport });
  await page.addInitScript(bridge, { lang: 'es', test: true, ...opts });
  await page.goto(`${base}/tests/app-ui.html`);
  await page.locator('.hand-space article.front').first().waitFor({ timeout: 20000 });
  await page.locator('.splash').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(700);
  return page;
}
for (const [tag, viewport] of [['390', { width: 390, height: 844 }], ['se', { width: 375, height: 667 }]]) {
  const page = await open(viewport, { ads: true });
  for (let i = 0; i < 9; i++) { await page.locator('.bar-discard').first().click().catch(() => {}); await page.waitForTimeout(450); }
  await page.locator('#review-trigger').click(); await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/${tag}-review-top.png` });
  await page.locator('.review-primary').scrollIntoViewIfNeeded(); await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/${tag}-review-end.png` });
  await page.locator('.review-primary .danger').click(); await page.waitForTimeout(1600);
  await page.screenshot({ path: `${out}/${tag}-summary.png` });
  const scroll = await page.evaluate(() => { const b = document.querySelector('.done-body'); return b ? { sh: b.scrollHeight, ch: b.clientHeight } : null; });
  console.log(tag, 'summary', JSON.stringify(scroll));
  await page.close();
}
{ const page = await open({ width: 390, height: 844 }, { test: false });
  for (let i = 0; i < 8 && !(await page.locator('article.front .video-toggles').count()); i++) {
    if (!(await page.locator('article.front .inline-media').count())) await page.screenshot({ path: `${out}/card-photo-${i}.png`, clip: { x: 0, y: 100, width: 390, height: 560 } });
    await page.locator('.archive-tools .later').click(); await page.waitForTimeout(700); }
  await page.waitForTimeout(800); await page.screenshot({ path: `${out}/card-video.png`, clip: { x: 0, y: 100, width: 390, height: 560 } });
  await page.close(); }
await browser.close();
