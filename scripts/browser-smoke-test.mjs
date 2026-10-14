import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseURL = process.env.BIOSPHERE_URL || 'http://127.0.0.1:4173/';
const outputDir = 'test-results';
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
});
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

try {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('#heroSample').waitFor({ state: 'visible', timeout: 10000 });

  // Mobile navigation + adaptive performance presets.
  await page.locator('#mobileMenu').click();
  await page.locator('#mainNav [data-view="settings"]').click();
  await page.locator('#performanceStatus').waitFor({ state: 'visible' });
  assert.equal(await page.locator('button[data-performance-mode]').count(), 3);
  await page.locator('[data-performance-mode="cinema"]').click();
  assert.equal(await page.locator('html').getAttribute('data-performance-mode'), 'cinema');
  await page.locator('[data-performance-mode="smooth"]').click();
  assert.equal(await page.locator('html').getAttribute('data-performance-mode'), 'smooth');
  assert.equal(await page.locator('html').getAttribute('data-performance-lite'), 'true');
  await page.screenshot({ path: `${outputDir}/mobile-performance-settings.png`, fullPage: true });

  // The setting must survive reload and remain responsive on a phone-sized viewport.
  await page.reload({ waitUntil: 'domcontentloaded' });
  // Reopen settings explicitly so the assertion tests persisted mode, not URL restoration semantics.
  await page.locator('#mobileMenu').click();
  await page.locator('#mainNav [data-view="settings"]').click();
  await page.locator('#performanceStatus').waitFor({ state: 'visible' });
  assert.equal(await page.locator('html').getAttribute('data-performance-mode'), 'smooth');
  const settingsWidth = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  assert.ok(settingsWidth.document <= settingsWidth.viewport + 2, `Horizontal overflow in initial mobile viewport: ${JSON.stringify(settingsWidth)}`);

  // Open the actual seed deck and exercise next/previous navigation.
  await page.locator('#mobileMenu').click();
  await page.locator('#mainNav [data-view="library"]').click();
  await page.locator('#heroSample').click();
  await page.locator('#presentationViewer').waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForFunction(() => document.querySelector('#viewerSlideCaption')?.textContent?.trim() === '01 / 32');
  // The counter is intentionally visually hidden on narrow phones to preserve slide space.
  assert.equal((await page.locator('#viewerSlideCaption').textContent()).trim(), '01 / 32');
  assert.equal(await page.evaluate(() => Boolean(document.querySelector('script[data-biosphere-three]'))), false,
    'The 3D library must not load before a user selects a 3D scene.');
  const stage = page.locator('#slideStage');
  const stageBounds = await stage.boundingBox();
  assert.ok(stageBounds && stageBounds.width > 0 && stageBounds.height > 0, 'The mobile slide stage must have a measurable tap surface.');
  // Side arrows are hidden on phones by design; use the tap-on-either-half interaction instead.
  await stage.click({ position: { x: Math.round(stageBounds.width * 0.84), y: Math.round(stageBounds.height * 0.5) } });
  await page.waitForFunction(() => document.querySelector('#viewerSlideCaption')?.textContent?.trim() === '02 / 32');
  await stage.click({ position: { x: Math.round(stageBounds.width * 0.16), y: Math.round(stageBounds.height * 0.5) } });
  await page.waitForFunction(() => document.querySelector('#viewerSlideCaption')?.textContent?.trim() === '01 / 32');
  const presentationWidth = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  assert.ok(presentationWidth.document <= presentationWidth.viewport + 2,
    `Horizontal overflow in mobile presentation: ${JSON.stringify(presentationWidth)}`);
  await page.screenshot({ path: `${outputDir}/mobile-presenter.png` });

  // Reach a curated 3D scene, then verify the image/model switch exposes the 3D panel.
  let modelToggle = page.locator('#slideStage > .slide-page:not(.slide-transition-ghost) button[data-media-mode="model"]:visible');
  for (let index = 0; index < 32 && await modelToggle.count() === 0; index += 1) {
    const unansweredQuizChoices = page.locator('#slideStage [data-quiz-answer]:not([disabled])');
    if (await unansweredQuizChoices.count() > 0) {
      // Answer each question so keyboard navigation can progress through interactive lesson slides.
      await unansweredQuizChoices.first().click();
    } else if ((await page.locator('#viewerSlideCaption').textContent()).trim() === '32 / 32') {
      break;
    }
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(90);
    modelToggle = page.locator('#slideStage > .slide-page:not(.slide-transition-ghost) button[data-media-mode="model"]:visible');
  }
  assert.ok(await modelToggle.count() > 0, 'At least one curated 3D scene must expose the model switch.');
  await modelToggle.click();
  await page.locator('#slideStage .media-3d-view:not([hidden])').waitFor({ state: 'visible', timeout: 5000 });
  await page.screenshot({ path: `${outputDir}/mobile-model-view.png` });

  assert.deepEqual(pageErrors, [], `Unexpected JavaScript errors: ${pageErrors.join(' | ')}`);
  console.log('BioSphere browser smoke test passed: mobile layout, settings persistence, slide navigation, lazy 3D loading, and model view.');
} finally {
  await browser.close();
}
