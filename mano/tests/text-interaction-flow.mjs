// DOM touch-event contract with the synthetic library, never personal Photos.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { installAppleFixture } from './apple-fixture.mjs';
const browser = await chromium.launch(process.env.APPLE_BROWSER_EXECUTABLE
  ? { executablePath: process.env.APPLE_BROWSER_EXECUTABLE, headless: true }
  : { channel: 'msedge', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
  await context.addInitScript(installAppleFixture, {});
  const page = await context.newPage();
  await page.goto(process.env.APPLE_AUDIT_URL || 'http://127.0.0.1:4191/native.html');
  await page.locator('.photo-card.front').waitFor();
  await page.waitForFunction(() => !document.querySelector('.splash-lockup'));
  const result = await page.evaluate(() => {
    const host = document.createElement('div'); host.className = 'photo-card';
    host.innerHTML = '<span>Photo</span><button>Control</button><input><div contenteditable="true">Text</div>';
    document.body.append(host);
    const start = (target, count = 1) => {
      const points = Array.from({ length: count }, (_, identifier) => new Touch({ identifier, target, clientX: 100 + identifier * 60, clientY: 100 }));
      const e = new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: points });
      target.dispatchEvent(e); return e.defaultPrevented;
    };
    const end = target => target.dispatchEvent(new TouchEvent('touchend', { bubbles: true, changedTouches: [new Touch({ identifier: 0, target, clientX: 100, clientY: 100 })] }));
    const photo = host.querySelector('span'); start(photo); end(photo);
    const repeatedPhoto = start(photo);
    const controls = [...host.querySelectorAll('button,input,[contenteditable]')].map(el => { start(el); end(el); return start(el); });
    const pinch = start(photo, 2); end(photo);
    const afterPinch = start(photo); host.remove();
    return { repeatedPhoto, controls, pinch, afterPinch };
  });
  assert.equal(result.repeatedPhoto, true);
  assert.deepEqual(result.controls, [false, false, false]);
  assert.equal(result.pinch, false); assert.equal(result.afterPinch, false);
  await page.getByRole('button', { name: 'Álbum', exact: true }).click();
  await page.getByRole('button', { name: 'Crear álbum nuevo', exact: true }).click();
  await page.getByPlaceholder('Por ejemplo, Verano').fill('Recuerdos');
  assert.ok(await page.getByRole('button', { name: /^Crear y añadir/ }).isEnabled());
  console.log('PASS public text guard: repeated photo press suppressed; controls, fields and multi-touch preserved');
} finally { await browser.close(); }
