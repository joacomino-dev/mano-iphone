// Demo-only capture: a stack of similar photos with none / some / all selected.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const base = process.env.COCOWASH_QA_URL ?? 'http://127.0.0.1:4312';
const out = process.env.QA_OUT ?? '../work/qa-b26'; fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const report = [];
for (const motion of ['no-preference', 'reduce']) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1100 }, reducedMotion: motion });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('cocowash-onboarding-v2', 'done'));
  await page.goto(base); await page.locator('article.front').first().waitFor(); await page.waitForTimeout(6000);
  for (let i = 0; i < 20 && !(await page.locator('.bundle-arrival').count()); i++) {
    await page.getByRole('button', { name: /para más tarde/ }).first().click(); await page.waitForTimeout(800);
  }
  const tag = motion === 'reduce' ? 'reduce' : 'normal';
  const overlap = async () => page.evaluate(() => {
    const chip = document.querySelector('.bundle-arrival')?.getBoundingClientRect();
    const pick = document.querySelector('article.front .pick-toggle')?.getBoundingClientRect();
    if (!chip || !pick) return null;
    return { chip: [chip.left, chip.right, chip.top, chip.bottom].map(Math.round), pick: [pick.left, pick.right, pick.top, pick.bottom].map(Math.round),
      overlaps: !(chip.right < pick.left || pick.right < chip.left || chip.bottom < pick.top || pick.bottom < chip.top), text: document.querySelector('.bundle-arrival')?.textContent };
  });
  await page.waitForTimeout(600);
  report.push({ motion, state: 'none', ...(await overlap()) }); await page.screenshot({ path: `${out}/d10-stack-none-${tag}.png` });
  await page.locator('article.front .pick-toggle').click(); await page.waitForTimeout(500);
  report.push({ motion, state: 'one', ...(await overlap()) }); await page.screenshot({ path: `${out}/d11-stack-one-${tag}.png` });
  await page.getByRole('button', { name: /Elegir/ }).first().click(); await page.waitForTimeout(500);
  report.push({ motion, state: 'others', ...(await overlap()) }); await page.screenshot({ path: `${out}/d12-stack-others-${tag}.png` });
  report.push({ motion, errors });
  await page.close();
}
fs.writeFileSync(`${out}/pile.json`, JSON.stringify(report, null, 1));
console.log(JSON.stringify(report));
await browser.close();
