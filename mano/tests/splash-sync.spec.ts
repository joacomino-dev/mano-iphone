import { expect, test } from "@playwright/test";

// The launch mark shows Coqui and «CocoWash» together: never the logo alone
// while Coqui's picture is still loading.
test("Coqui and the logo appear together even when Coqui loads late", async ({ page }) => {
  await page.route("**/assets/characters/coqui-hero.webp", async route => {
    await new Promise(resolve => setTimeout(resolve, 700));
    await route.continue();
  });
  await page.addInitScript(() => {
    const samples: { hero: boolean; logo: boolean; opacity: number }[] = [];
    (window as unknown as { splashSamples: typeof samples }).splashSamples = samples;
    const tick = () => {
      const lockup = document.querySelector<HTMLElement>(".splash-lockup");
      const hero = document.querySelector<HTMLImageElement>(".splash-hero"), logo = document.querySelector<HTMLImageElement>(".splash-logo");
      if (lockup && hero && logo) samples.push({ hero: hero.complete && hero.naturalWidth > 0, logo: logo.complete && logo.naturalWidth > 0, opacity: Number(getComputedStyle(lockup).opacity) });
      if (samples.length < 400) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.goto("/");
  await page.waitForTimeout(1600);
  const samples = await page.evaluate(() => (window as unknown as { splashSamples: { hero: boolean; logo: boolean; opacity: number }[] }).splashSamples);
  expect(samples.length).toBeGreaterThan(10);
  const alone = samples.filter(s => !s.hero && s.opacity > 0.05);
  expect(alone, "lockup visible before Coqui's picture loaded").toHaveLength(0);
  expect(samples.some(s => s.hero && s.logo && s.opacity > 0.9)).toBe(true);
});
