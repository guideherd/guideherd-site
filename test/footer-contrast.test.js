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
  'privacy.html', 'terms.html', 'status/index.html'];
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

// ── The superseded pre-redesign footer: rgba(245,242,234,α) on --ink ──────
const SUPERSEDED = ['about.html', 'approach.html', 'services.html', 'training.html'];
const INK = hex('#0E2A3F');
const PAPER = [245, 242, 234];

test('the superseded pages’ footer headings and meta row clear AA against --ink', () => {
  for (const name of SUPERSEDED) {
    const html = page(name);
    for (const selector of ['.footer-col h4', '.footer-meta']) {
      const rule = html.slice(html.indexOf(selector + ' {'));
      const block = rule.slice(0, rule.indexOf('}'));
      const m = block.match(/color:\s*rgba\(245,\s*242,\s*234,\s*([\d.]+)\)/);
      assert.ok(m, name + ': ' + selector + ' still declares a colour');
      const a = parseFloat(m[1]);
      const c = contrast(PAPER, INK, a);
      assert.ok(c >= AA,
        name + ': ' + selector + ' at alpha ' + a + ' is ' + c.toFixed(2) + ':1 against #0E2A3F, '
        + 'below the ' + AA + ':1 AA threshold. The meta row also paints the Privacy and '
        + 'Terms links, so this value decides whether they are readable.');
    }
  }
});

// The arithmetic itself, pinned against two values measured by axe-core in a
// real browser — so a bug in the helper cannot quietly pass every page above.
test('the contrast helper agrees with what the browser measured', () => {
  assert.equal(contrast(FOREGROUND, GROUND, 0.42).toFixed(2), '3.46');   // axe: 3.45
  assert.equal(contrast(PAPER, INK, 0.5).toFixed(2), '4.39');            // axe: 4.39
});

// The Status page's own footer note is painted by --ink-40 rather than an
// inline colour, so the scan above cannot reach it. That token also paints
// .brand and .striplabel, and it shipped the migration at 0.42 (3.46:1) —
// pin the value that fixed all three.
test('the Status page’s small-text token clears AA', () => {
  const html = page('status/index.html');
  const m = html.match(/--ink-40:\s*rgba\(233,\s*228,\s*216,\s*([\d.]+)\)/);
  assert.ok(m, 'status/index.html still defines --ink-40');
  const c = contrast(FOREGROUND, GROUND, parseFloat(m[1]));
  assert.ok(c >= AA,
    'status/index.html: --ink-40 at alpha ' + m[1] + ' is ' + c.toFixed(2) + ':1 against #071019, '
    + 'below the ' + AA + ':1 AA threshold. It paints .brand, .striplabel and the page’s own '
    + 'footer note, so one value here is three failures.');
});

// ── Generalised from the footer to the whole site (#358) ─────────────────
//
// The footer pin above caught one instance of a site-wide problem: 198
// serious contrast nodes across 16 pages. Those are fixed, and the axe gate
// in test/a11y/ now requires zero — but that gate needs a browser, takes 40
// seconds, and reports a rendered COLOUR rather than the declaration that
// produced it. These assertions read the source instead: they run in
// milliseconds, need nothing installed, and name the exact line to change.
//
// Both layers are wanted. axe catches what only exists once a page is
// composited (a colour inherited onto an unexpected ground, an overlay).
// This catches the far commoner case — someone types a dim value — at the
// point where the fix is obvious.

// Secondary text on the dark ground is rgba(233,228,216,alpha). Below 0.51
// it cannot reach 4.5:1 on ANY of the grounds the site uses; 0.58 is the
// floor actually shipped, chosen for margin rather than for the minimum.
const DARK_TEXT_FLOOR = 0.58;
const DARK_PAGES = ['index.html', 'platform.html', 'solutions.html', 'how-it-works.html',
  'academy.html', 'resources.html', 'company.html', 'lets-talk.html',
  'privacy.html', 'terms.html', 'status/index.html'];

