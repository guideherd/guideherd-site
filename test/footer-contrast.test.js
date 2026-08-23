'use strict';
// Text colour must clear WCAG AA — in the source, before a browser runs (#358).
//
// Every public page carries one of two footers, and both shipped below the
// line: the redesigned footer's tagline and copyright sat at alpha .42
// (3.45:1) on #071019, and the superseded pages' column headings and meta
// row sat at 0.5 (4.39:1) on #0E2A3F. Small text at a low alpha is exactly
// the value that gets nudged back down by eye during a design pass, so the
// threshold is asserted here rather than left to the next audit to notice.
//
// This computes the real contrast from the real source. It is not a string
// match on the current values: change the palette, the background, or the
// alpha, and the arithmetic follows.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const page = (n) => fs.readFileSync(path.join(__dirname, '..', n), 'utf8');

const AA = 4.5;

function relativeLuminance([r, g, b]) {
  const ch = (c) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

// Text painted with an alpha composites against the surface behind it, which
// is what the browser measures and what axe reports — comparing the token's
// own value would flatter every one of these.
function contrast(fg, bg, alpha) {
  const blended = fg.map((c, i) => c * alpha + bg[i] * (1 - alpha));
  const [hi, lo] = [relativeLuminance(blended), relativeLuminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// ── The redesigned footer: rgba(233,228,216,α) on the page ground ─────────
const REDESIGNED = ['index.html', 'platform.html', 'solutions.html', 'how-it-works.html',
  'academy.html', 'resources.html', 'company.html', 'lets-talk.html',
  'privacy.html', 'terms.html', 'trust.html', 'status/index.html'];
const GROUND = hex('#071019');
const FOREGROUND = [233, 228, 216];

// A page can carry more than one footer — the Status page has its own note
// inside <main> as well as the shared site footer — so every footer block on
// the page is scanned, not the first one the slice happens to land on.
// Checking only the first is how this pin nearly shipped blind to the very
// page it was extended to cover.
function footerBlocks(html) {
  return [...html.matchAll(/<footer[\s\S]*?<\/footer>/g)].map((m) => m[0]);
}

test('every redesigned footer’s text clears AA against the page ground', () => {
  for (const name of REDESIGNED) {
    const html = page(name);
    const blocks = footerBlocks(html);
    assert.ok(blocks.length > 0, name + ' has a footer');
    const alphas = blocks.flatMap((footer) =>
      [...footer.matchAll(/color:\s*rgba\(233,\s*228,\s*216,\s*(\.\d+|0?\.\d+|1)\)/g)]
        .map((m) => parseFloat(m[1])));
    assert.ok(alphas.length >= 2,
      name + ': expected the footer to carry its tagline and copyright colours');
    for (const a of alphas) {
      const c = contrast(FOREGROUND, GROUND, a);
      assert.ok(c >= AA,
        name + ': footer text at alpha ' + a + ' is ' + c.toFixed(2) + ':1 against #071019, '
        + 'below the ' + AA + ':1 AA threshold for text this size. Raise the alpha — the '
        + 'footer is on every page, so one value here is a violation fourteen times over.');
    }
  }
});

// ── Retired with the pages (#352) ─────────────────────────────────────────
// Four blocks here policed the superseded pre-redesign pages' own light
// palette (.footer-col/.footer-meta alpha, --ink-60, --ink-40-as-text, the
// wordmark superscript token). Those pages were removed outright by owner
// decision (2026-08-24); the tokens they policed exist nowhere else, so the
// pins' risk cannot recur. The redesign footer test above and the axe gate
// carry contrast coverage for every page that ships.


test('404.html’s tokens belong to the palette it actually renders on', () => {
  // The palette migration swapped --ink and --paper to the dark identity and
  // left --ink-60 as the legacy navy, so the page's only paragraph rendered
  // #0b2030 on #071019 — 1.15:1, invisible rather than merely dim. Nothing
  // caught it because the page was only ever spot-checked.
  const html = page('404.html');
  const paper = html.match(/--paper:\s*(#[0-9A-Fa-f]{6})/);
  const ink60 = html.match(/--ink-60:\s*rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  assert.ok(paper && ink60, '404.html defines --paper and --ink-60');
  const fg = [Number(ink60[1]), Number(ink60[2]), Number(ink60[3])];
  const c = contrast(fg, hex(paper[1]), parseFloat(ink60[4]));
  assert.ok(c >= AA,
    '404.html: --ink-60 is ' + c.toFixed(2) + ':1 against --paper ' + paper[1]
    + '. A token from the other palette survived the migration.');
});
