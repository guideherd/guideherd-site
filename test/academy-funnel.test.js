// The marketing → Academy funnel contract (Academy separation, 2026-08).
//
// The Academy at training.guideherd.ai is the self-serve training
// product: its plans, checkout, and accounts live THERE. Marketing's
// job is an honest, discoverable doorway — these pins keep the doorway
// present and keep commerce out of the marketing repository.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('the Academy page offers an explicit doorway to the Academy product', () => {
  // Relocated from training.html when that page retired (#352): the
  // doorway obligation binds the LIVING marketing surface for the
  // Academy. The honest-framing half of the old pin (its own
  // subscription, never blurred into platform plans) is carried by the
  // no-commerce refusals below and the dated /resources entry that names
  // it a subscription product.
  const html = fs.readFileSync('academy.html', 'utf8');
  assert.match(html, /https:\/\/training\.guideherd\.ai/,
    'the Academy marketing page must link the Academy product');
});

test('the homepage cross-links the Academy beside the Success pointer', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /https:\/\/training\.guideherd\.ai/);
});

// The published legal pages (#333) are the one place the marketing site has
// to NAME the payment processor: a privacy policy that hides who takes the
// card is not a privacy policy. Naming a processor in prose is disclosure,
// which is the opposite of carrying commerce, so the word alone is allowed
// there — and only there. Every commerce MECHANISM stays refused on every
// page including these two: no checkout endpoint, no price or key material,
// no Stripe SDK or API host, no checkout link. The original guard is
// unchanged for all twelve other pages.
const LEGAL_PAGES = new Set(['privacy.html', 'terms.html']);
const COMMERCE = /stripe|\/api\/checkout|price_[0-9A-Za-z]{10,}|sk_(live|test)_/i;
const COMMERCE_MECHANISM =
  /js\.stripe\.com|api\.stripe\.com|checkout\.stripe\.com|stripe\.js|new Stripe\(|Stripe\(['"`]|\/api\/checkout|price_[0-9A-Za-z]{10,}|sk_(live|test)_|pk_(live|test)_/i;

test('marketing owns NO commerce: no Stripe, no checkout, no price ids', () => {
  for (const f of fs.readdirSync('.').filter((f) => f.endsWith('.html'))) {
    const html = fs.readFileSync(f, 'utf8');
    const pattern = LEGAL_PAGES.has(f) ? COMMERCE_MECHANISM : COMMERCE;
    assert.ok(!pattern.test(html), f + ' must not carry commerce');
  }
});

// The narrowing above is only safe while the disclosure it exists for is
// actually on the page. If a future edit drops it, the exemption must not
// quietly survive as a hole.
test('the legal pages earn their exemption by carrying the disclosure', () => {
  const privacy = fs.readFileSync('privacy.html', 'utf8');
  assert.match(privacy, /Stripe/, 'the Privacy Policy must name the payment processor');
  assert.match(privacy, /never see or store your card details/i,
    'and must state plainly that GuideHerd does not hold card data');
});
