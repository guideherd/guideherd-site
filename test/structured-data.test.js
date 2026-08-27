'use strict';
// Organization and WebSite structured data (#356).
//
// The temptation with structured data is Product/Offer markup, because it is
// what produces rich results. GuideHerd has no public price and no review
// corpus, so marking either up would be a claim the site cannot support —
// the same failure mode #294 and #332 exist to stop, expressed in JSON
// instead of prose. Most of this file is therefore about what must NOT
// appear.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (n) => fs.readFileSync(path.join(__dirname, '..', n), 'utf8');

const SITE = 'https://guideherd.ai';
const HOME = read('index.html');

const blocks = (html) =>
  [...html.matchAll(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g)]
    .map((m) => m[1]);

const graph = () => {
  const b = blocks(HOME);
  assert.equal(b.length, 1, 'the homepage carries exactly one JSON-LD block');
  return JSON.parse(b[0]);
};

const node = (type) => {
  const n = graph()['@graph'].find((x) => x['@type'] === type);
  assert.ok(n, 'the graph contains a ' + type + ' node');
  return n;
};

test('the homepage carries parseable JSON-LD', () => {
  // Malformed JSON-LD is ignored silently by every consumer, so parsing it
  // out of the shipped file is the only way to know it works.
  const g = graph();
  assert.equal(g['@context'], 'https://schema.org');
  assert.deepEqual(g['@graph'].map((n) => n['@type']), ['Organization', 'WebSite']);
});

test('the Organization states only what can be checked', () => {
  const org = node('Organization');
  assert.equal(org.name, 'GuideHerd');
  // Owner-confirmed 2026-08-22, and the same string the site footers carry.
  assert.equal(org.legalName, 'GuideHerd LLC');
  assert.equal(org.url, SITE);
  assert.equal(org.description, HOME.match(/<meta name="description" content="(.*?)">/s)[1],
    'the description must be the page’s own, so the two cannot drift apart');
  assert.equal(org.logo.url, SITE + '/assets/icons/icon-512.png');
  const png = fs.readFileSync(path.join(__dirname, '..', 'assets', 'icons', 'icon-512.png'));
  assert.equal(png.readUInt32BE(16), org.logo.width, 'declared logo width must match the file');
  assert.equal(png.readUInt32BE(20), org.logo.height);
});

test('sameAs lists only properties GuideHerd controls', () => {
  const org = node('Organization');
  // sameAs asserts "this is also us". A wrong entry hands GuideHerd's entity
  // identity to something it does not own.
  assert.deepEqual(org.sameAs, ['https://app.guideherd.ai']);
  for (const u of org.sameAs) {
    assert.match(u, /^https:\/\/[a-z-]+\.guideherd\.ai$/,
      u + ' is not a guideherd.ai property — sameAs is not a links page');
  }
});

test('the WebSite is bound to the Organization and claims no search it does not have', () => {
  const site = node('WebSite');
  assert.equal(site.url, SITE);
  assert.equal(site.publisher['@id'], node('Organization')['@id'],
    'the site must name its publisher, or nothing connects the two nodes');
  assert.ok(!('potentialAction' in site),
    'there is no site search, so a SearchAction would advertise a feature that does not exist');
});

test('no commerce, rating, or review markup anywhere on the site', () => {
  const REFUSED = ['Product', 'Offer', 'AggregateOffer', 'AggregateRating', 'Review', 'Rating'];
  for (const name of ['index.html', 'platform.html', 'solutions.html',
                      'how-it-works.html', 'resources.html', 'company.html', 'lets-talk.html',
                      'privacy.html', 'terms.html', 'trust.html', '404.html', 'status/index.html']) {
    for (const b of blocks(read(name))) {
      for (const type of REFUSED) {
        assert.ok(!new RegExp('"@type"\\s*:\\s*"' + type + '"').test(b),
          name + ' declares ' + type + ' structured data. GuideHerd publishes no price and has '
          + 'no review corpus, so this asserts something the site cannot support — the same '
          + 'failure mode test/claims.test.js exists to prevent.');
      }
    }
  }
});

test('no invented company facts', () => {
  const org = node('Organization');
  // Each of these is a field a template would happily fill in, and none of
  // them is knowable from anything in this repository.
  for (const field of ['foundingDate', 'numberOfEmployees', 'address', 'telephone',
                       'taxID', 'vatID', 'award', 'slogan']) {
    assert.ok(!(field in org),
      'Organization.' + field + ' is not knowable from this repository — leave it out rather '
      + 'than guess. If it becomes known, add it with the source recorded.');
  }
});

test('the contact address is not republished in machine-readable form', () => {
  // Cloudflare obfuscates hello@guideherd.ai at the edge on every page that
  // shows it — verified live, 3 occurrences rewritten to /cdn-cgi/l/
  // email-protection. Putting the plain address in JSON-LD would hand
  // harvesters exactly what that obfuscation exists to withhold.
  const b = blocks(HOME).join(' ');
  assert.doesNotMatch(b, /@guideherd\.ai/,
    'the JSON-LD must not carry a plain email address: the edge deliberately obfuscates it '
    + 'everywhere else, and structured data is the easiest thing on the page to scrape');
});

test('only the homepage carries entity markup', () => {
  // Repeating Organization on every page multiplies the entity rather than
  // reinforcing it, and gives fourteen places for it to drift.
  for (const name of ['platform.html', 'company.html', 'privacy.html',
                      'terms.html', 'trust.html', 'status/index.html', '404.html']) {
    assert.equal(blocks(read(name)).length, 0,
      name + ' carries JSON-LD. Entity markup belongs on the homepage alone, or the same '
      + 'organisation is asserted from fourteen places that can disagree.');
  }
});
