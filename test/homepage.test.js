'use strict';
// GitLab #904 — the litigation-first homepage. These pins hold the claims the page makes to
// the product's evidence (owner instructions, DJ 2026-11-07: "do not advertise unimplemented
// functionality as live"), and the design's structure that a copy edit could silently lose.
//
// Evidence behind each claim pin (product repo, main at the time of writing):
//   Clio      creates a matter (under a "GuideHerd Intake" contact that staff reassign to the real
//             client), validated against a Clio trial tenant (rung 3); the client-creating adapter is
//             not yet live-validated (server/integrations/clio/clio-matter-provider.js).
//   Filevine  sign-in and account discovery only; no client or matter write path.
//   Orion     live client search (#831); writes held (standing authorization 4).
//   Lex       live for every customer firm in production since #905 (register entry 38; production
//             deployment:verify reports production-lex=composed at 4e9712e8), on Baseten only.
//   Drafting  off for every customer tenant in production (docs/operations/attorney-drafting.md).
// When any of these changes, change the pin and the page together, with that evidence.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const HOME = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '')
  .replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const VISIBLE = text(HOME);

test('Filevine is shown, and never as writing clients or matters (#904 decision 1)', () => {
  assert.match(VISIBLE, /Filevine coming soon/, 'the Filevine tile says it is coming soon');
  assert.match(VISIBLE, /Filevine · coming soon/, 'and so does the phone chip');
  assert.doesNotMatch(VISIBLE, /Filevine[^.]{0,80}\b(creates?|opens?|writes?)\b/i,
    'no sentence may say GuideHerd creates, opens or writes anything in Filevine');
});

test('Orion is shown as client lookup only (#904 decision 1)', () => {
  assert.match(VISIBLE, /Orion client lookup/, 'the Orion tile names what runs today');
  assert.match(VISIBLE, /Orion · client lookup/, 'and so does the phone chip');
  assert.doesNotMatch(VISIBLE, /Orion[^.]{0,80}\b(creates?|opens?|writes?)\b/i);
});

test('the matter-opening step names no vendor, and does not promise a write every system lacks', () => {
  const step = VISIBLE.slice(VISIBLE.indexOf('The matter opens'), VISIBLE.indexOf('The matter opens') + 400);
  assert.match(step, /your practice-management system/);
  assert.match(step, /or staged for your staff to enter/, 'systems without a write path stage the intake');
  assert.doesNotMatch(step, /\bclient\b/i, 'no system has a validated path that creates the client record');
  assert.doesNotMatch(step, /Clio|Filevine|Orion/, 'step 4 names no vendor (#904 acceptance 5)');
});

test('held capabilities are labelled, and Lex (live since #905) is not', () => {
  const lex = HOME.slice(HOME.indexOf('id="lex"'), HOME.indexOf('id="how"'));
  // #905: Lex is live in production for every customer firm, so its section carries no availability caveat.
  assert.doesNotMatch(text(lex), /coming soon|not yet available/i, 'Lex is available (#905): no coming-soon label');
  assert.match(HOME, /Drafting, coming soon:/, 'drafting is off for customer tenants: its caption says so');
  assert.match(VISIBLE, /Word templates coming soon/, 'the Word templates tile follows drafting');
});

test('the Reception Guide card makes no voice claim and promises no transfer', () => {
  // The #372 rule (claims.test.js) keeps voice claims to the dated /resources entry, and the
  // voice adapter cannot transfer a live call (liveTransfer: false).
  assert.doesNotMatch(VISIBLE, /voice/i, 'the homepage makes no voice claim');
  assert.doesNotMatch(VISIBLE, /put (the caller|them|you) through|transfer/i);
  for (const guide of ['Reception Guide', 'Scheduling Guide', 'Intake Guide']) {
    assert.ok(VISIBLE.includes(guide), 'How a new case comes in names the ' + guide);
  }
});

