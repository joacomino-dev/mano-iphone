import { expect, test, type CDPSession, type Page } from "@playwright/test";

// Pinching in on the cards opens the photo grid, even when the second finger
// lands beside the card; a pinch never moves or decides the card.
test.use({ hasTouch: true });

type Point = { x: number; y: number };

async function openDemo(page: Page) {
  await page.addInitScript(() => { localStorage.setItem("cocowash-onboarding-v2", "done"); localStorage.setItem("cocowash-tips-v1", '{"seen":["stack","zoom","anchor","album","seal"]}'); });
  await page.goto("/");
  await expect(page.locator(".photo-card.front")).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(800);
}

/** A point of the table (hand-space) that is not on any card, near the card's lower edge. */
async function besideCard(page: Page): Promise<{ card: Point; beside: Point }> {
  return page.evaluate(() => {
    const card = document.querySelector(".photo-card.front")!.getBoundingClientRect();
    const space = document.querySelector(".hand-space")!.getBoundingClientRect();
    const onCard = (x: number, y: number) => !!document.elementFromPoint(x, y)?.closest(".photo-card");
    const inside = (x: number, y: number) => document.elementFromPoint(x, y)?.closest(".hand-space") != null;
    const x = card.x + card.width / 2;
    for (let y = card.bottom + 6; y < space.bottom; y += 4) if (!onCard(x, y) && inside(x, y)) return { card: { x, y: card.y + card.height * 0.3 }, beside: { x, y } };
    for (let y = card.y - 6; y > space.y; y -= 4) if (!onCard(x, y) && inside(x, y)) return { card: { x, y: card.y + card.height * 0.7 }, beside: { x, y } };
    throw new Error("no free table point beside the card");
  });
}

async function touch(client: CDPSession, type: string, points: Point[]) {
  await client.send("Input.dispatchTouchEvent", { type, touchPoints: points.map((p, id) => ({ x: p.x, y: p.y, id })) });
}

async function pinch(page: Page, a: Point, b: Point, to: number, secondDelay = 0) {
  const client = await page.context().newCDPSession(page);
  await touch(client, "touchStart", [a]);
  if (secondDelay) {
    // The first finger often moves a little before the second one lands.
    await touch(client, "touchMove", [{ x: a.x, y: a.y + 14 }]);
    await page.waitForTimeout(secondDelay);
    a = { x: a.x, y: a.y + 14 };
  }
  await touch(client, "touchStart", [a, b]);
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  let points = [a, b];
  for (let step = 1; step <= 14; step++) {
    const k = 1 - (1 - to) * (step / 14);
    points = [a, b].map(p => ({ x: mid.x + (p.x - mid.x) * k, y: mid.y + (p.y - mid.y) * k }));
    await touch(client, "touchMove", points);
    await page.waitForTimeout(24);
  }
  await touch(client, "touchEnd", []);
  await page.waitForTimeout(900);
}

for (const delay of [0, 60]) {
  test(`pinch in with the second finger beside the card opens the grid (delay ${delay} ms)`, async ({ page }) => {
    await openDemo(page);
    const { card, beside } = await besideCard(page);
    await pinch(page, card, beside, 0.4, delay);
    await expect(page.getByRole("button", { name: "Nothing to undo" })).toBeVisible();
    await expect(page.locator(".grid-scroller")).toBeVisible();
  });
}

test("a slight pinch in (5 %) does not open the grid", async ({ page }) => {
  await openDemo(page);
  const box = (await page.locator(".photo-card.front").boundingBox())!;
  const a = { x: box.x + box.width / 2, y: box.y + box.height * 0.35 }, b = { x: box.x + box.width / 2, y: box.y + box.height * 0.65 };
  await pinch(page, a, b, 0.95);
  await expect(page.locator(".grid-scroller")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Nothing to undo" })).toBeVisible();
});

test("pinch out on the card still opens the anchored view", async ({ page }) => {
  await openDemo(page);
  const box = (await page.locator(".photo-card.front").boundingBox())!;
  const a = { x: box.x + box.width / 2, y: box.y + box.height * 0.42 }, b = { x: box.x + box.width / 2, y: box.y + box.height * 0.58 };
  await pinch(page, a, b, 1.8);
  await expect(page.locator(".inspection")).toBeVisible();
  await expect(page.locator(".grid-scroller")).toHaveCount(0);
});

test("a one-finger swipe left still sets the card aside", async ({ page }) => {
  await openDemo(page);
  const box = (await page.locator(".photo-card.front").boundingBox())!;
  const client = await page.context().newCDPSession(page);
  const y = box.y + box.height / 2;
  await touch(client, "touchStart", [{ x: box.x + box.width / 2, y }]);
  for (let step = 1; step <= 10; step++) { await touch(client, "touchMove", [{ x: box.x + box.width / 2 - step * 16, y }]); await page.waitForTimeout(16); }
  await touch(client, "touchEnd", []);
  await expect(page.getByRole("button", { name: /^Undo/ })).toBeEnabled();
});
