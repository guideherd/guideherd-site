'use strict';
// Keyboard operability and motion preference (#355).
//
// axe cannot answer these. It does not press Tab, it does not know whether a
// focus ring is visible against the ground behind it, and it cannot tell
// whether an entrance animation respects a user's motion preference. Each of
// these was in the issue's "unmeasured" list.
const test = require('node:test');
const assert = require('node:assert/strict');

let H, server, browser;
test.before(async () => {
  H = await import('./harness.mjs');
  server = await H.serveBuiltSite();
  browser = await H.launch();
});
test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.close();
});

const NAV_PAGES = ['index.html', 'platform.html', 'privacy.html', 'lets-talk.html'];

test('every nav destination and the CTA are reachable by Tab alone', async () => {
  for (const page of NAV_PAGES) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const tab = await ctx.newPage();
    await tab.goto(`${server.origin}/${page}`, { waitUntil: 'networkidle' });
    await tab.evaluate(() => document.fonts.ready);

    const navHrefs = await tab.evaluate(() =>
      [...document.querySelectorAll('nav a[href]')].map((a) => a.getAttribute('href')));
    // Pages omit their own CTA from the nav, so lets-talk carries 7 where the
    // rest carry 8. The count is a sanity floor; the real assertion is that
    // whatever IS in the nav can be reached.
    assert.ok(navHrefs.length >= 7, `${page}: expected the nav, saw ${navHrefs.length}`);

    // Walk the document with Tab and collect what actually receives focus.
    const reached = new Set();
    for (let i = 0; i < 40; i++) {
      await tab.keyboard.press('Tab');
      const href = await tab.evaluate(() => {
        const el = document.activeElement;
        return el && el.tagName === 'A' ? el.getAttribute('href') : null;
      });
      if (href) reached.add(href);
      if (navHrefs.every((h) => reached.has(h))) break;
    }
    for (const href of navHrefs) {
      assert.ok(reached.has(href),
        `${page}: ${href} is in the nav but never received focus while tabbing — a keyboard user `
        + 'cannot reach it');
    }
    await ctx.close();
  }
});

test('focus is always visible, never suppressed', async () => {
  for (const page of NAV_PAGES) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const tab = await ctx.newPage();
    await tab.goto(`${server.origin}/${page}`, { waitUntil: 'networkidle' });
    await tab.evaluate(() => document.fonts.ready);
    for (let i = 0; i < 12; i++) {
      await tab.keyboard.press('Tab');
      const r = await tab.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        const outlineOff = cs.outlineStyle === 'none' || cs.outlineWidth === '0px';
        return {
          tag: el.tagName,
          text: (el.textContent || '').trim().slice(0, 24),
          // A visible indicator can come from outline, box-shadow, border or
          // a background change — suppressing outline is only a defect when
          // nothing replaces it.
          hasIndicator: !outlineOff || cs.boxShadow !== 'none'
            || cs.textDecorationLine !== 'none' || cs.borderBottomWidth !== '0px',
        };
      });
      if (!r) continue;
      assert.ok(r.hasIndicator,
        `${page}: <${r.tag}> "${r.text}" takes focus with no visible indicator — outline is `
        + 'suppressed and nothing replaces it, so a keyboard user cannot see where they are');
    }
    await ctx.close();
  }
});

test('the Let’s Talk form is operable and every input is programmatically labelled', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const tab = await ctx.newPage();
  await tab.goto(`${server.origin}/lets-talk.html`, { waitUntil: 'networkidle' });
  await tab.evaluate(() => document.fonts.ready);

  const fields = await tab.evaluate(() =>
    [...document.querySelectorAll('input, textarea, select')].map((el) => {
      const byFor = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null;
      return {
        id: el.id || '(none)',
        // A placeholder is NOT a label: it disappears on input and is not
        // reliably announced.
        named: !!(byFor || el.closest('label') || el.getAttribute('aria-label')
                  || el.getAttribute('aria-labelledby')),
        placeholderOnly: !byFor && !el.closest('label') && !el.getAttribute('aria-label')
                  && !el.getAttribute('aria-labelledby') && !!el.getAttribute('placeholder'),
      };
    }));
  assert.ok(fields.length >= 4, `expected the contact fields, saw ${fields.length}`);
  for (const f of fields) {
    assert.ok(f.named, `lets-talk: input #${f.id} has no label, aria-label, or aria-labelledby`
      + (f.placeholderOnly ? ' — a placeholder is not a label; it vanishes as soon as you type' : ''));
  }

  // And it can actually be filled and submitted from the keyboard.
  await tab.focus('#lt-name');
  await tab.keyboard.type('Keyboard User');
  await tab.keyboard.press('Tab');
  await tab.keyboard.type('Example Firm');
  const typed = await tab.evaluate(() => ({
    name: document.querySelector('#lt-name').value,
    org: document.querySelector('#lt-org').value,
  }));
  assert.equal(typed.name, 'Keyboard User');
  assert.equal(typed.org, 'Example Firm', 'Tab must move to the next field in document order');
  await ctx.close();
});

test('prefers-reduced-motion is honoured by the entrance animations', async () => {
  for (const reduced of [false, true]) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 },
      reducedMotion: reduced ? 'reduce' : 'no-preference' });
    const tab = await ctx.newPage();
    await tab.goto(`${server.origin}/index.html`, { waitUntil: 'domcontentloaded' });
    // The stagger applies its transition to children progressively, so a
    // single element read early says nothing — measured on this site, one
    // element reports 0s at 250ms while five siblings already animate. The
    // assertion is over the whole set, after the stagger has finished
    // handing transitions out.
    await tab.waitForTimeout(1400);
    const r = await tab.evaluate(() => {
      const els = [...document.querySelectorAll('[data-reveal], [data-stagger]')];
      const dur = (el) => Math.max(...getComputedStyle(el).transitionDuration
        .split(',').map((d) => parseFloat(d) * 1000));
      return {
        matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
        total: els.length,
        animating: els.filter((el) => dur(el) > 100).length,
        faded: els.filter((el) => parseFloat(getComputedStyle(el).opacity) < 0.99).length,
      };
    });
    assert.equal(r.matches, reduced, 'the emulated preference did not reach the page');
    assert.ok(r.total >= 5, `expected the reveal elements, saw ${r.total}`);
    if (reduced) {
      assert.equal(r.animating, 0,
        `${r.animating} of ${r.total} elements still carry a >100ms entrance transition under `
        + 'prefers-reduced-motion: reduce');
      assert.equal(r.faded, 0,
        'content must be present immediately under reduced motion, not faded in — a user who '
        + 'asked for no motion should not have to wait for content to appear');
    } else {
      assert.ok(r.animating > 0,
        'no element animates even for a user who expressed NO preference — if this fails, '
        + 'reduced motion is being applied to everyone and the assertion above proves nothing');
    }
    await ctx.close();
  }
});