test('the integrations field carries exactly 11 systems, as tiles and as phone chips', () => {
  assert.equal((HOME.match(/class="gh-tile"/g) || []).length, 11, '11 logo tiles, no empty ones');
  assert.equal((HOME.match(/class="gh-chip"/g) || []).length, 11, '11 chips on a phone');
  assert.doesNotMatch(VISIBLE, /Microsoft sign-in|sign in with Microsoft/i, 'no Microsoft sign-in tile');
  for (const card of ['No migration', 'No firewall changes', 'Nothing overwritten']) {
    assert.ok(VISIBLE.includes(card), 'the ' + card + ' card follows the tiles');
  }
});

test('the product window is an ARIA tablist with one panel per tab', () => {
  const tabs = [...HOME.matchAll(/role="tab"[^>]*id="(tab-[a-z]+)"[^>]*aria-controls="(panel-[a-z]+)"/g)];
  assert.deepEqual(tabs.map((m) => m[1]), ['tab-intake', 'tab-review', 'tab-draft']);
  for (const [, tab, panel] of tabs) {
    assert.match(HOME, new RegExp('role="tabpanel" id="' + panel + '" aria-labelledby="' + tab + '"'));
  }
  for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) assert.ok(HOME.includes("'" + key + "'"), 'tabs handle ' + key);
  const review = HOME.slice(HOME.indexOf('id="panel-review"'), HOME.indexOf('id="panel-draft"'));
  assert.match(review, /Filed to your office server/, 'the filing notice lives inside the Intake review panel only');
  assert.equal(HOME.split('Filed to your office server').length - 1, 1);
});

test('one typeface, self-hosted: Inter Tight, no serif, italic or monospace, no third-party hosts', () => {
  const css = HOME.match(/<style>([\s\S]*?)<\/style>/)[1];
  assert.doesNotMatch(HOME, /Fraunces|Instrument Serif|JetBrains|Georgia|(?<!sans-)serif\b|monospace|font-style:\s*italic|<em>|<i>/,
    'the homepage uses Inter Tight only, with no italics');
  assert.match(css, /'Inter Tight'/);
  const fonts = fs.readFileSync(path.join(ROOT, 'assets', 'fonts.css'), 'utf8');
  for (const w of ['700', '800']) {
    for (const sub of ['latin', 'latin-ext']) {
      const file = 'inter-tight-normal-' + w + '-' + sub + '.woff2';
      assert.ok(fonts.includes('fonts/' + file), 'fonts.css declares ' + file);
      assert.ok(fs.existsSync(path.join(ROOT, 'assets', 'fonts', file)), file + ' ships');
    }
  }
  for (const m of HOME.matchAll(/(?:src|href)="(https?:[^"]+)"/g)) {
    assert.match(m[1], /^https:\/\/(guideherd\.ai|app\.guideherd\.ai|www\.instagram\.com|x\.com|www\.facebook\.com|www\.threads\.com)(\/|$)/,
      'no third-party asset or script host: ' + m[1]);
  }
  for (const m of HOME.matchAll(/<(?:img|script)[^>]+src="([^"]+)"/g)) {
    assert.ok(!/^https?:/.test(m[1]), 'images and scripts load from the site itself: ' + m[1]);
    if (m[1].startsWith('/')) assert.ok(fs.existsSync(path.join(ROOT, m[1])), m[1] + ' exists');
  }
});

test('the Lex screenshot and the single-colour marks switch with the theme', () => {
  for (const pair of [['lex/lex-panel-dark.png', 'lex/lex-panel-light.png'],
    ['integrations/clio-dark.png', 'integrations/clio-light.png'],
    ['integrations/filevine-dark.png', 'integrations/filevine-light.png']]) {
    assert.match(HOME, new RegExp('class="only-dark" src="/images/' + pair[0]));
    assert.match(HOME, new RegExp('class="only-light" src="/images/' + pair[1]));
  }
});
