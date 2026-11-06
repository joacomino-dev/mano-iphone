// Close-ups: the four drag stamps (large stamp, word underneath), the bar, the mountain postcard.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const base = 'http://127.0.0.1:4311', out = '../work/qa-984'; fs.mkdirSync(out, { recursive: true });
const src = fs.readFileSync(new URL('./qa-981-capture.mjs', import.meta.url), 'utf8');
const bridge = new Function(`return (${src.slice(src.indexOf('function bridge(opts) {'), src.indexOf('async function open('))})`)();
const browser = await chromium.launch({ channel: 'msedge', headless: true });
for (const lang of ['es', 'ja']) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await page.addInitScript(bridge, { lang, test: true });
  await page.goto(`${base}/tests/app-ui.html`);
  await page.locator('.hand-space article.front').first().waitFor({ timeout: 20000 });
  await page.locator('.splash').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
  for (let i = 0; i < 6 && await page.locator('article.front .inline-media').count(); i++) { await page.locator('.archive-tools .later').click(); await page.waitForTimeout(700); }
  await page.waitForTimeout(600);
  const box = await page.locator('article.front .photo-window').boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  for (const [name, dx, dy] of [['keep', 110, 0], ['discard', -110, 0], ['favorite', 0, -110], ['later', 0, 110]]) {
    await page.mouse.move(cx, cy); await page.mouse.down();
    for (let s = 1; s <= 8; s++) { await page.mouse.move(cx + dx * s / 8, cy + dy * s / 8); await page.waitForTimeout(16); }
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${out}/${lang}-drag-${name}.png`, clip: { x: 0, y: 120, width: 390, height: 560 } });
    await page.mouse.move(cx, cy); await page.mouse.up(); await page.waitForTimeout(500);
  }
  await page.locator('.decision-bar').screenshot({ path: `${out}/${lang}-bar.png` });
  await page.close();
}
const page = await browser.newPage({ viewport: { width: 600, height: 400 }, deviceScaleFactor: 2 });
await page.goto(`${base}/assets/demo/postcard-2.svg`); await page.screenshot({ path: `${out}/postcard-2.png` });
await browser.close();
console.log('ok');
