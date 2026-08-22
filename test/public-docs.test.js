'use strict';
// The public evaluation surface (#357).
//
// Owner decision, 2026-08-22: the private docs/customer/ corpus stays
// private. It is written for firms already using GuideHerd, assumes context
// a public reader lacks, and at least one file names a real customer. Nothing
// public may be copied from it; anything derived must be rewritten for an
// evaluation audience and checked against the implementation.
//
// So the public surface is three things and no more: a trust page, the
// EXISTING /platform integrations section (authoritative — not duplicated),
// and /resources as the release log.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (n) => fs.readFileSync(path.join(__dirname, '..', n), 'utf8');
const text = (n) => read(n).replace(/<script[\s\S]*?<\/script>/g, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&mdash;/g, '—').replace(/&rsquo;/g, '’')
  .replace(/\s+/g, ' ');

const TRUST = read('trust.html');
const TRUST_TEXT = text('trust.html');

test('the trust page states plainly that nothing has been externally assessed', () => {
  // The single most important sentence on the page, and the one a template
  // would soften first.
  assert.match(TRUST_TEXT, /No outside party has assessed GuideHerd’s security posture/,
    'the trust page must lead with what has NOT been assessed — a trust page that lists only '
    + 'strengths is a sales page');
  assert.match(TRUST_TEXT, /no independent report/i);
});

test('the trust page carries its gaps, not only its controls', () => {
  assert.match(TRUST_TEXT, /What we have not done/,
    'the gaps section must survive — a reviewer finds these anyway, and finding them here is '
    + 'better than finding them later');
  // Each of these is a real, recorded gap. Losing one silently would make the
  // page a stronger claim than the evidence supports.
  for (const gap of ['Formal written policies', 'Access review cadence', 'Log retention',
                     'Backup coverage', 'Redundancy', 'Independent assessment']) {
    assert.ok(TRUST_TEXT.includes(gap), 'the trust page no longer discloses: ' + gap);
  }
});

test('the trust page names who maintains it and where', () => {
  // #357: anything published must name its maintenance source, so it cannot
  // silently drift from the product.
  assert.match(TRUST_TEXT, /Maintained by:\s*GuideHerd engineering/,
    'the page must name its owner');
  assert.match(TRUST_TEXT, /guideherd-site/, 'and where it lives');
});

test('the trust page records that it is not copied from the private corpus', () => {
  assert.match(TRUST_TEXT, /Nothing here is copied from our internal customer documentation/,
    'the provenance statement is the owner decision made visible — it is what stops the next '
    + 'person pasting private material in');
});

test('no public page reproduces the private customer documentation', () => {
  // Titles from docs/customer/ in the product repo. None may appear on the
  // public site, and the real customer name in that corpus certainly may not.
  const PRIVATE_TITLES = ['Administrator Guide', 'Configuration Guide', 'Onboarding Worksheet',
    'Receptionist Guide', 'Troubleshooting Guide', 'Operations Guide', 'Installation & Deployment'];
  for (const name of fs.readdirSync(path.join(__dirname, '..')).filter((f) => f.endsWith('.html'))) {
    const t = text(name);
    for (const title of PRIVATE_TITLES) {
      assert.ok(!t.includes(title),
        name + ' reproduces "' + title + '" from the private docs/customer/ corpus. That material '
        + 'stays private (owner decision 2026-08-22); public pages are written separately.');
    }
    assert.ok(!/Martinson|Beason/i.test(t),
      name + ' names a real customer. The private corpus contains one; nothing public may.');
  }
});

test('integration status has ONE public home, not a second system', () => {
  // The owner asked explicitly for no redundant integration documentation.
  // /platform stays authoritative; the trust page points at it.
  assert.match(read('platform.html'), /Supported integrations/,
    '/platform remains the authoritative integration-status source');
  assert.match(TRUST_TEXT, /every integration named/i,
    'the trust page must point at /platform rather than restate its content');
  assert.ok(!/Microsoft 365 calendar|Clio/.test(TRUST_TEXT),
    'the trust page must not restate integration status — that would create the second, '
    + 'drifting source #357 explicitly refuses');
});

test('/resources is the release log and promises no cadence', () => {
  const r = text('resources.html');
  assert.match(r, /We publish a note when something meaningful ships/,
    '/resources must describe how releases are published');
  assert.match(r, /not on a schedule/,
    'owner decision: publish meaningful releases rather than commit to a fixed cadence — a '
    + 'promised cadence becomes a claim the moment it is missed');
  for (const bad of [/every (week|month|quarter)/i, /weekly|monthly|quarterly/i]) {
    assert.doesNotMatch(r, bad, '/resources must not promise a publishing interval');
  }
});

test('the evaluation surfaces reach each other', () => {
  // A reseller must be able to get from any page to the trust surface, and
  // from the trust surface to everything else, without a sales conversation.
  const PAGES = ['index.html', 'platform.html', 'privacy.html', 'terms.html', 'trust.html',
    'resources.html', 'company.html', 'about.html', 'training.html', 'status/index.html'];
  for (const name of PAGES) {
    assert.match(read(name), /href="\/trust"/, name + ' has no route to the trust page');
  }
  for (const dest of ['/platform', '/privacy', '/terms', '/status/']) {
    assert.ok(TRUST.includes('href="' + dest + '"'),
      'the trust page must link ' + dest + ' — it is the entry point for an evaluation');
  }
});

test('the trust page makes no claim the site’s other guards would refuse', () => {
  // Belt and braces: claims.test.js already covers trust.html, but the
  // security page is where certification vocabulary is most tempting.
  assert.doesNotMatch(TRUST,
    /\b(certified|certification|attested|attestation|accredited|accreditation|compliant|compliance)\b/i);
  assert.doesNotMatch(TRUST, /\bSOC[\s-]?[123]\b|ISO[\s-]?27001|HIPAA|SSAE|FedRAMP|PCI[\s-]?DSS|HITRUST/i);
  // And no absolute promise about outcomes, which is the other easy overreach.
  for (const bad of [/\bguarantee[sd]?\b/i, /\bfully secure\b/i, /\bcannot be breached\b/i,
                     /\b(bank|military)[- ]grade\b/i]) {
    assert.doesNotMatch(TRUST_TEXT, bad,
      'the trust page must not promise what no system can: ' + bad);
  }
});
