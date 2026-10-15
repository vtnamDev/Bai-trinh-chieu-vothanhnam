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
  assert.equal(await page.locator('#toastRegion .toast').count(), 1, 'Rapid setting changes must reuse one toast instead of stacking notifications.');
  assert.equal(await page.locator('#toastRegion .toast').textContent(), 'Đã ưu tiên độ mượt và tiết kiệm dữ liệu.');
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
  await page.waitForTimeout(250);
  const initialPresentationState = await page.evaluate(() => ({
    caption: document.querySelector('#viewerSlideCaption')?.textContent?.trim() || null,
    title: document.querySelector('#slideStage .slide-title')?.textContent?.trim() || null,
    bundledSlideCount: window.BIOSPHERE_BAI32_SEED?.slides?.length ?? null,
    viewerHidden: document.querySelector('#presentationViewer')?.hidden ?? null,
    scripts: [...document.scripts].map(script => ({ src: script.src, loaded: Boolean(script.src) })),
  }));
  assert.equal(initialPresentationState.bundledSlideCount, 25,
    `Browser loaded the wrong lesson data: ${JSON.stringify(initialPresentationState)}`);
  assert.equal(initialPresentationState.caption, '01 / 25',
    `Presentation did not render the first slide. State: ${JSON.stringify(initialPresentationState)}. Page errors: ${pageErrors.join(' | ') || 'none'}`);
  // The counter is intentionally visually hidden on narrow phones to preserve slide space.
  assert.equal((await page.locator('#viewerSlideCaption').textContent()).trim(), '01 / 25');
  assert.equal(await page.evaluate(() => Boolean(document.querySelector('script[data-biosphere-three]'))), false,
    'The 3D library must not load before a user selects a 3D scene.');
  const stage = page.locator('#slideStage');
  const stageBounds = await stage.boundingBox();
  assert.ok(stageBounds && stageBounds.width > 0 && stageBounds.height > 0, 'The mobile slide stage must have a measurable tap surface.');
  // Side arrows are hidden on phones by design; use the tap-on-either-half interaction instead.
  await stage.click({ position: { x: Math.round(stageBounds.width * 0.84), y: Math.round(stageBounds.height * 0.5) } });
  await page.waitForFunction(() => document.querySelector('#viewerSlideCaption')?.textContent?.trim() === '02 / 25');
  await stage.click({ position: { x: Math.round(stageBounds.width * 0.16), y: Math.round(stageBounds.height * 0.5) } });
  await page.waitForFunction(() => document.querySelector('#viewerSlideCaption')?.textContent?.trim() === '01 / 25');
  const presentationWidth = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  assert.ok(presentationWidth.document <= presentationWidth.viewport + 2,
    `Horizontal overflow in mobile presentation: ${JSON.stringify(presentationWidth)}`);
  await page.screenshot({ path: `${outputDir}/mobile-presenter.png` });

  // Every disease has a clickable multiple-choice case quiz; verify instant feedback and lockout.
  let caseAnswer = page.locator('#slideStage > .slide-page:not(.slide-transition-ghost) .case-quiz-answer:visible');
  for (let index = 0; index < 25 && await caseAnswer.count() === 0; index += 1) {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(90);
    caseAnswer = page.locator('#slideStage > .slide-page:not(.slide-transition-ghost) .case-quiz-answer:visible');
  }
  assert.equal(await page.locator('#slideStage > .slide-page:not(.slide-transition-ghost) .classroom-prompt[data-case-correct-index]').count(), 1,
    'Reached a disease slide with an interactive case question.');
  assert.equal(await caseAnswer.count(), 4, 'Each disease case should expose four answer choices.');
  await caseAnswer.nth(1).click();
  await page.locator('#slideStage > .slide-page:not(.slide-transition-ghost) .classroom-answer:not([hidden])').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#slideStage > .slide-page:not(.slide-transition-ghost) .classroom-prompt').getAttribute('data-case-answered'), 'true');
  assert.equal(await page.locator('#slideStage > .slide-page:not(.slide-transition-ghost) .case-quiz-answer.is-correct').count(), 1);
  assert.equal(await page.locator('#slideStage > .slide-page:not(.slide-transition-ghost) .case-quiz-answer:disabled').count(), 4,
    'Case answers must be locked after the first choice.');
  await page.screenshot({ path: `${outputDir}/mobile-disease-case-quiz.png` });
  await page.keyboard.press('ArrowRight');

  // Reach a curated 3D scene, then verify the image/model switch exposes the 3D panel.
  let modelToggle = page.locator('#slideStage > .slide-page:not(.slide-transition-ghost) button[data-media-mode="model"]:visible');
  for (let index = 0; index < 25 && await modelToggle.count() === 0; index += 1) {
    const unansweredQuizChoices = page.locator('#slideStage [data-quiz-answer]:not([disabled])');
    if (await unansweredQuizChoices.count() > 0) {
      // Answer each question so keyboard navigation can progress through interactive lesson slides.
      await unansweredQuizChoices.first().click();
    } else if ((await page.locator('#viewerSlideCaption').textContent()).trim() === '25 / 25') {
      break;
    }
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(90);
    modelToggle = page.locator('#slideStage > .slide-page:not(.slide-transition-ghost) button[data-media-mode="model"]:visible');
  }
  assert.ok(await modelToggle.count() > 0, 'At least one curated 3D scene must expose the model switch.');
  assert.equal(await page.locator('#slideStage .photo-process-flow').count(), 1,
    'The five core disease scenes should show the matching three-step process diagram.');
  await modelToggle.click();
  await page.locator('#slideStage .media-3d-view:not([hidden])').waitFor({ state: 'visible', timeout: 5000 });
  await page.screenshot({ path: `${outputDir}/mobile-model-view.png` });
  assert.equal(await page.locator('#slideStage > .slide-page:not(.slide-transition-ghost)').evaluate(el => el.classList.contains('is-model-active')), true,
    'The active mobile model view must enable the interaction layer.');
  assert.equal(await page.locator('#slideStage .media-mode-bar--mobile button[data-media-mode="model"]').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('#slideStage .media-mode-bar--mobile button[data-media-mode="image"]').getAttribute('aria-pressed'), 'false');
  const interactionLayers = await page.locator('#slideStage > .slide-page:not(.slide-transition-ghost)').evaluate(el => ({
    copy: getComputedStyle(el.querySelector('.slide-content')).pointerEvents,
    media: getComputedStyle(el.querySelector('.slide-side-content')).pointerEvents,
    controls: getComputedStyle(el.querySelector('.media-mode-bar--mobile')).pointerEvents,
  }));
  assert.deepEqual(interactionLayers, { copy: 'none', media: 'auto', controls: 'auto' },
    'Mobile 3D gestures must reach the model, while the foreground mode switch remains tappable.');

  // The shell should reload without network by caching only same-origin app files, not remote media.
  const workerReady = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    const registration = await navigator.serviceWorker.ready;
    return Boolean(registration.active);
  });
  assert.equal(workerReady, true, 'The app shell service worker should install in a secure context.');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), { timeout: 10000 });
  await page.context().setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.locator('#heroSample').waitFor({ state: 'visible', timeout: 10000 });
    assert.equal(await page.locator('#performanceStatus').count(), 1,
      'Core HTML/JS must remain available after an offline reload.');
  } finally {
    await page.context().setOffline(false);
  }

  assert.deepEqual(pageErrors, [], `Unexpected JavaScript errors: ${pageErrors.join(' | ')}`);
  console.log('BioSphere browser smoke test passed: mobile layout, settings persistence, slide navigation, lazy 3D loading, and model view.');
} finally {
  await browser.close();
}
