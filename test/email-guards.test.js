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

// GitLab #904 (stale assertion rewritten, intent kept): the homepage's contact CTA is now
// "Book a demo" to the contact page — no mailto, so nothing for Cloudflare to rewrite, and no
// <x-dc> re-mount (the dc runtime is retired from the homepage). The intent — the homepage's
// contact CTA can never dead-end — is pinned on the CTA it actually has; any mailto that
// returns to the page is still bound by the guard test above.
test('the homepage contact CTA reaches the contact page', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const ctas = [...html.matchAll(/<a href="([^"]+)"[^>]*>\s*Book a demo/g)].map((m) => m[1]);
  assert.ok(ctas.length >= 3, 'index.html: Book a demo appears in the nav, the hero and the close (' + ctas.length + ')');
  for (const href of ctas) assert.equal(href, '/lets-talk', 'index.html: every Book a demo reaches /lets-talk');
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'lets-talk.html')), 'the contact page ships');
});
