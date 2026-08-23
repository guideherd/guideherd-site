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
// The integrations page is where products are named (editorial pass): the
// homepage speaks in capabilities, /platform names each product and where it
// stands. These pins follow the CLAIM, not the page it used to live on, and
// two of them are now stronger than before because they apply site-wide
// rather than to index.html alone.
const INTEGRATIONS_PAGE = 'platform.html';
// Every shipped page, DISCOVERED rather than listed (#352): a hard-coded
// list silently misses the next page added, and these are refusals that
// must bind every public surface. Root *.html is exactly the shipped page
// set (scripts/build-site.sh's allowlist), plus the status page.
const ALL_PUBLIC = [...fs.readdirSync(path.join(__dirname, '..'))
  .filter((f) => f.endsWith('.html')), 'status/index.html'];

test('the scheduling claims name both validated calendar providers', () => {
  const integrations = page(INTEGRATIONS_PAGE);
  assert.match(integrations, /Google calendars|Google Calendar/, 'the integrations page names Google Calendar');
  assert.match(integrations, /Microsoft 365/, 'the integrations page names Microsoft 365');
  // The services.html/approach.html asserts retired with those pages
  // (#352, owner removal decision): the risk they guarded — a
  // Microsoft-only calendar claim ON THOSE PAGES — cannot recur on pages
  // that no longer exist, and the site-wide both-or-neither refusal below
  // still binds every page that ships.
});

// STRONGER than the original: "Microsoft-only" is refused on EVERY page, not
// just the one that happened to carry the claim when #294 was written. That
// was the actual failure — a Microsoft-only sentence surviving an audit.
test('no public page names the Microsoft calendar without naming Google’s', () => {
  for (const name of ALL_PUBLIC) {
    const html = page(name);
    if (!/Microsoft 365 calendar/i.test(html)) continue;
    assert.match(html, /Google Calendar/,
      name + ' names the Microsoft 365 calendar integration, so it must name the '
      + 'Google Calendar integration too — Microsoft-only is the exact claim #294 exists to refuse');
  }
});