test('no dark page declares secondary TEXT below the readable floor', () => {
  for (const name of DARK_PAGES) {
    const html = page(name);
    // `color:` only. The same alphas are correct on borders and backgrounds,
    // and a sweep that did not distinguish them would lighten every hairline
    // rule on the site.
    for (const m of html.matchAll(/color:\s*rgba\(233,\s*228,\s*216,\s*(\.\d+|0?\.\d+)\)/g)) {
      const a = parseFloat(m[1]);
      assert.ok(a >= DARK_TEXT_FLOOR,
        name + ': text at alpha ' + a + ' is ' + contrast(FOREGROUND, GROUND, a).toFixed(2)
        + ':1 on #071019, under the 4.5:1 AA threshold. The floor is ' + DARK_TEXT_FLOOR
        + '. Borders and backgrounds may sit lower — this only matches `color:`.');
    }
  }
});

test('the superseded pages’ --ink-60 clears AA on the darkest paper it sits on', () => {
  // One token behind 37 of the original violations. It is used on --paper,
  // --paper-2 and --cream; --paper-2 #EDE8DB is the darkest, so it decides.
  const DARKEST_PAPER = hex('#EDE8DB');
  for (const name of ['about.html', 'approach.html', 'services.html', 'training.html']) {
    const m = page(name).match(/--ink-60:\s*rgba\(14,\s*42,\s*63,\s*([\d.]+)\)/);
    assert.ok(m, name + ' still defines --ink-60');
    const c = contrast(hex('#0E2A3F'), DARKEST_PAPER, parseFloat(m[1]));
    assert.ok(c >= AA,
      name + ': --ink-60 at ' + m[1] + ' is ' + c.toFixed(2) + ':1 on --paper-2 #EDE8DB. It paints '
      + 'the eyebrows, section numbers, lane tags and price notes across these pages, so one '
      + 'value here is dozens of failures.');
  }
});

test('--ink-40 is never used as text', () => {
  // It cannot clear AA at any size the site uses it, and it is ALSO a border
  // colour — so the fix is to stop painting text with it, not to raise it.
  for (const name of ['about.html', 'approach.html', 'services.html', 'training.html']) {
    const html = page(name);
    for (const m of html.matchAll(/\{[^}]*\}/g)) {
      const rule = m[0];
      if (/color:\s*var\(--ink-40\)/.test(rule) && !/border|outline|background/.test(rule)) {
        assert.fail(name + ': a rule paints TEXT with --ink-40 (2.32:1 at 11px, the worst ratio '
          + 'this site has shipped). Use --ink-60. Raising --ink-40 is not the fix — it is also '
          + 'a border colour.\n      ' + rule.replace(/\s+/g, ' ').slice(0, 120));
      }
    }
  }
});

test('the wordmark superscript takes the teal that suits its ground', () => {
  // --accent-ink is 5.50:1 on the light paper but 2.40:1 on the dark footer;
  // --accent is the reverse (2.71 / 4.88). Neither token works everywhere,
  // and picking one by habit is how this shipped failing on both grounds.
  for (const name of ['about.html', 'approach.html', 'services.html', 'training.html']) {
    const html = page(name);
    const base = html.match(/\.wordmark-sup \{[\s\S]*?\}/);
    assert.ok(base, name + ' defines .wordmark-sup');
    assert.match(base[0], /color:\s*var\(--accent-ink\)/,
      name + ': the wordmark superscript is 10px text — on the light paper it needs '
      + '--accent-ink (5.50:1), not --accent (2.71:1)');
    assert.match(html, /\.site-footer \.wordmark-sup \{\s*color:\s*var\(--accent\);\s*\}/,
      name + ': the footer sits on --ink where --accent-ink drops to 2.40:1, so it must take '
      + 'the lighter --accent there');
  }
});

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
