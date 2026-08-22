'use strict';
// Indexing readiness (#353).
//
// Submitting a sitemap only helps if what it points at is actually
// indexable. Each of these has a silent failure mode: a stray `noindex`
// suppresses a page with no error anywhere; a canonical pointing at another
// page hands that page the credit; an `X-Robots-Tag` in _headers overrides
// every meta tag on the site at once and is invisible in the HTML.
//
// The Search Console work itself is dashboard-only and belongs to the owner
// (docs/search-indexing.md). What CAN be checked from here is checked here,
// so "we submitted it" is never the whole story.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (n) => fs.readFileSync(path.join(__dirname, '..', n), 'utf8');

const SITE = 'https://guideherd.ai';
const SITEMAP = read('sitemap.xml');
const HEADERS = read('_headers');
const BUILD = read('scripts/build-site.sh');

// Route -> the file it is served from. Kept beside robots-sitemap.test.js's
// list deliberately: if they disagree, one of the two is wrong and the
// disagreement is the signal.
const INDEXABLE = {
  '/': 'index.html',
  '/platform': 'platform.html',
  '/solutions': 'solutions.html',
  '/how-it-works': 'how-it-works.html',
  '/academy': 'academy.html',
  '/resources': 'resources.html',
  '/company': 'company.html',
  '/lets-talk': 'lets-talk.html',
  '/privacy': 'privacy.html',
  '/terms': 'terms.html',
  '/status/': 'status/index.html',
};

test('no page the sitemap advertises suppresses its own indexing', () => {
  for (const [route, file] of Object.entries(INDEXABLE)) {
    const html = read(file);
    const robots = html.match(/<meta name="robots" content="([^"]*)">/i);
    if (robots) {
      assert.doesNotMatch(robots[1], /noindex|none/i,
        file + ' is listed in sitemap.xml for ' + route + ' but tells crawlers not to index it. '
        + 'A page cannot be both submitted and suppressed — decide one.');
    }
  }
});

test('no page hands its indexing credit to a different URL', () => {
  for (const [route, file] of Object.entries(INDEXABLE)) {
    const m = read(file).match(/<link rel="canonical" href="([^"]+)">/);
    assert.ok(m, file + ' must declare a canonical (#350)');
    assert.equal(m[1], SITE + route,
      file + ': its canonical points at ' + m[1] + ' rather than its own address, which tells '
      + 'a crawler to index that page instead of this one');
  }
});

test('_headers carries no site-wide X-Robots-Tag', () => {
  // A header beats every meta tag and is invisible when you read the HTML —
  // the failure mode where the site looks perfectly indexable and is not.
  assert.doesNotMatch(HEADERS, /X-Robots-Tag/i,
    '_headers must not set X-Robots-Tag: it would override the per-page posture site-wide, '
    + 'and nothing in the HTML would show why pages stopped appearing.');
});

test('the status page’s indexing posture is a recorded decision, not a default', () => {
  // #353 requires this be decided explicitly. The decision is: index it.
  // It is public, stable, linked from every footer, and it is what someone
  // searches for during an incident. Recorded in docs/search-indexing.md;
  // reversible by removing it from INDEXABLE and adding a noindex.
  assert.ok('/status/' in INDEXABLE, 'the status page is intentionally indexable');
  assert.match(SITEMAP, /guideherd\.ai\/status\//, 'and is advertised in the sitemap');
  const doc = read('docs/search-indexing.md');
  assert.match(doc, /## Decision: \/status\/ is indexed/,
    'the reasoning must live in the repo, not in whoever made the call');
});

test('a site-verification file would actually ship', () => {
  // The trap #353 names: the positive allowlist means an unlisted file is
  // silently absent, and a verification provider reports no error when its
  // file 404s — verification just never completes.
  assert.match(BUILD, /google\*\.html/,
    'scripts/build-site.sh must ship a Google verification file if one is added');
  assert.match(BUILD, /BingSiteAuth\.xml/,
    'and a Bing one');
  assert.match(BUILD, /\[ -f "\$verification" \] \|\| continue/,
    'guarded by an existence test — BingSiteAuth.xml is a literal name that nullglob '
    + 'does not remove, so without this every clean build printed a cp error');
});

test('the Search Console runbook exists and names an owner', () => {
  const doc = read('docs/search-indexing.md');
  for (const section of ['## Property', '## Verification', '## Owner', '## Remaining manual steps']) {
    assert.ok(doc.includes(section), 'docs/search-indexing.md is missing "' + section + '"');
  }
  assert.doesNotMatch(doc, /TODO: verify|FIXME/,
    'the runbook records what is true; open work belongs in its own section');
});
