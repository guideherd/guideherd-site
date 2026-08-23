'use strict';
// WebKit scroll stability (#371, third round).
//
// The bug this pins: the reveal/parallax animations re-serialize style
// attributes every frame, and the mobile gutter rule matched the bare
// substring "52px"/"56px" — so an animated transform value like
// translateY(-15.652px) made the rule flap ON for a single frame, 20px of
// padding appeared, the screenshot card narrowed 40px, its aspect box lost
// ~25px of height, and everything below bounced (production trace on
// /platform at iPhone width: 218 → 193 → 218). Frame-timing-dependent, so
// WebKit surfaced it where coarse Chromium sampling missed it — hence a
// gate on the engine every iPhone actually runs.
//
// Runs under real WebKit via playwright-core. CI installs the browser with
// `npx playwright install webkit`; locally, skip is loud if the binary is
// absent rather than a silent pass.
const test = require('node:test');
const assert = require('node:assert/strict');

let H, server, webkit, browser;

test.before(async () => {
  H = await import('../a11y/harness.mjs');
  ({ webkit } = await import('playwright-core'));
  server = await H.serveBuiltSite();
  try {
    browser = await webkit.launch();
  } catch (err) {
    browser = null;
    // Loud skip: the suite is pointless without the engine under test.
    console.error(`webkit unavailable (${String(err.message).split('\n')[0]}); install with: npx playwright install webkit`);
  }
});
test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.close();
});

// The pages that embed the product screenshot — the element that flickered.
const PAGES = ['platform.html', 'index.html'];

test('WebKit: the product-screenshot box is scroll-stable — no transient collapse, nothing below it bounces', { timeout: 300000 }, async (t) => {
  if (!browser) { t.skip('webkit browser not installed'); return; }
  for (const page of PAGES) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const tab = await ctx.newPage();
    await tab.goto(`${server.origin}/${page}`, { waitUntil: 'networkidle' });
    await tab.waitForFunction(
      () => !document.querySelector('x-dc') || !!document.querySelector('#dc-root'),
      undefined, { timeout: 15000 });
    await tab.waitForTimeout(500);

    const result = await tab.evaluate(async () => {
      const img = document.querySelector('img[src*="ops-overview"]');
      if (!img) return { missing: true };
      // LAYOUT measurements only (offset* chain): the reveal and parallax
      // effects legitimately move things with transforms — the defect class
      // is layout flapping underneath them (#371: a selector matching an
      // animated style value slammed padding on for a single frame).
      const docTop = (el) => { let t = 0; for (let n = el; n; n = n.offsetParent) t += n.offsetTop; return t; };
      const startH = img.offsetHeight;
      const below = [...document.querySelectorAll('h2,p')]
        .filter((el) => docTop(el) > docTop(img) + 100)
        .slice(0, 6);
      const from = Math.max(0, docTop(img) - 844 * 2.5);
      const to = docTop(img) + 844;
      const anomalies = [];
      // Two passes at fine steps: the failure was a single-frame race, so
      // coverage comes from frame count, not luck.
      for (let pass = 0; pass < 2; pass++) {
        const baseTop = new Map(below.map((el) => [el, docTop(el)]));
        for (let y = from; y <= to; y += 6) {
          scrollTo(0, y);
          await new Promise((r) => requestAnimationFrame(r));
          const h = img.offsetHeight;
          if (Math.abs(h - startH) > 2) anomalies.push(`img height ${startH} -> ${h} at scroll ${Math.round(y)}`);
          for (const el of below) {
            const err = docTop(el) - baseTop.get(el);
            if (Math.abs(err) > 12) {
              anomalies.push(`"${(el.textContent || '').trim().slice(0, 28)}" layout-shifted ${Math.round(err)}px at scroll ${Math.round(y)}`);
            }
          }
        }
        scrollTo(0, 0);
        await new Promise((r) => requestAnimationFrame(r));
      }
      return { startH, anomalies: [...new Set(anomalies)].slice(0, 10) };
    });

    assert.equal(result.missing, undefined, `${page}: product screenshot img not found`);
    assert.ok(result.startH > 100, `${page}: image box unexpectedly small (${result.startH}px)`);
    assert.deepEqual(result.anomalies, [],
      `${page}: scroll instability under WebKit:\n    ` + (result.anomalies || []).join('\n    '));
    await ctx.close();
  }
});
