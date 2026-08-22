'use strict';
// Canonical URLs and share metadata on every current page (#350).
//
// Before this, 0 of 14 pages carried a canonical, an og: tag, or a Twitter
// Card: a GuideHerd link shared in Slack or LinkedIn rendered as a bare URL,
// and with clean URLs served at both /platform and /platform.html nothing
// told a crawler which address was authoritative.
//
// These assertions parse the tags rather than trusting that a template ran.
// The metadata is injected per page, so "it worked on the homepage" has
// never been evidence that it worked on the other eleven.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const page = (n) => fs.readFileSync(path.join(__dirname, '..', n), 'utf8');

const SITE = 'https://guideherd.ai';
const IMAGE = SITE + '/assets/social-card.png';

// file -> the clean URL that is authoritative for it.
const ROUTES = {
  'index.html': '/',
  'platform.html': '/platform',
  'solutions.html': '/solutions',
  'how-it-works.html': '/how-it-works',
  'academy.html': '/academy',
  'resources.html': '/resources',
  'company.html': '/company',
  'lets-talk.html': '/lets-talk',
  'privacy.html': '/privacy',
  'terms.html': '/terms',
  'trust.html': '/trust',
  'status/index.html': '/status/',
  '404.html': '/404',
};

const meta = (html, attr, name) => {
  const re = new RegExp('<meta ' + attr + '="' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    + '" content="([^"]*)">');
  const m = html.match(re);
  return m ? m[1] : null;
};

test('every current page declares the clean URL as canonical', () => {
  for (const [name, route] of Object.entries(ROUTES)) {
    const html = page(name);
    const m = html.match(/<link rel="canonical" href="([^"]+)">/g) || [];
    assert.equal(m.length, 1, name + ' must carry exactly one canonical link');
    assert.match(html, new RegExp('<link rel="canonical" href="' + SITE + route.replace(/\//g, '\\/') + '">'),
      name + ' must point its canonical at ' + SITE + route
      + ' — the .html address 308s to it, so the clean URL is the authoritative one');
  }
});

test('every current page carries the full Open Graph set', () => {
  const required = ['og:site_name', 'og:type', 'og:url', 'og:title', 'og:description', 'og:image'];
  for (const [name, route] of Object.entries(ROUTES)) {
    const html = page(name);
    for (const prop of required) {
      const v = meta(html, 'property', prop);
      assert.ok(v && v.length > 0, name + ' is missing ' + prop);
    }
    assert.equal(meta(html, 'property', 'og:url'), SITE + route,
      name + ': og:url and the canonical must name the same address');
    assert.equal(meta(html, 'property', 'og:site_name'), 'GuideHerd');
    assert.equal(meta(html, 'property', 'og:image'), IMAGE);
  }
});

test('the share image is same-origin and absolute', () => {
  // The /status/* CSP is `img-src 'self' data:`, so a third-party image host
  // would be blocked on that page specifically. Absolute because crawlers do
  // not resolve relative og:image reliably.
  for (const name of Object.keys(ROUTES)) {
    const v = meta(page(name), 'property', 'og:image');
    assert.ok(v.startsWith(SITE + '/'), name + ": og:image must be absolute and same-origin");
  }
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'assets', 'social-card.png')),
    'the referenced share image must exist in the repository');
  const png = fs.readFileSync(path.join(__dirname, '..', 'assets', 'social-card.png'));
  assert.equal(png.readUInt32BE(16), 1200, 'share image width');
  assert.equal(png.readUInt32BE(20), 630, 'share image height');
});

test('every current page carries a large-image Twitter Card', () => {
  for (const name of Object.keys(ROUTES)) {
    const html = page(name);
    assert.equal(meta(html, 'name', 'twitter:card'), 'summary_large_image', name);
    for (const n of ['twitter:title', 'twitter:description', 'twitter:image']) {
      assert.ok(meta(html, 'name', n), name + ' is missing ' + n);
    }
  }
});

test('descriptions are distinct — a shared link must say what THAT page is', () => {
  const seen = new Map();
  for (const name of Object.keys(ROUTES)) {
    const html = page(name);
    const d = meta(html, 'name', 'description');
    assert.ok(d && d.length >= 40, name + ' needs a substantive meta description');
    assert.ok(!seen.has(d), name + ' repeats the description already used by ' + seen.get(d));
    seen.set(d, name);
    assert.equal(meta(html, 'property', 'og:description'), d,
      name + ': og:description must match the meta description, or a share card and a '
      + 'search result describe the same page differently');
  }
});

test('the error page is excluded from indexing, exactly once', () => {
  // A 404 that is indexable competes with real pages for its own query. The
  // page already carried its own noindex; adding a second directive here
  // would leave two robots tags on one page for a crawler to reconcile, so
  // the count is asserted, not just the presence.
  const html = page('404.html');
  const tags = html.match(/<meta name="robots" content="[^"]*">/g) || [];
  assert.equal(tags.length, 1, '404.html must carry exactly one robots directive, not two');
  assert.match(meta(html, 'name', 'robots'), /noindex/);
  for (const name of Object.keys(ROUTES)) {
    if (name === '404.html') continue;
    assert.equal(meta(page(name), 'name', 'robots'), null,
      name + ' must not carry a robots meta — indexing posture for real pages belongs in '
      + 'robots.txt and the sitemap, not scattered across page heads');
  }
});

test('the superseded pages are deliberately left without canonicals (#352 decides them)', () => {
  // Giving a superseded page a self-canonical asserts it is authoritative;
  // pointing it at a redesigned page decides the retirement question. Neither
  // is this issue's to make, so the absence is the deliberate state and is
  // pinned so it cannot be filled in by habit.
  for (const name of ['about.html', 'approach.html', 'services.html', 'training.html']) {
    assert.doesNotMatch(page(name), /<link rel="canonical"/,
      name + ' is superseded; whether it is canonical, redirected, or removed is #352');
  }
});
