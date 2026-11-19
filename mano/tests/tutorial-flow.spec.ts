import { expect, test, type Page } from "@playwright/test";

// The first-launch practice (user, 2026-11-19): six steps learned by doing, each with
// its gesture or its button, a gentle miss for the wrong way, the deletion counter on
// «Terminar», «Saltar» always there, and nothing written to the decision record.
test.setTimeout(60_000);

async function openPractice(page: Page) {
  await page.goto("/");
  await page.locator(".splash").waitFor({ state: "detached", timeout: 15_000 });
  await page.locator(".ob-next").click();
  await expect(page.locator(".tutorial")).toBeVisible();
  await expect(step(page)).toHaveText("1 of 6");
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
  await expect(page.locator(".coach-bubble.is-missed")).toBeVisible();
  await expect(step(page)).toHaveText("1 of 6");
  await page.waitForTimeout(600); // the photo springs back from the wrong side first
  await swipe(page, 140, 0);
  await expect(page.locator(".coach-bubble.is-done")).toBeVisible();
  await expect(step(page)).toHaveText("2 of 6", { timeout: 4000 });
  // Delete: the counter on «Terminar» goes up.
  await swipe(page, -140, 0);
  await expect(page.locator(".finish-count")).toHaveText("1");
  await expect(step(page)).toHaveText("3 of 6", { timeout: 4000 });
  // Undo brings it back (counter gone), then it goes back to the queue.
  await page.locator(".tut-undo").click();
  await expect(page.locator(".finish-count")).toHaveCount(0);
  await expect(page.locator('[data-testid="tutorial-card-screenshot"]')).toBeVisible();
  await expect(step(page)).toHaveText("4 of 6", { timeout: 5000 });
  await expect(page.locator(".finish-count")).toHaveText("1");
  // Favourite with the gesture, «Más tarde» with its button.
  await swipe(page, 0, -170);
  await expect(step(page)).toHaveText("5 of 6", { timeout: 4000 });
  await page.locator(".tut-later").click();
  await expect(step(page)).toHaveText("6 of 6", { timeout: 4000 });
  await page.locator(".tutorial .header-action.finish").click();
  await expect(page.locator(".coach-bubble.is-done")).toBeVisible();
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
  await expect(step(page)).toHaveText("2 of 6", { timeout: 4000 });
  await page.locator(".tut-skip").click();
  await expect(page.locator(".ob-skip-note")).toBeVisible();
  await expect(page.getByRole("button", { name: /^(Start|Allow access to Photos)$/ })).toBeVisible();
  const log = await page.evaluate(() => JSON.parse(localStorage.getItem("cocowash-tutorial-log-v1") || "{}"));
  expect(log.skipped).toEqual([0, 1, 0, 0, 0, 0]);
});

test("with Reduce Motion the hand stays still and the practice completes with the buttons", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPractice(page);
  await expect(page.locator(".coach-hand.is-still .coach-hand-icon")).toBeVisible();
  for (const [selector, next] of [[".bar-keep", "2 of 6"], [".bar-discard", "3 of 6"], [".tut-undo", "4 of 6"], [".bar-heart", "5 of 6"], [".tut-later", "6 of 6"]]) {
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
  await expect(step(page)).toHaveText("1 of 6");
  await expect(page.locator(".coach-bubble.is-done")).toHaveCount(0);
});
