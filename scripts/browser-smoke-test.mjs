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
  await page.locator('#slideStage .photo-frame').waitFor({ state: 'visible' });
  const mobileEditorialLayout = await page.evaluate(() => {
    const stage = document.querySelector('#slideStage');
    const image = stage?.querySelector('.photo-frame');
    const content = stage?.querySelector('.slide-content');
    const diagram = stage?.querySelector('.editorial-diagram');
    const rect = element => {
      if (!element) return null;
      const r = element.getBoundingClientRect();
      return { top:r.top, bottom:r.bottom, left:r.left, right:r.right, width:r.width, height:r.height };
    };
    return {
      viewportWidth:window.innerWidth,
      image:rect(image),
      content:rect(content),
      diagram:diagram?.dataset.diagram || null,
      mediaPosition:image ? getComputedStyle(image).position : null,
      contentWidth:content?.getBoundingClientRect().width || 0,
    };
  });
  assert.ok(mobileEditorialLayout.image && mobileEditorialLayout.content,
    `Mobile slide must have separate media and text regions: ${JSON.stringify(mobileEditorialLayout)}`);
  assert.ok(mobileEditorialLayout.content.top >= mobileEditorialLayout.image.bottom - 1,
    `Photo and text overlap on mobile instead of stacking: ${JSON.stringify(mobileEditorialLayout)}`);
  assert.ok(mobileEditorialLayout.contentWidth >= mobileEditorialLayout.viewportWidth - 34,
    `The editorial content column is too narrow on a phone: ${JSON.stringify(mobileEditorialLayout)}`);
  assert.ok(mobileEditorialLayout.diagram,
    `The first slide must show a knowledge-map visual, got ${JSON.stringify(mobileEditorialLayout)}`);
  assert.equal(mobileEditorialLayout.mediaPosition, 'relative',
    'The photo frame must be a panel, not an absolutely positioned full-slide background.');
  assert.equal(await page.evaluate(() => Boolean(document.querySelector('script[data-biosphere-three]'))), false,
    'The 3D library must not load before a user selects a 3D scene.');
  assert.equal(await page.locator('#slideStage > .slide-page:not(.slide-transition-ghost) .slide-key-idea').count(), 1,
    'Each content slide must visibly separate its main idea from secondary details.');
  assert.equal((await page.locator('#slideStage > .slide-page:not(.slide-transition-ghost) .slide-key-idea-top span').textContent()).trim(), 'Ý CHÍNH');
  assert.ok(await page.locator('#slideStage > .slide-page:not(.slide-transition-ghost) .slide-point--support').count() >= 3,
    'Supporting ideas should be shown as distinct cards.');
  assert.equal(await page.locator('#slideStage > .slide-page:not(.slide-transition-ghost)').getAttribute('data-story-group'), 'foundation');
  const stage = page.locator('#slideStage');
  const stageBounds = await stage.boundingBox();
  assert.ok(stageBounds && stageBounds.width > 0 && stageBounds.height > 0, 'The mobile slide stage must have a measurable tap surface.');
  // Side arrows are hidden on phones by design; use the tap-on-either-half interaction instead.
  await stage.click({ position: { x: Math.round(stageBounds.width * 0.84), y: Math.round(stageBounds.height * 0.5) } });
  await page.waitForFunction(() => document.querySelector('#viewerSlideCaption')?.textContent?.trim() === '02 / 25');
  const continuityState = await page.locator('#slideStage > .slide-page:not(.slide-transition-ghost)').evaluate(el => ({
    storyGroup:el.dataset.storyGroup,
    bridge:el.dataset.motionBridge,
    accent:getComputedStyle(el).getPropertyValue('--stage-accent').trim(),
  }));
  assert.deepEqual(continuityState, { storyGroup:'foundation', bridge:'continuity', accent:'#70dfd0' },
    `Adjacent slides in one chapter should keep the same palette and continuous motion: ${JSON.stringify(continuityState)}`);
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
    const currentCaption = (await page.locator('#viewerSlideCaption').textContent()).trim();
    if (currentCaption === '06 / 25') {
      const chapterState = await page.locator('#slideStage > .slide-page:not(.slide-transition-ghost)').evaluate(el => ({
        storyGroup:el.dataset.storyGroup,
        bridge:el.dataset.motionBridge,
        palette:el.dataset.palette,
      }));
      assert.deepEqual(chapterState, { storyGroup:'tooth', bridge:'chapter', palette:'coral' },
        `Entering a new disease should use its own accent and chapter transition: ${JSON.stringify(chapterState)}`);
    }
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
  assert.equal(await page.locator('#slideStage > .slide-page:not(.slide-transition-ghost) .editorial-diagram--process').count(), 1,
    'The disease scene should show a readable process diagram in the content column, not over the photo.');
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

  // Validate the landscape editorial layout too: text and image must occupy separate columns.
  await page.locator('#slideStage .media-mode-bar--mobile button[data-media-mode="image"]').click();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(220);
  await page.evaluate(() => { const stage = document.querySelector('#slideStage'); if (stage) stage.scrollTop = 0; });
  const landscapeEditorialLayout = await page.evaluate(() => {
    const stage = document.querySelector('#slideStage');
    const content = stage?.querySelector('.slide-content');
    const media = stage?.querySelector('.slide-side-content');
    const image = stage?.querySelector('.photo-frame');
    const rect = element => {
      if (!element) return null;
      const r = element.getBoundingClientRect();
      return { top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height };
    };
    return {
      stage:rect(stage),content:rect(content),media:rect(media),image:rect(image),
      grid:content ? getComputedStyle(stage.querySelector('.slide-layout')).display : null,
      viewportWidth:window.innerWidth,
    };
  });
  assert.equal(landscapeEditorialLayout.grid, 'grid',
    `Landscape presenter must use a grid layout: ${JSON.stringify(landscapeEditorialLayout)}`);
  assert.ok(landscapeEditorialLayout.content && landscapeEditorialLayout.media &&
    landscapeEditorialLayout.media.left >= landscapeEditorialLayout.content.right - 2,
    `Landscape image and text columns overlap or collapse: ${JSON.stringify(landscapeEditorialLayout)}`);
  assert.ok(landscapeEditorialLayout.image?.width >= 350,
    `Landscape image column should be visually substantial: ${JSON.stringify(landscapeEditorialLayout)}`);
  await page.screenshot({ path: `${outputDir}/landscape-editorial-layout.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(120);

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
  console.log('BioSphere browser smoke test passed: mobile/landscape editorial geometry, rich diagrams, settings persistence, slide navigation, lazy 3D loading, model view, and offline shell.');
} finally {
  await browser.close();
}
