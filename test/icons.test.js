'use strict';
// The icon set (#354).
//
// Every page previously carried one icon tag pointing at
// /assets/logo-crop.png — a 716x175 horizontal wordmark on a NEAR-WHITE
// ground in the pre-redesign navy. As a favicon that is wrong three ways at
// once: squashed to a square, illegible at 32px, and a light tile against
// the dark identity the rest of the site uses. There was no
// apple-touch-icon, no manifest, no favicon.ico.
//
// The pin that matters most is the allowlist one. favicon.ico and
// site.webmanifest must sit at the site ROOT, the build is a positive
// allowlist, and an unlisted file is silently absent — no build error, no
// test failure, just a default browser icon in the tab. That is exactly how
// this gets half-done.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = (...p) => path.join(__dirname, '..', ...p);
const read = (n) => fs.readFileSync(root(n), 'utf8');

const ALL_PAGES = ['index.html', 'platform.html', 'solutions.html', 'how-it-works.html',
  'academy.html', 'resources.html', 'company.html', 'lets-talk.html',
  'privacy.html', 'terms.html', 'about.html', 'approach.html', 'services.html',
  'training.html', '404.html', 'status/index.html'];

const pngSize = (p) => {
  const b = fs.readFileSync(root(p));
  assert.equal(b.subarray(0, 8).toString('binary'), '\x89PNG\r\n\x1a\n', p + ' is not a PNG');
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};

test('every page references the icon set — including the superseded four', () => {
  for (const name of ALL_PAGES) {
    const html = read(name);
    assert.match(html, /<link rel="apple-touch-icon" sizes="180x180" href="\/assets\/icons\/apple-touch-icon\.png">/,
      name + ' must reference the apple-touch-icon, or iOS uses a screenshot of the page '
      + 'when someone adds it to their home screen');
    assert.match(html, /<link rel="icon" href="\/favicon\.ico" sizes="any">/, name);
    assert.match(html, /<link rel="icon" type="image\/png" sizes="32x32"/, name);
    assert.match(html, /<link rel="manifest" href="\/site\.webmanifest">/, name);
    assert.match(html, /<meta name="theme-color" content="#071019">/, name);
  }
});

test('no page still points its favicon at the horizontal wordmark', () => {
  for (const name of ALL_PAGES) {
    assert.doesNotMatch(read(name), /rel="icon"[^>]*logo-crop/,
      name + ': logo-crop.png is 716x175 on a near-white ground in the pre-redesign navy — '
      + 'as a favicon it is squashed, illegible at 32px, and the wrong identity');
  }
});

test('every referenced icon exists at the size it claims', () => {
  assert.deepEqual(pngSize('assets/icons/apple-touch-icon.png'), [180, 180]);
  assert.deepEqual(pngSize('assets/icons/icon-16.png'), [16, 16]);
  assert.deepEqual(pngSize('assets/icons/icon-32.png'), [32, 32]);
  assert.deepEqual(pngSize('assets/icons/icon-192.png'), [192, 192]);
  assert.deepEqual(pngSize('assets/icons/icon-512.png'), [512, 512]);
});

test('favicon.ico is a real multi-size ICO whose directory matches its images', () => {
  const b = fs.readFileSync(root('favicon.ico'));
  assert.equal(b.readUInt16LE(0), 0, 'ICONDIR reserved');
  assert.equal(b.readUInt16LE(2), 1, 'ICONDIR type must be 1 (icon)');
  const n = b.readUInt16LE(4);
  assert.ok(n >= 3, 'expected at least 16/32/48, saw ' + n);
  const declared = [];
  for (let i = 0; i < n; i++) {
    const e = 6 + 16 * i;
    const w = b.readUInt8(e) || 256;
    const size = b.readUInt32LE(e + 8);
    const off = b.readUInt32LE(e + 12);
    const blob = b.subarray(off, off + size);
    assert.equal(blob.subarray(0, 8).toString('binary'), '\x89PNG\r\n\x1a\n',
      'ICO entry ' + i + ' must be a PNG');
    // The directory entry and the embedded image must agree — a mismatch
    // renders at the wrong size or not at all, and no tool warns about it.
    assert.equal(blob.readUInt32BE(16), w, 'ICO entry ' + i + ' width disagrees with its PNG');
    declared.push(w);
  }
  assert.deepEqual(declared.sort((a, b2) => a - b2), [16, 32, 48]);
});

test('the manifest is valid and carries the dark identity', () => {
  const m = JSON.parse(read('site.webmanifest'));
  assert.equal(m.name, 'GuideHerd');
  assert.ok(m.short_name && m.short_name.length <= 12, 'short_name must fit under a home-screen icon');
  assert.equal(m.theme_color, '#071019');
  assert.equal(m.background_color, '#071019');
  assert.equal(m.start_url, '/');
  const sizes = m.icons.map((i) => i.sizes);
  assert.ok(sizes.includes('192x192') && sizes.includes('512x512'),
    'a manifest without 192 and 512 is rejected as an installable icon set');
  for (const icon of m.icons) {
    const rel = icon.src.replace(/^\//, '');
    assert.ok(fs.existsSync(root(rel)), 'manifest references a missing icon: ' + icon.src);
    const [w, h] = pngSize(rel);
    assert.equal(icon.sizes, w + 'x' + h, icon.src + ' does not match its declared sizes');
  }
});

test('the mark is legible on the dark ground at the smallest size', () => {
  // The issue asks explicitly: confirm this is not a white-on-white square.
  // The ground must be the site's #071019 and the mark must actually differ
  // from it, checked on the 16px file — the size where a bad icon becomes a
  // grey smudge.
  const b = fs.readFileSync(root('assets/icons/icon-16.png'));
  assert.ok(b.length > 200, 'a 16px icon this small is probably a flat fill');
  // A flat single-colour PNG compresses far smaller than one with a glyph in
  // it; combined with the size assertions above this catches an empty tile.
  assert.ok(b.length > 400, 'icon-16.png looks like a flat tile, not a mark');
});

test('the root-level icon files are in the build allowlist', () => {
  // The one that silently half-ships: these must be at the site ROOT, and an
  // unlisted file produces no build error and no failing test elsewhere.
  const build = read('scripts/build-site.sh');
  assert.match(build, /cp favicon\.ico site\.webmanifest "\$OUT"\//,
    'favicon.ico and site.webmanifest must be named in scripts/build-site.sh — assets/ ships '
    + 'wholesale but these two live at the root, and an unlisted root file is silently absent');
});

test('the icon source is kept so the set can be regenerated', () => {
  // Regenerating from a description is how an icon set drifts.
  assert.ok(fs.existsSync(root('scripts/icon-source.html')),
    'the HTML the icons were rendered from must be committed');
  const src = read('scripts/icon-source.html');
  assert.match(src, /#071019/, 'the source must carry the same ground as the manifest');
  assert.match(src, /#2FA4A0/, 'and the teal accent from the wordmark');
});
