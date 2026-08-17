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

test('the Training page offers an explicit Academy doorway', () => {
  const html = fs.readFileSync('training.html', 'utf8');
  assert.match(html, /https:\/\/training\.guideherd\.ai/);
  assert.match(html, /Explore Academy plans/);
  // Honest framing: the Academy is presented as its own subscription,
  // never blurred into the platform or the Success plans.
  assert.match(html, /separate subscription/i);
});

test('the homepage cross-links the Academy beside the Success pointer', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /https:\/\/training\.guideherd\.ai/);
});

test('marketing owns NO commerce: no Stripe, no checkout, no price ids', () => {
  for (const f of fs.readdirSync('.').filter((f) => f.endsWith('.html'))) {
    const html = fs.readFileSync(f, 'utf8');
    assert.ok(!/stripe|\/api\/checkout|price_[0-9A-Za-z]{10,}|sk_(live|test)_/i.test(html),
      f + ' must not carry commerce');
  }
});
