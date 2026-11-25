import { expect, test, type Page } from "@playwright/test";

// A decided card flies off; «Deshacer» must bring it back to the centre of the
// table, visible and touchable, even when tapped before the flight ends.
async function openDemo(page: Page) {
  await page.addInitScript(() => { localStorage.setItem("cocowash-onboarding-v2", "done"); localStorage.setItem("cocowash-tips-v1", '{"seen":["stack","zoom","anchor","album","seal"]}'); });
  await page.goto("/");
  await expect(page.locator(".photo-card.front")).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(800);
}

async function frontCard(page: Page) {
  return page.locator(".photo-card.front").evaluateAll(cards => cards.map(card => {
    const box = card.getBoundingClientRect(), stage = card.parentElement!.getBoundingClientRect();
    const style = getComputedStyle(card);
    return { id: card.getAttribute("data-testid"), offset: Math.round(box.x + box.width / 2 - (stage.x + stage.width / 2)),
      opacity: Number(style.opacity), touch: style.pointerEvents, filter: style.filter };
  }));
}

for (const [label, wait] of [["mid-flight", 90], ["after the flight", 900]] as const) {
  test(`undo restores a deleted card ${label}`, async ({ page }) => {
    await openDemo(page);
    const [before] = await frontCard(page);
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.waitForTimeout(wait);
    await page.getByRole("button", { name: /^Undo/ }).click();
    await page.waitForTimeout(1200);
    const after = await frontCard(page);
    expect(after).toHaveLength(1);
    expect(after[0].id).toBe(before.id);
    expect(Math.abs(after[0].offset)).toBeLessThan(12);
    expect(after[0].opacity).toBeGreaterThan(0.95);
    expect(after[0].touch).not.toBe("none");
    expect(after[0].filter).toBe("none");
  });
}

test("repeated quick undos bring every card back, in order", async ({ page }) => {
  await openDemo(page);
  const seen: string[] = [];
  for (const action of ["Delete", "Keep", "Delete"]) {
    seen.push((await frontCard(page))[0].id!);
    await page.getByRole("button", { name: action, exact: true }).click();
    await page.waitForTimeout(450);
  }
  for (const id of seen.reverse()) {
    await page.getByRole("button", { name: /^Undo/ }).click();
    await page.waitForTimeout(150);
    await expect.poll(async () => (await frontCard(page)).find(card => card.opacity > 0.5)?.id).toBe(id);
  }
  await page.waitForTimeout(1000);
  const [last] = (await frontCard(page)).filter(card => card.opacity > 0.5);
  expect(Math.abs(last.offset)).toBeLessThan(12);
});
