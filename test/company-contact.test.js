'use strict';
// The company phone number (GitLab #441).
//
// The site is static HTML with no shared template, so the one official
// number is written where a business phone belongs — the contact page, the
// homepage contact section, and the Organization record — and THIS file is
// what keeps those renderings identical. It also refuses what must never
// appear beside a company number: another phone-shaped string (a customer's,
// a person's), a founder's name, or the vendors behind the line.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (n) => fs.readFileSync(path.join(__dirname, '..', n), 'utf8');

const DISPLAY = '938.200.9202';
const TEL = 'tel:+19382009202';
const PUBLIC_PAGES = [...fs.readdirSync(path.join(__dirname, '..')).filter((f) => f.endsWith('.html')), 'status/index.html'];
const PHONE_SURFACES = ['lets-talk.html', 'index.html'];

test('the contact page and the homepage carry the official number as a tel: link', () => {
  for (const name of PHONE_SURFACES) {
    const html = read(name);
    const links = [...html.matchAll(/<a href="(tel:[^"]+)"[^>]*>([^<]+)<\/a>/g)];
    assert.ok(links.length >= 1, name + ' carries a tel: link');
    for (const [, href, text] of links) {
      assert.equal(href, TEL, name + ': the tel: URI is the official number in E.164');
      assert.equal(text, DISPLAY, name + ': the visible number is the official display form');
    }
    // Accessible name states what the link does and contains the visible text.
    assert.match(html, /aria-label="Call GuideHerd at 938\.200\.9202"/, name + ': the phone link names its action');
  }
});

test('the Clara wording is calm and accurate — no overpromising, no implementation', () => {
  const talk = read('lets-talk.html');
  assert.match(talk, /Clara, GuideHerd&rsquo;s AI receptionist, can answer general questions or make sure the right person on the GuideHerd team gets your message\./,
    'the contact page carries the approved sentence, verbatim');
  for (const name of PHONE_SURFACES) {
    const html = read(name);
    assert.doesNotMatch(html, /24\/7|around the clock|transfer you|guaranteed|immediate call ?back|within minutes/i,
      name + ': the phone copy must not promise availability, transfer, or response times');
    assert.doesNotMatch(html, /ElevenLabs|Twilio|agent[ _-]?id|webhook/i,
      name + ': the phone copy must not expose the implementation');
  }
});

test('no other phone-shaped number and no personal identity appears on any public page', () => {
  const phoneShaped = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g;
  for (const name of PUBLIC_PAGES) {
    const html = read(name);
    for (const m of html.match(phoneShaped) || []) {
      const digits = m.replace(/\D/g, '');
      assert.ok(digits === '9382009202' || digits === '19382009202',
        name + ' shows a phone-shaped number that is not the company line: "' + m + '"');
    }
    assert.doesNotMatch(html, /David Jones|Ryan Scoggins|\bfounder\b|\bco-founder\b/i,
      name + ': public company content names no person');
  }
});
