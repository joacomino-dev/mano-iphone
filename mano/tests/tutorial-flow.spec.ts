import { expect, test, type Page } from "@playwright/test";

// The first-launch practice (user, 2026-11-19; eight steps from 2026-11-20): learned by doing, each with
// its gesture or its button, a gentle miss for the wrong way, the deletion counter on
// «Terminar», «Saltar» always there, and nothing written to the decision record.
test.setTimeout(60_000);

async function openPractice(page: Page) {
  await page.goto("/");
  await page.locator(".splash").waitFor({ state: "detached", timeout: 15_000 });
  await page.locator(".ob-next").click();
  await expect(page.locator(".tutorial")).toBeVisible();
  await expect(step(page)).toHaveText("1/8");
}
const step = (page: Page) => page.locator(".tut-count");

async function swipe(page: Page, dx: number, dy: number) {
  const card = page.locator(".tutorial .photo-card.front");
  await expect(card).toBeVisible();
  const box = (await card.boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(x + dx * i / 8, y + dy * i / 8);
  await page.mouse.up();
}

test("every step waits for its own action, by gesture or by button, then the privacy card", async ({ page }) => {
  await openPractice(page);
  // Wrong way: the photo comes back and Coqui corrects; the step stays.
  await swipe(page, -140, 0);
  await expect(page.locator(".coach-talk.is-missed")).toBeVisible();
  await expect(step(page)).toHaveText("1/8");
  await page.waitForTimeout(600); // the photo springs back from the wrong side first
  await swipe(page, 140, 0);
  await expect(page.locator(".coach-talk.is-done")).toBeVisible();
  await expect(step(page)).toHaveText("2/8", { timeout: 4000 });
  // Delete the flowers «by mistake»: the counter on «Terminar» goes up.
  await expect(page.locator('[data-testid="tutorial-card-flowers"]')).toBeVisible();
  await swipe(page, -140, 0);
  await expect(page.locator(".finish-count")).toHaveText("1");
  await expect(step(page)).toHaveText("3/8", { timeout: 4000 });
  // Undo brings them back (counter gone)...
  await page.locator(".tut-undo").click();
  await expect(page.locator(".finish-count")).toHaveCount(0);
  await expect(page.locator('[data-testid="tutorial-card-flowers"]')).toBeVisible();
  await expect(step(page)).toHaveText("4/8", { timeout: 5000 });
  // ...and they are kept this time.
  await swipe(page, 140, 0);
  await expect(step(page)).toHaveText("5/8", { timeout: 4000 });
  await expect(page.locator(".finish-count")).toHaveCount(0);
  // Favourite with the gesture, «Más tarde» with its button.
  await swipe(page, 0, -170);
  await expect(step(page)).toHaveText("6/8", { timeout: 4000 });
  await page.locator(".tut-later").click();
  await expect(step(page)).toHaveText("7/8", { timeout: 4000 });
  // The blurry floor photo is deleted for real, and is what «Terminar» shows marked.
  await expect(page.locator('[data-testid="tutorial-card-floor"]')).toBeVisible();
  await swipe(page, -140, 0);
  await expect(page.locator(".finish-count")).toHaveText("1");
  await expect(step(page)).toHaveText("8/8", { timeout: 4000 });
  // Deleted means gone: the pile is empty and the marked photo waits in the counter.
  await expect(page.locator(".tutorial .photo-card")).toHaveCount(0);
  await page.locator(".tutorial .header-action.finish").click();
  await expect(page.locator(".coach-talk.is-done")).toBeVisible();
  await expect(page.getByRole("button", { name: /^(Start|Allow access to Photos)$/ })).toBeVisible({ timeout: 5000 });
  const stored = await page.evaluate(() => ({ record: localStorage.getItem("mano-demo-v1"), log: JSON.parse(localStorage.getItem("cocowash-tutorial-log-v1") || "{}") }));
  // The app may store its empty record at launch; the practice adds nothing to it.
  const record = JSON.parse(stored.record ?? "{}");
  for (const field of ["pending", "history", "favorites", "removed", "later"]) expect(record[field] ?? [], `record.${field}`).toEqual([]);
  expect(record.marks ?? {}).toEqual({});
  expect(stored.log.completed).toBe(1);
  expect(stored.log.missed[0]).toBe(1);
});

test("«Saltar» goes to the privacy card with Coqui’s note, and the step is logged", async ({ page }) => {
  await openPractice(page);
  await swipe(page, 140, 0);
  await expect(step(page)).toHaveText("2/8", { timeout: 4000 });
  await page.locator(".tut-skip").click();
  await expect(page.locator(".ob-skip-note")).toBeVisible();
  await expect(page.getByRole("button", { name: /^(Start|Allow access to Photos)$/ })).toBeVisible();
  const log = await page.evaluate(() => JSON.parse(localStorage.getItem("cocowash-tutorial-log-v1") || "{}"));
  expect(log.skipped).toEqual([0, 1, 0, 0, 0, 0, 0, 0]);
});

test("with Reduce Motion the hand stays still (with its arrow) and the practice completes with the buttons", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPractice(page);
  await expect(page.locator(".coach-hand .coach-hand-icon")).toBeVisible();
  await expect(page.locator(".coach-track-head")).toBeVisible();
  for (const [selector, next] of [[".bar-keep", "2/8"], [".bar-discard", "3/8"], [".tut-undo", "4/8"], [".bar-keep", "5/8"], [".bar-heart", "6/8"], [".tut-later", "7/8"], [".bar-discard", "8/8"]]) {
    await page.locator(`.tutorial ${selector}`).click();
    await expect(step(page)).toHaveText(next, { timeout: 5000 });
  }
  await page.locator(".tutorial .header-action.finish").click();
  await expect(page.getByRole("button", { name: /^(Start|Allow access to Photos)$/ })).toBeVisible({ timeout: 5000 });
});

