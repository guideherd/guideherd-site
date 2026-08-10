'use strict';
// Integration-claims consistency (#294 follow-up): the calendar claims on the
// public site must name BOTH validated calendar providers. This test exists
// because "Microsoft-only" survived one audit after Google Calendar was
// already shipped, credentialed, and demonstrated end to end.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const page = (n) => fs.readFileSync(path.join(__dirname, '..', n), 'utf8');
test('the scheduling claims name both validated calendar providers', () => {
  const index = page('index.html');
  assert.match(index, /Google calendars|Google Calendar/, 'index names Google Calendar');
  assert.match(index, /Microsoft 365/, 'index names Microsoft 365');
  assert.match(page('services.html'), /Google Calendar/, 'services names Google Calendar');
  assert.match(page('approach.html'), /Google Calendar/, 'approach names Google Calendar');
});
test('SSO and calendar remain distinct claims', () => {
  const index = page('index.html');
  // Sign-in claim (Workspace SSO) and the calendar claim both present,
  // so one being edited can never silently stand in for the other.
  assert.match(index, /Google Workspace, or a firm-issued account/);
  assert.match(index, /Google Calendar integration/);
});
// The Clio dialect is validated at rung 3 against the Clio TRIAL tenant.
// Rungs 4-5 (pilot-firm live validation) are still open, so no page may
// imply a customer's own Clio account has been used.
test('the Clio claim stays inside the evidence', () => {
  for (const name of ['index.html', 'services.html', 'approach.html']) {
    assert.doesNotMatch(page(name), /real firm|in production at a firm/i,
      name + ' must not claim Clio ran against a customer firm’s own account');
  }
  assert.match(page('index.html'), /validated end to end against a Clio tenant/);
});
// Entra ID sign-in is implemented but dark and never validated against a
// real tenant; the customer reference guide lists it as not available.
// Microsoft 365 CALENDAR is a separate, live-proven claim and stays.
test('Microsoft is not offered as a staff sign-in method', () => {
  const index = page('index.html');
  assert.doesNotMatch(index, /sign in with Microsoft or Google|Microsoft or Google Workspace/i,
    'index must not list Microsoft among the available sign-in methods');
  assert.match(index, /Microsoft 365 calendar integration/,
    'the Microsoft 365 calendar claim is separate and must survive');
});

// ── GitLab #303: the picture must not claim what the copy retracted ──────
//
// The sign-in screenshot previously showed a "Continue with Microsoft" button,
// because the screenshot generator's own mock injected an `entra-id` provider.
// A real deployment does not: `entraId` defaults to { enabled: false,
// clientId: null, ... } in the product's console-sign-in domain, so the
// provider is never emitted by /auth/providers and never rendered.
//
// Microsoft Entra sign-in is implemented but has never been validated against
// a real directory, so it must not appear as an available capability — in copy
// OR in imagery, where a reader believes the picture over the caption.
test('the sign-in imagery does not present Microsoft authentication', () => {
  const index = page('index.html');
  const figure = index.slice(index.indexOf('/images/entry-dark.png') - 400,
                             index.indexOf('/images/entry-dark.png') + 900);
  assert.doesNotMatch(figure, /Microsoft/i,
    'the entry screenshot’s alt text and caption must not mention Microsoft sign-in — '
    + 'regenerate the image from a production-equivalent posture instead of annotating it');
});

test('the screenshot generator mocks a production-equivalent provider set', () => {
  const gen = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'product-screenshots.js'), 'utf8');
  // Match the RETURNED ARRAY only. The surrounding comment names `entra-id`
  // to explain why it is absent, and asserting over the comment would fail on
  // its own explanation.
  const start = gen.indexOf('return json(200, { providers: [', gen.indexOf('/api/v1/auth/providers'));
  const block = gen.slice(start, gen.indexOf('] });', start));
  assert.ok(start > -1, 'the providers mock still returns a provider array');
  assert.doesNotMatch(block, /entra-id/,
    'the generator must not inject an entra-id provider: whatever it returns becomes a picture '
    + 'on a public page, and Entra sign-in is not validated');
  assert.match(block, /google-workspace/,
    'Google Workspace sign-in is live-verified and belongs in the capture');
});

// The Microsoft 365 CALENDAR integration is a separate, live-proven capability
// (#95, closed 2026-07-28) reached through entirely different credentials.
// Correcting the AUTHENTICATION claim must never be done by deleting it.
test('correcting Microsoft sign-in never removes the Microsoft 365 calendar claim', () => {
  assert.match(page('index.html'), /Microsoft 365 calendar integration/,
    'the calendar claim is separate from the sign-in claim and must survive');
  assert.match(page('index.html'), /Microsoft 365/,
    'the Microsoft 365 integration card must survive');
});

// ── GitLab #317: product imagery must depict the CURRENT product ─────────
//
// The 2026-08-10 truth audit found the captures showing two retired
// compositions: the identity chip rendering the tenant SLUG (fixed by
// product #308 — the session carries organizationName and the chip renders
// it), and the Operations Overview leading with the removed "Today's
// handoffs" card (product #314). Both were generator-mock or staleness
// defects, not product truth. These pins keep the generator's mocks
// production-equivalent so a regeneration cannot reintroduce either.
test('the screenshot generator’s identities carry the firm name the real session carries (#308)', () => {
  const gen = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'product-screenshots.js'), 'utf8');
  const matches = gen.match(/organizationName: 'Ashford & Bell, LLP'/g) || [];
  assert.ok(matches.length >= 2,
    'both mock identities must carry organizationName — without it the identity chip '
    + 'in every public capture falls back to the tenant slug, a retired defect');
});

test('the ops screenshot’s alt text describes the current Overview, not the retired handoffs card', () => {
  const index = page('index.html');
  const alt = index.slice(index.indexOf('/images/ops-overview-dark.png'),
                          index.indexOf('/images/ops-overview-dark.png') + 800);
  assert.doesNotMatch(alt, /handoffs as counts/,
    'the "Today’s handoffs" card was removed (product #314) — the KPI strip owns the numbers');
  assert.match(alt, /KPI strip/, 'the alt names the composition the capture actually shows');
});
