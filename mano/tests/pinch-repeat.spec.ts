import { expect, test, type CDPSession, type Page } from "@playwright/test";

// The pinch to the grid must behave the same every time, not only the first:
// coming back to the card leaves nothing behind from the previous round.
test.use({ hasTouch: true });

type Point = { x: number; y: number };
type Frame = { paper: number; hand: number; ghost: number | null; grid: boolean };

const touch = (client: CDPSession, type: string, points: (Point & { id: number })[]) => client.send("Input.dispatchTouchEvent", { type, touchPoints: points });

const frame = (page: Page) => page.evaluate((): Frame => {
  const paper = document.querySelector<HTMLElement>(".grid-paper"), ghost = document.querySelector<HTMLElement>(".grid-ghost"), hand = document.querySelector<HTMLElement>(".hand-space")!;
  const box = ghost && getComputedStyle(ghost).display !== "none" ? ghost.getBoundingClientRect() : null;
  return { paper: paper ? Number(getComputedStyle(paper).opacity) : 0, hand: Number(getComputedStyle(hand).opacity), ghost: box ? Math.round(box.width) : null, grid: !!document.querySelector(".library-grid") };
});

/** Two fingers from `spread` px apart to `spread * to`, around `mid`; `gap` ms between the two lifts. */
async function pinch(page: Page, client: CDPSession, mid: Point, spread: number, to: number, gap = 0) {
  const at = (k: number) => [{ id: 0, x: mid.x, y: mid.y - spread * k / 2 }, { id: 1, x: mid.x, y: mid.y + spread * k / 2 }];
  await touch(client, "touchStart", [at(1)[0]]);
  await touch(client, "touchStart", at(1));
  const frames: Frame[] = [];
  for (let step = 1; step <= 12; step++) {
    await touch(client, "touchMove", at(1 + (to - 1) * step / 12));
    await page.waitForTimeout(32);
    frames.push(await frame(page));
  }
  if (gap) { await touch(client, "touchEnd", [at(to)[1]]); await page.waitForTimeout(gap); }
  await touch(client, "touchEnd", []);
  return frames;
}

async function open(page: Page) {
  await page.addInitScript(() => localStorage.setItem("cocowash-onboarding-v2", "done"));
  await page.goto("/");
  await expect(page.locator(".photo-card.front")).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(800);
  const box = (await page.locator(".photo-card.front").boundingBox())!;
  return { client: await page.context().newCDPSession(page), mid: { x: box.x + box.width / 2, y: box.y + box.height / 2 }, spread: box.height * .55 };
}

type Way = "pinch" | "button";
const backToCards = async (page: Page, client: CDPSession, mid: Point, spread: number, way: Way) => {
  await expect(page.locator(".library-grid")).toBeVisible();
  await page.waitForTimeout(900);
  // A real return lets go part of the way: the grid is still closing when the fingers lift.
  if (way === "pinch") await pinch(page, client, mid, spread * .5, 1.45);
  else await page.getByTestId("grid-exit").click();
};

for (const way of ["pinch", "button"] as const) for (const wait of [150, 350, 1500]) {
  test(`pinching again ${wait} ms after coming back (${way}) matches the first time`, async ({ page }) => {
    const { client, mid, spread } = await open(page);
    const first = await pinch(page, client, mid, spread, .45);
    await backToCards(page, client, mid, spread, way);
    await page.waitForTimeout(wait);
    const second = await pinch(page, client, mid, spread, .45);
    console.log(way, wait, JSON.stringify({ first: first.filter((_, i) => i % 3 === 0), second: second.filter((_, i) => i % 3 === 0) }));
    second.forEach((now, i) => {
      expect(now.grid, `grid, frame ${i}`).toBe(first[i].grid);
      expect(Math.abs(now.paper - first[i].paper), `paper, frame ${i}`).toBeLessThan(.2);
      expect(Math.abs(now.hand - first[i].hand), `hand, frame ${i}`).toBeLessThan(.2);
    });
    await page.waitForTimeout(900);
    expect((await frame(page)).paper).toBeGreaterThan(.95);
  });

  test(`a one-finger swipe ${wait} ms after coming back (${way}) still decides the card`, async ({ page }) => {
    const { client, mid, spread } = await open(page);
    await pinch(page, client, mid, spread, .45);
    await backToCards(page, client, mid, spread, way);
    await page.waitForTimeout(wait);
    await touch(client, "touchStart", [{ id: 0, ...mid }]);
    for (let step = 1; step <= 10; step++) { await touch(client, "touchMove", [{ id: 0, x: mid.x - step * 16, y: mid.y }]); await page.waitForTimeout(16); }
    await touch(client, "touchEnd", []);
    await expect(page.getByRole("button", { name: /^Undo/ }).first()).toBeEnabled();
    await expect(page.locator(".library-grid")).toHaveCount(0);
  });
}

test("a touch interrupted halfway does not leave the grid stuck between states", async ({ page }) => {
  const { client, mid, spread } = await open(page);
  const at = (k: number) => [{ id: 0, x: mid.x, y: mid.y - spread * k / 2 }, { id: 1, x: mid.x, y: mid.y + spread * k / 2 }];
  await touch(client, "touchStart", [at(1)[0]]);
  await touch(client, "touchStart", at(1));
  for (let step = 1; step <= 8; step++) { await touch(client, "touchMove", at(1 - .22 * step / 8)); await page.waitForTimeout(32); }
  await touch(client, "touchCancel", []);
  await page.waitForTimeout(1500);
  const now = await frame(page);
  expect(!now.grid || now.paper > .95, JSON.stringify(now)).toBe(true);
  if (!now.grid) expect(now.hand).toBeGreaterThan(.95);
});
