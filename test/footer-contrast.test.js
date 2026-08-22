'use strict';
// The shared footer's text must clear WCAG AA (#333 follow-up).
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
  'privacy.html', 'terms.html'];
const GROUND = hex('#071019');
const FOREGROUND = [233, 228, 216];

test('every redesigned footer’s text clears AA against the page ground', () => {
  for (const name of REDESIGNED) {
    const html = page(name);
    const footer = html.slice(html.indexOf('<footer'), html.indexOf('</footer>'));
    assert.ok(footer.length > 0, name + ' has a footer');
    const alphas = [...footer.matchAll(/color:\s*rgba\(233,\s*228,\s*216,\s*(\.\d+|0?\.\d+|1)\)/g)]
      .map((m) => parseFloat(m[1]));
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
