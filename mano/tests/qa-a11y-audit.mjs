// Pre-delivery checks (ui-ux-pro-max): touch targets < 44 pt, text < 12 px and
// text contrast < 4.5:1 on the main screens, at 375 × 667 (small phone).
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const base = process.env.COCOWASH_QA_URL ?? 'http://127.0.0.1:4311';
const src = fs.readFileSync(new URL('./qa-981-capture.mjs', import.meta.url), 'utf8');
const bridge = new Function(`return (${src.slice(src.indexOf('function bridge(opts) {'), src.indexOf('async function open('))})`)();
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const audit = () => {
  const lum = c => { const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
  const bg = el => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (c && !/rgba\(.*,\s*0\)$/.test(c) && c !== 'transparent') return c; } return 'rgb(255,255,255)'; };
  const out = { small: [], tiny: [], contrast: [] };
  const seen = new Set();
  for (const el of document.querySelectorAll('button, a, input, select, [role=button], [role=switch]')) {
    const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    if (!r.width || s.visibility === 'hidden' || s.display === 'none' || el.closest('[hidden],[inert],[aria-hidden=true]')) continue;
    if (r.width < 44 || r.height < 44) out.small.push(`${(el.getAttribute('aria-label') || el.textContent || el.className).trim().slice(0, 40)} ${Math.round(r.width)}×${Math.round(r.height)}`);
  }
  for (const el of document.querySelectorAll('body *')) {
    const t = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
    if (!t || el.closest('[aria-hidden=true],svg,[hidden]')) continue;
    const s = getComputedStyle(el); const r = el.getBoundingClientRect(); if (!r.width || s.visibility === 'hidden' || +s.opacity === 0) continue;
    const size = parseFloat(s.fontSize); const key = t.slice(0, 30);
    if (seen.has(key)) continue; seen.add(key);
    if (size < 12) out.tiny.push(`${key} ${size}px`);
    const a = lum(s.color), b = lum(bg(el)); const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    const large = size >= 18.66 || (size >= 14 && +s.fontWeight >= 700);
    if (ratio < (large ? 3 : 4.5) && !/rgba\(.*,\s*0\)/.test(s.color)) out.contrast.push(`${key} ${ratio.toFixed(2)}`);
  }
  return out;
};
const report = {};
async function screen(name, opts, go) {
  const page = await browser.newPage({ viewport: { width: 375, height: 667 } });
  await page.addInitScript(bridge, { lang: 'es', ...opts });
  await page.goto(`${base}/tests/app-ui.html`);
  await page.locator('.hand-space article.front').first().waitFor({ timeout: 20000 });
  await page.locator('.splash').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  if (go) await go(page);
  report[name] = await page.evaluate(audit);
  await page.close();
}
const tab = (page, n) => page.locator('.sheet-tabs button').nth(n).click();
await screen('pile', { test: true });
await screen('filters', { test: true }, async p => { await p.locator('#filter-trigger').click(); await p.waitForTimeout(600); });
await screen('settings', { test: true }, async p => { await p.locator('#filter-trigger').click(); await tab(p, 1); await p.waitForTimeout(600); });
await screen('support', { test: true }, async p => { await p.locator('#filter-trigger').click(); await tab(p, 2); await p.waitForTimeout(600); });
await screen('review+summary', { test: true, ads: true }, async p => {
  for (let i = 0; i < 2; i++) { await p.locator('.bar-discard').first().click(); await p.waitForTimeout(700); }
  await p.locator('#review-trigger').click(); await p.waitForTimeout(1000);
  report.review = await p.evaluate(audit);
  await p.locator('.review-primary .danger').first().click(); await p.waitForTimeout(1500);
});
console.log(JSON.stringify(report, null, 1));
await browser.close();
