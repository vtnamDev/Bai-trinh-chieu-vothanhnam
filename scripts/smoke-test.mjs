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

console.log(`BioSphere static validation passed: ${deck.slides.length} slides, ${resources.length} checked URLs, ${quizSlides.length} quiz slides.`);