test("a tap on the photo while the coach is showing the gesture never counts as a swipe", async ({ page }) => {
  await openPractice(page);
  const card = page.locator(".tutorial .photo-card.front");
  // Wait until the coach's demo has carried the card past the release distance.
  await page.waitForFunction(() => {
    const el = document.querySelector<HTMLElement>(".tutorial .photo-card.front");
    const m = el && /translateX\((-?[\d.]+)px\)/.exec(el.style.transform);
    return !!m && Number(m[1]) > 70;
  }, undefined, { timeout: 8000 });
  const box = (await card.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(1500);
  await expect(step(page)).toHaveText("1/8");
  await expect(page.locator(".coach-talk.is-done")).toHaveCount(0);
});

test("the dim covers the whole app edge to edge, the photo sits above it, and only the step's button is cut out, inside the screen", async ({ page }) => {
  await openPractice(page);
  await page.waitForTimeout(700);
  const geometry = await page.evaluate(() => {
    const app = document.querySelector(".mano-app")!.getBoundingClientRect();
    const dim = document.querySelector(".tut-dim .coach-dim")!.getBoundingClientRect();
    const lit = [...document.querySelectorAll(".tut-dim .coach-glow g > *")].map(el => (el as SVGGraphicsElement).getBoundingClientRect());
    const pile = getComputedStyle(document.querySelector(".tutorial .hand-space")!).zIndex, under = getComputedStyle(document.querySelector(".tut-dim")!).zIndex;
    return { app: [app.left, app.top, app.width, app.height], dim: [dim.left, dim.top, dim.width, dim.height], lit: lit.map(b => [b.left, b.top, b.right, b.bottom]), pile: Number(pile), under: Number(under) };
  });
  geometry.dim.forEach((v, i) => expect(Math.abs(v - geometry.app[i])).toBeLessThan(1));
  // The photo is lit by sitting above the dim (so it rotates with the finger); «Conservar» is cut out.
  expect(geometry.pile).toBeGreaterThan(geometry.under);
  expect(geometry.lit.length).toBe(1);
  for (const [l, t, r, b] of geometry.lit) {
    // The glow is drawn just outside each lit edge: allow its few pixels.
    expect(l).toBeGreaterThanOrEqual(geometry.app[0] - 4); expect(t).toBeGreaterThanOrEqual(geometry.app[1] - 4);
    expect(r).toBeLessThanOrEqual(geometry.app[0] + geometry.app[2] + 4); expect(b).toBeLessThanOrEqual(geometry.app[1] + geometry.app[3] + 4);
  }
});

test("on «Terminar» the hand waits beside the button and never covers its word", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPractice(page);
  for (const [selector, next] of [[".bar-keep", "2/8"], [".bar-discard", "3/8"], [".tut-undo", "4/8"], [".bar-keep", "5/8"], [".bar-heart", "6/8"], [".tut-later", "7/8"], [".bar-discard", "8/8"]]) {
    await page.locator(`.tutorial ${selector}`).click();
    await expect(step(page)).toHaveText(next, { timeout: 5000 });
  }
  await expect(page.locator(".coach-hand .coach-hand-icon")).toBeVisible();
  await expect(page.locator(".tutorial .photo-card")).toHaveCount(0);
  const overlap = await page.evaluate(() => {
    const word = document.querySelector(".tutorial .header-action.finish span")!.getBoundingClientRect();
    const hand = document.querySelector(".coach-hand .coach-hand-icon")!.getBoundingClientRect();
    return Math.max(0, Math.min(word.right, hand.right) - Math.max(word.left, hand.left)) * Math.max(0, Math.min(word.bottom, hand.bottom) - Math.max(word.top, hand.top));
  });
  expect(overlap).toBe(0);
});
