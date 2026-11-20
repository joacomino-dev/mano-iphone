import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ retries: 2 });

// The pile must read every real swipe (users, 2026-11-19: «a veces no les lee el deslizar a
// la izquierda; se mueve un poco y no hace caso»): from anywhere on the photo, as a quick
// flick, after a slow start, and never show a stamp that the release then ignores.
const TIPS_SEEN = '{"seen":["stack","zoom","anchor","album"]}';
async function openDemo(page: Page) {
  await page.addInitScript(tips => { localStorage.setItem("cocowash-onboarding-v2", "done"); localStorage.setItem("cocowash-tips-v1", tips); }, TIPS_SEEN);
  await page.goto("/");
  await expect(page.locator(".photo-card.front")).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(900);
}
const frontId = (page: Page) => page.locator(".photo-card.front").first().getAttribute("data-testid");
/** Same front card after a decision means the decision did not happen. */
async function decided(page: Page, before: string | null) {
  await expect.poll(async () => (await frontId(page)) !== before, { timeout: 2500 }).toBe(true);
}
async function cardPoint(page: Page, fx: number, fy: number) {
  const box = (await page.locator(".photo-card.front").first().boundingBox())!;
  return { x: box.x + box.width * fx, y: box.y + box.height * fy };
}
/** A drag with real timing: `ms` from touch-down to release, `steps` moves in between. */
async function drag(page: Page, from: { x: number; y: number }, dx: number, dy: number, ms: number, steps = 8, holdFirst = 0) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  if (holdFirst) await page.waitForTimeout(holdFirst);
  for (let i = 1; i <= steps; i++) { await page.mouse.move(from.x + dx * i / steps, from.y + dy * i / steps); await page.waitForTimeout(ms / steps); }
  await page.mouse.up();
}

test("a swipe that starts on the lower right of the photo (the thumb's spot) is read", async ({ page }) => {
  await openDemo(page);
  const before = await frontId(page);
  await drag(page, await cardPoint(page, .86, .8), -170, 0, 260);
  await decided(page, before);
});

/** A real flick: the moves go in one burst (Playwright's separate moves take tens of ms
 * each, which would make any flick slow). `pause` slows it down into a nudge. */
async function flick(page: Page, dx: number, dy: number, pause = 0) {
  const from = await cardPoint(page, .5, .5);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  if (pause) { for (let i = 1; i <= 10; i++) { await page.mouse.move(from.x + dx * i / 10, from.y + dy * i / 10); await page.waitForTimeout(pause / 10); } }
  else await page.mouse.move(from.x + dx, from.y + dy, { steps: 3 });
  await page.mouse.up();
}

test("a quick short flick to the left decides, like any phone list", async ({ page }) => {
  // The flick is timing: when parallel test pages saturate the machine, the synthetic moves
  // arrive 60–140 ms apart and stop being a flick (2026-11-20 logs). A device timestamps the
  // touch itself. Retries absorb that harness noise; the rule is unit-tested in swipe.test.mjs.
  test.info().annotations.push({ type: "timing", description: "retried on harness stalls" });
  await openDemo(page);
  // On a video card, its first load blocks the page ~100 ms and the test's moves arrive late
  // and bunched, which no rule can read as a flick: flick on a photo (the demo pile is random).
  for (let i = 0; i < 6 && await page.locator(".photo-card.front.tape").count(); i++) {
    await page.getByRole("button", { name: "Keep", exact: true }).click(); await page.waitForTimeout(700);
  }
  const before = await frontId(page);
  await flick(page, -44, 0);
  await decided(page, before);
});

test("a short slow nudge is not a flick: nothing is decided", async ({ page }) => {
  await openDemo(page);
  const before = await frontId(page);
  await flick(page, -30, 0, 700);
  await page.waitForTimeout(800);
  expect(await frontId(page)).toBe(before);
});

test("a slow start (finger resting a moment, then a clear swipe) still decides", async ({ page }) => {
  await openDemo(page);
  const before = await frontId(page);
  await drag(page, await cardPoint(page, .5, .5), -180, 6, 600, 12, 450);
  await decided(page, before);
});

test("the stamp shows only when letting go will decide: a short slow drag shows none and decides nothing", async ({ page }) => {
  await openDemo(page);
  const before = await frontId(page);
  const from = await cardPoint(page, .5, .5);
  await page.mouse.move(from.x, from.y); await page.mouse.down();
  for (let i = 1; i <= 10; i++) { await page.mouse.move(from.x - 5 * i, from.y); await page.waitForTimeout(40); }
  await expect(page.locator(".hand-space.discard")).toHaveCount(0);
  await page.waitForTimeout(250);
  await page.mouse.up();
  await page.waitForTimeout(800);
  expect(await frontId(page)).toBe(before);
});
