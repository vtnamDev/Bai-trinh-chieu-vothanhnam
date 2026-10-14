import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const [html, app, deckSource, css] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../app.js', import.meta.url), 'utf8'),
  readFile(new URL('../bai32-deck.js', import.meta.url), 'utf8'),
  readFile(new URL('../styles.css', import.meta.url), 'utf8'),
]);

// Parse the bundled deck without executing application code in a browser.
const context = { window: {} };
vm.runInNewContext(deckSource, context, { filename: 'bai32-deck.js', timeout: 1000 });
const deck = context.window.BIOSPHERE_BAI32_SEED;

assert.ok(deck && typeof deck === 'object', 'The bundled seed deck must exist.');
assert.equal(deck.slides.length, 32, 'The lesson deck should contain 32 slides.');
assert.ok(deck.slides.every(slide => slide && typeof slide.title === 'string'), 'Every slide needs a title.');
assert.equal(deck.slides.filter(slide => slide.classroomPrompt).length, 5, 'Keep all five classroom discussion prompts.');
assert.equal(deck.slides.filter(slide => slide.model3D).length, 5, 'Keep the five curated 3D scenes.');
const quizSlides = deck.slides.filter(slide => slide.interactiveQuiz);
assert.equal(quizSlides.length, 2, 'Keep the interactive review and final quiz.');
assert.equal(quizSlides.reduce((total, slide) => total + (slide.quizQuestions?.length || 0), 0), 8, 'Quiz question count changed; review the teaching flow.');

const urlKeys = [
  'image', 'imageFallback', 'imageSourceUrl', 'video', 'video4k',
  'videoSourceUrl', 'modelSrc', 'modelSourceUrl', 'modelLicense',
];
const resources = [];
for (const [index, slide] of deck.slides.entries()) {
  for (const key of urlKeys) {
    if (slide[key]) resources.push({ location: `slide ${index + 1} ${key}`, value: slide[key] });
  }
  for (const [imageIndex, image] of (slide.supportImages || []).entries()) {
    for (const key of ['url', 'sourceUrl']) {
      if (image?.[key]) resources.push({ location: `slide ${index + 1} supportImages[${imageIndex}].${key}`, value: image[key] });
    }
  }
  for (const [linkIndex, link] of (slide.links || []).entries()) {
    if (link?.url) resources.push({ location: `slide ${index + 1} links[${linkIndex}].url`, value: link.url });
  }
}
for (const resource of resources) {
  assert.match(resource.value, /^https?:\/\//i, `Expected a web URL for ${resource.location}`);
  const parsed = new URL(resource.value);
  assert.ok(['http:', 'https:'].includes(parsed.protocol), `Unsafe protocol at ${resource.location}`);
  assert.equal(parsed.username + parsed.password, '', `Credentials are not allowed in ${resource.location}`);
}

const versionFor = asset => {
  const match = html.match(new RegExp(`(?:src|href)="[^"]*${asset}\\?v=([^"]+)"`));
  assert.ok(match, `Missing cache-busted asset reference for ${asset}`);
  return match[1];
};
const assetVersions = ['styles.css', 'bai32-deck.js', 'app.js'].map(versionFor);
assert.equal(new Set(assetVersions).size, 1, 'CSS, deck data and app code must use the same cache-busting version.');

assert.match(app, /function safeHttpUrl\(/, 'Imported resource URLs must be protocol-checked.');
assert.match(app, /function isValidDeckShape\(/, 'Imported deck structure must be validated.');
assert.match(app, /threeLoadPromise = null;/, 'The Three.js loader should be retryable after a CDN failure.');
assert.match(app, /modelViewerLoadPromise = null;/, 'The model-viewer loader should be retryable after a CDN failure.');
assert.ok(!app.includes(`data-fallback="' + fallback + '"`), 'Fallback URLs must be escaped before entering HTML attributes.');
assert.match(css, /prefers-reduced-motion\s*:\s*reduce/, 'Reduced-motion preferences must be supported.');
assert.match(css, /@media\s*\(max-width:\s*600px\)/, 'The compact mobile layout must remain present.');

assert.ok(html.includes('data-performance-mode="auto"'), 'The automatic performance preset must be available in settings.');
assert.ok(html.includes('data-performance-mode="smooth"') && html.includes('data-performance-mode="cinema"'), 'All three performance presets must be present.');
assert.ok(html.includes('id="performanceStatus"'), 'Settings must explain the active performance profile.');
assert.ok(app.includes('function getPerformanceProfile()'), 'Runtime decisions should use the adaptive performance profile.');
assert.ok(app.includes("$('button[data-performance-mode]').forEach"), 'Performance status sync must iterate over the preset buttons, not a single document query result.');
assert.ok(app.includes("$('.live-video', $('#slideStage')).forEach"), 'Adaptive mode must iterate over all stage videos before pausing.');
assert.ok(app.includes("$('.photo-frame.video-playing', $('#slideStage')).forEach"), 'Adaptive mode must iterate over all playing photo frames before clearing state.');
assert.ok(app.includes("$('.live-video', imageView).forEach"), 'Switching into 3D must safely pause any video layers.');
assert.ok(app.includes("renderMediaModeBar('media-mode-bar--mobile')"), 'Mobile must render a foreground image/3D switch.');
assert.ok(app.includes("target.closest('.media-experience') || slidePage?.querySelector('.media-experience')"), 'Both desktop and foreground mobile controls must target the same media experience.');
assert.ok(css.includes('.slide-content>.media-mode-bar--mobile'), 'The foreground switch needs dedicated mobile presentation styling.');
assert.ok(app.includes('navigator.deviceMemory') && app.includes('navigator.hardwareConcurrency'), 'Adaptive mode should consider hardware signals when supported.');
const warmupStart = app.indexOf('function warmAdjacentPhotos()');
const warmupEnd = app.indexOf('\n  function renderQuiz', warmupStart);
const warmupSource = app.slice(warmupStart, warmupEnd);
assert.ok(warmupSource.includes('profile.saveData') && warmupSource.includes('profile.slowConnection'), 'Image preloading must respect bandwidth limits.');
assert.ok(app.includes('getPerformanceProfile().lite) {\n      atmosphereFrame = 0;\n      return;'), 'The background render loop must stop rather than spin while hidden.');
assert.ok(css.includes('html[data-performance-lite="true"]'), 'Low-power mode must reduce expensive visual effects.');

console.log(`BioSphere static validation passed: ${deck.slides.length} slides, ${resources.length} checked URLs, ${quizSlides.length} quiz slides.`);
