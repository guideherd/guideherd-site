'use strict';
// robots.txt and sitemap.xml must describe the site that actually exists (#351).
//
// robots.txt used to explain itself with a retired premise — "Application
// paths on this host are backward-compatibility redirects to
// app.guideherd.ai" — and Disallow seven paths that now return an ordinary
// 404 (#254 retired the redirects; test/redirects.test.js pins _redirects
// empty). A crawler directive that protects nothing while asserting a
// routing posture the repo abandoned is worse than no directive.
//
// The load-bearing pin here is the LAST one: the sitemap is derived from the
// same allowlist that decides what ships, so a new page cannot go live
// unlisted — and an unlisted page is one nobody notices is missing from
// search until someone thinks to look.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (n) => fs.readFileSync(path.join(__dirname, '..', n), 'utf8');

const ROBOTS = read('robots.txt');
const SITEMAP = read('sitemap.xml');
const BUILD = read('scripts/build-site.sh');

const SITE = 'https://guideherd.ai';

// The routes the sitemap claims, and the file each is served from.
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

// Superseded, reachable, deliberately unlisted — #352 owns their fate.
const SUPERSEDED = ['about.html', 'approach.html', 'services.html', 'training.html'];

// Never indexable: an error page must not compete for its own query.
const NEVER = ['404.html'];

const locs = () => [...SITEMAP.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

test('robots.txt no longer claims the apex carries application redirects', () => {
  assert.doesNotMatch(ROBOTS, /backward-compatibility redirects/i,
    'the redirects were retired 2026-08-10; the file must not still explain itself with them');
  // The rules that existed only because of that premise.
  for (const p of ['/receptionist/', '/operations/', '/admin/', '/manage/',
                   '/intake/', '/intake-review/', '/documents/']) {
    const rule = new RegExp('^\\s*Disallow:\\s*' + p.replace(/\//g, '\\/') + '\\s*$', 'mi');
    assert.doesNotMatch(ROBOTS, rule,
      p + ' returns 404 — a Disallow rule for it protects nothing and asserts a routing '
      + 'posture this repository retired. If one is ever reinstated, the reason belongs '
      + 'in a comment beside it.');
  }
  // Whatever else changes, the file must still explain WHY it is shaped this way.
  assert.match(ROBOTS, /#254/, 'the retirement decision is cited, so the next editor knows');
});

test('robots.txt still points crawlers at the sitemap and allows the site', () => {
  assert.match(ROBOTS, /^User-agent:\s*\*$/m);
  assert.match(ROBOTS, /^Allow:\s*\/$/m);
  assert.match(ROBOTS, new RegExp('^Sitemap:\\s*' + SITE.replace(/\//g, '\\/') + '\\/sitemap\\.xml$', 'm'),
    'the Sitemap line is how a crawler finds the route list without guessing');
});

test('the sitemap lists exactly the indexable routes — no more, no less', () => {
  const found = locs().sort();
  const want = Object.keys(INDEXABLE).map((r) => SITE + r).sort();
  assert.deepEqual(found, want,
    'sitemap.xml and the indexable route list have diverged');
  assert.equal(new Set(found).size, found.length, 'no duplicate <loc> entries');
});

test('every sitemap entry carries a well-formed, non-future lastmod', () => {
  const entries = [...SITEMAP.matchAll(/<loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod>/g)];
  assert.equal(entries.length, locs().length, 'every <loc> must carry a <lastmod>');
  for (const [, loc, mod] of entries) {
    assert.match(mod, /^\d{4}-\d{2}-\d{2}$/, loc + ': lastmod must be W3C date format');
    assert.ok(!Number.isNaN(Date.parse(mod)), loc + ': lastmod must parse');
    // A future date tells a crawler to come back later and re-check nothing.
    assert.ok(Date.parse(mod) <= Date.now(), loc + ': lastmod must not be in the future');
  }
});

test('the sitemap never lists a superseded or non-indexable page', () => {
  const listed = locs().join(' ');
  for (const f of SUPERSEDED) {
    const route = '/' + f.replace('.html', '');
    assert.ok(!listed.includes(SITE + route),
      f + ' is superseded — listing it in the sitemap decides #352 by default');
  }
  for (const f of NEVER) {
    assert.ok(!listed.includes('/404'), f + ' must never be advertised for indexing');
  }
});

// ── The pin that actually prevents the next failure ──────────────────────
//
// A new page ships by being named in scripts/build-site.sh. Nothing
// previously connected that to the sitemap, so a page could go live and be
// invisible to search with no test disagreeing.
test('every shipped marketing page is either in the sitemap or deliberately excluded', () => {
  // The pages the allowlist copies into the site root, in the order it names
  // them — read from the build script, so the two cannot drift apart.
  const copied = [...BUILD.matchAll(/^\s*cp\s+([^"|]*?)\s*"\$OUT"\//gms)]
    .flatMap((m) => m[1].split(/[\s\\]+/))
    .filter((f) => f.endsWith('.html'));
  assert.ok(copied.length >= 13, 'expected the allowlist to name the marketing pages, saw ' + copied.length);

  const inSitemap = new Set(Object.values(INDEXABLE));
  const excluded = new Set([...SUPERSEDED, ...NEVER]);
  for (const f of copied) {
    assert.ok(inSitemap.has(f) || excluded.has(f),
      f + ' ships but is neither listed in the sitemap nor recorded as a deliberate '
      + 'exclusion. A page that ships unlisted is invisible to search and nobody finds '
      + 'out until they think to check — add it to INDEXABLE, or record why it is excluded.');
  }
  // status/index.html is copied as part of the status directory, not named
  // among the root pages, so it is asserted separately.
  assert.match(BUILD, /cp -R .*status/, 'the status directory still ships');
  assert.ok(inSitemap.has('status/index.html'), 'and the status page is still listed');
});

test('the sitemap ships', () => {
  assert.match(BUILD, /cp robots\.txt sitemap\.xml/, 'both files must be in the allowlist');
});
