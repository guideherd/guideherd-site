'use strict';
// Email-obfuscation guards (#374): every mailto anchor on a shipped page
// must sit inside <!--email_off-->…<!--email_on-->. Cloudflare's Email
// Address Obfuscation rewrites unguarded mailto hrefs at the edge to
// /cdn-cgi/l/email-protection#…, and on runtime-mounted pages the
// dc-runtime re-mounts the still-encoded template — so "Contact us for a
// demo" dead-ended on Cloudflare's Email Protection page (observed on
// production, 2026-08-23). The guard tells Cloudflare to leave the anchor
// alone; this test makes sure the next contact link added ships with it.
// JavaScript-built mailtos (lets-talk's form) are not rewritten by
// obfuscation and deliberately do not match the HTML-attribute pattern.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ALL_PUBLIC = [...fs.readdirSync(path.join(__dirname, '..'))
  .filter((f) => f.endsWith('.html')), 'status/index.html'];

test('every mailto anchor is wrapped in email_off guards on every shipped page', () => {
  for (const name of ALL_PUBLIC) {
    const html = fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
    for (const match of html.matchAll(/href="mailto:/g)) {
      const before = html.slice(0, match.index);
      const lastOff = before.lastIndexOf('<!--email_off-->');
      const lastOn = before.lastIndexOf('<!--email_on-->');
      assert.ok(lastOff !== -1 && lastOff > lastOn,
        `${name}: a mailto anchor near offset ${match.index} is not inside `
        + '<!--email_off-->…<!--email_on--> — Cloudflare will rewrite it to '
        + 'the /cdn-cgi/l/email-protection dead end (#374)');
    }
  }
});

test('the homepage contact CTA is a guarded mailto', () => {
  // The specific production failure: the CTA lives inside <x-dc>, whose
  // re-mount serves whatever href the template carries. Pin both the
  // guard and the intact address so a future edit cannot trade one for
  // the other.
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /<!--email_off--><a data-magnetic href="mailto:hello@guideherd\.ai"/,
    'index.html: the Contact us CTA must keep its email_off guard (#374)');
});