test('SSO and calendar remain distinct claims', () => {
  const integrations = page(INTEGRATIONS_PAGE);
  // Sign-in claim (Workspace SSO) and the calendar claim both present,
  // so one being edited can never silently stand in for the other.
  assert.match(integrations, /Google Workspace, or a firm-issued account/);
  assert.match(integrations, /Google Calendar integration/);
});
// The Clio dialect is validated at rung 3 against the Clio TRIAL tenant.
// Rungs 4-5 (pilot-firm live validation) are still open, so no page may
// imply a customer's own Clio account has been used.
test('the Clio claim stays inside the evidence', () => {
  for (const name of ALL_PUBLIC) {
    assert.doesNotMatch(page(name), /real firm|in production at a firm/i,
      name + ' must not claim Clio ran against a customer firm’s own account');
  }
  assert.match(page(INTEGRATIONS_PAGE), /validated end to end against a Clio tenant/);
});
// Entra ID sign-in is implemented but dark and never validated against a
// real tenant; the customer reference guide lists it as not available.
// Microsoft 365 CALENDAR is a separate, live-proven claim and stays.
test('Microsoft is not offered as a staff sign-in method', () => {
  // STRONGER: the refusal now covers every public page.
  for (const name of ALL_PUBLIC) {
    assert.doesNotMatch(page(name), /sign in with Microsoft or Google|Microsoft or Google Workspace/i,
      name + ' must not list Microsoft among the available sign-in methods');
  }
  assert.match(page(INTEGRATIONS_PAGE), /Microsoft 365 calendar integration/,
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
// RETIRED IN ITS ORIGINAL FORM. The assertion below used to slice a window
// around `/images/entry-dark.png` inside index.html. The marketing redesign
// stopped publishing that screenshot, so `indexOf` returned -1, the slice
// became `slice(-401, 899)` — an EMPTY string — and the check passed no
// matter what the page said. Proven: injecting "Microsoft sign-in" across
// the whole page still passed it. A guard that cannot fail is worse than no
// guard, because it reads like coverage.
//
// The GUARANTEE is kept and is now automatic: whichever public page
// publishes that capture must not present Microsoft authentication beside
// it. No page publishes it today, so this asserts nothing about nothing —
// and the moment the screenshot returns, the check returns with it.
//
// The generator pin below is untouched and still live: scripts/
// product-screenshots.js continues to emit entry-dark.png, so what its
// provider mock returns still becomes a picture the moment it is published.
test('wherever the sign-in capture is published, it does not present Microsoft authentication', () => {
  for (const name of ALL_PUBLIC) {  // discovered, not listed (#352)
    const html = page(name);
    const at = html.indexOf('/images/entry-dark.png');
    if (at === -1) continue;                 // this page does not publish it
    const figure = html.slice(Math.max(0, at - 400), at + 900);
    assert.doesNotMatch(figure, /Microsoft/i,
      name + ': the entry screenshot’s alt text and caption must not mention Microsoft '
      + 'sign-in — regenerate the image from a production-equivalent posture instead of '
      + 'annotating it');
  }
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
  assert.match(page(INTEGRATIONS_PAGE), /Microsoft 365 calendar integration/,
    'the calendar claim is separate from the sign-in claim and must survive');
  assert.match(page(INTEGRATIONS_PAGE), /Microsoft 365/,
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

// ── GitLab #332: compliance-claim pins ───────────────────────────────────
//
// Standing rule (product repo, docs/security/soc2-readiness-assessment-
// 2026-08.md): GuideHerd is NOT SOC 2 compliant, certified, attested, or
// audited, and must not be described as such anywhere — site, sales
// material, docs, support answers — until an independent auditor issues a
// report. These pins refuse the vocabulary outright on every public page,
// so a compliance claim cannot ship by copy-edit: adding one is a
// deliberate edit here PLUS the auditor's issued report as evidence.
const PUBLIC_PAGES = ALL_PUBLIC; // discovered, not listed (#352)

test('no public page names a compliance framework (#332)', () => {
  for (const name of PUBLIC_PAGES) {
    assert.doesNotMatch(page(name),
      /\bSOC[\s-]?[123]\b|ISO[\s-]?27001|HIPAA|SSAE|FedRAMP|PCI[\s-]?DSS|HITRUST/i,
      name + ' must not name a compliance framework: GuideHerd holds no certification, '
      + 'attestation, or audit report under any of them, and a framework name on a public '
      + 'page reads as a claim regardless of the sentence around it.');
  }
});

test('no public page uses certification vocabulary (#332)', () => {
  for (const name of PUBLIC_PAGES) {
    const html = page(name);
    assert.doesNotMatch(html,
      /\b(certified|certification|attested|attestation|accredited|accreditation|compliant|compliance)\b/i,
      name + ' must not use certification vocabulary — nothing about GuideHerd has been '
      + 'certified, attested, or assessed by an external party.');
    // Audit vocabulary may appear ONLY as the product's change-audit-trail
    // feature: "versioned(,) and audited", and the "audit history/line/
    // trail/log" the product actually keeps — never as a statement that
    // GuideHerd itself has been audited. Strip the feature senses, then
    // refuse the rest of the root.
    const stripped = html
      // The feature sense, in the forms the surfaces actually write it:
      // "versioned and audited", "versioned, audited", "versioned,
      // auditable". `auditable` is the weaker, more accurate adjective —
      // rewriting copy to `audited` just to satisfy this pattern would
      // strengthen the claim, which is the opposite of the intent here.
      .replace(/versioned,? (and )?audit(ed|able)/gi, '')
      .replace(/audit (history|line|trail|log)/gi, '');
    assert.doesNotMatch(stripped, /\baudit/i,
      name + ' may say "audited" only inside the versioned-configuration feature phrase; '
      + 'any other audit vocabulary on a public page reads as a compliance claim '
      + 'GuideHerd cannot make.');
  }
});

test('the ops screenshot’s alt text describes the current Overview, not the retired handoffs card', () => {
  const index = page('index.html');
  const alt = index.slice(index.indexOf('/images/ops-overview-dark.png'),
                          index.indexOf('/images/ops-overview-dark.png') + 800);
  assert.doesNotMatch(alt, /handoffs as counts/,
    'the "Today’s handoffs" card was removed (product #314) — the KPI strip owns the numbers');
  assert.match(alt, /KPI strip/, 'the alt names the composition the capture actually shows');
});

// ── GitLab #372: the shipped-history claims stay inside their evidence ───
//
// The release chronology on /resources introduced the site's first public
// voice claim. Its basis is one production validation (2026-07-28): a live
// call became a confirmed Microsoft 365 booking with confirmations and a
// durable intake record. The claim is therefore a DATED EVENT on the
// release log — it may not migrate into general positioning copy, and it
// may not shed the grounding that keeps it literal.
test('the voice claim lives only in the dated release entry, and keeps its grounding', () => {
  const r = page('resources.html');
  assert.match(r, /AI voice reception/, '/resources carries the voice entry');
  assert.match(r, /Microsoft 365 calendar/, 'the voice entry names the validated calendar path');
  assert.match(r, /production deployment/, 'the voice entry stays anchored to the production event');
  for (const name of ALL_PUBLIC) {
    if (name === 'resources.html') continue;
    assert.doesNotMatch(page(name), /AI voice|voice reception|voice AI|automated (voice|phone)/i,
      name + ' must not make a voice capability claim — the only supported claim is the dated entry on /resources (#372)');
  }
});

// The guided-onboarding entry was validated against a SYNTHETIC second
// tenant. That qualifier is the difference between the claim and an
// adoption claim no evidence supports; an edit may not silently drop it.
test('the onboarding entry keeps its synthetic-tenant qualifier', () => {
  assert.match(page('resources.html'), /synthetic second tenant/,
    'the guided-onboarding entry must say its validation used a synthetic tenant (#372)');
});

// Every release-note row carries a month-year date, and the chronology
// cannot silently shrink: a "history" whose rows can vanish or lose their
// dates stops being a record.
test('every release-note row is dated, and the chronology holds its floor', () => {
  const r = page('resources.html');
  const rows = r.split('Release note').length - 1;
  assert.ok(rows >= 11, 'the release log holds at least its 2026-08 row count (' + rows + ')');
  const dates = (r.match(/>(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* 20\d\d</g) || []).length;
  assert.ok(dates >= rows, 'every Release note row must carry a Mon YYYY date (' + dates + '/' + rows + ')');
});
