'use strict';
// Responsive-layout regression gate (#370).
//
// The a11y gate proves contrast and semantics; it cannot see two pieces of
// text painted through one another — axe has no geometry. This suite audits
// the BUILD OUTPUT in a real browser at representative widths and fails on
// the defect classes that shipped in the redesign (measured before the fix:
// 88 page/width combinations):
//
//   - meaningful text overlapping other meaningful text or controls,
//     sampled while scrolling (the transparent-nav and sticky-spine
//     classes only appear mid-scroll);
//   - meaningful content clipped beyond the viewport edge;
//   - document-level horizontal overflow;
//   - a navigation that is not actually usable at phone widths.
//
// What deliberately does NOT fail:
//   - text scrolling beneath a surface that covers it (the nav's scrim, the
//     legacy pages' opaque sticky header, cards) — layering with a backing
//     is design, layering without one is the defect. The backing test looks
//     at real computed backgrounds, including ::before/::after surfaces.
//   - adjacent lines of one static composition (tight display type makes
//     range rects of neighbouring lines touch); absolutely-positioned
//     siblings — the stacked-carousel class — are still checked.
//
// Deterministic on purpose: reducedMotion:'reduce', the same choice the
// a11y harness measured and documented — and itself one of the user states
// this gate exists to protect (the stacked-carousel defect was worst there).
const test = require('node:test');
const assert = require('node:assert/strict');

const WIDTHS = [320, 375, 390, 414, 768, 1280];
const PHONE_WIDTHS = [320, 390];

let H, server, browser;
test.before(async () => {
  H = await import('../a11y/harness.mjs');
  server = await H.serveBuiltSite();
  browser = await H.launch();
});
test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.close();
});

/** Runs in the page: collect layout violations at the current scroll. */
const AUDIT_FN = `(() => {
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const label = (el) => '<' + el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + '> "'
    + (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 40) + '"';

  const alphaOf = (color) => {
    const m = /rgba?\\(([^)]+)\\)/.exec(color || '');
    if (!m) return 0;
    const parts = m[1].split(',');
    return parts.length === 4 ? parseFloat(parts[3]) : 1;
  };
  // A node (or its ::before/::after) provides an opaque-enough surface over
  // the point: a solid-ish background, or a translucent one made solid in
  // practice by a backdrop filter.
  const surfaceAt = (node, x, y) => {
    for (let el = node; el && el !== document.documentElement; el = el.parentElement) {
      const r = el.getBoundingClientRect();
      const covers = r.left <= x && r.right >= x && r.top <= y && r.bottom >= y;
      if (!covers) continue;
      const cs = getComputedStyle(el);
      const a = alphaOf(cs.backgroundColor);
      const filtered = cs.backdropFilter && cs.backdropFilter !== 'none';
      if (a >= 0.5 || (filtered && a >= 0.3) || (filtered && cs.backgroundImage !== 'none')) return true;
      for (const pseudo of ['::before', '::after']) {
        const ps = getComputedStyle(el, pseudo);
        if (ps.content === 'none') continue;
        const pa = alphaOf(ps.backgroundColor);
        const pf = ps.backdropFilter && ps.backdropFilter !== 'none';
        if (pa >= 0.5 || (pf && pa >= 0.3) || (pf && ps.backgroundImage !== 'none')) return true;
      }
    }
    return false;
  };

  const inScrollable = (el) => {
    for (let n = el.parentElement; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (/(auto|scroll)/.test(cs.overflowX) && n.scrollWidth > n.clientWidth + 1) return true;
    }
    return false;
  };

  // Meaningful text: elements with direct text, actually visible.
  // visibility is inherited, so a hidden panel's links drop out here.
  const els = [...document.querySelectorAll('h1,h2,h3,h4,p,a,button,li,span,td,th,label,summary')]
    .filter((el) => {
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 2)) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) return false;
      const r = el.getBoundingClientRect();
      return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < vh;
    });
  const rects = els.map((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return { el, r: range.getBoundingClientRect(), cs: getComputedStyle(el) };
  });

  const out = { overflow: null, offscreen: [], overlaps: [] };
  if (document.documentElement.scrollWidth > vw + 1) {
    out.overflow = document.documentElement.scrollWidth + '>' + vw;
  }
  for (const { el, r } of rects) {
    if ((r.right > vw + 8 || r.left < -8) && !inScrollable(el)) {
      out.offscreen.push(label(el) + ' [' + Math.round(r.left) + '..' + Math.round(r.right) + ']');
    }
  }
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const A = rects[i], B = rects[j];
      if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
      // Adjacent lines of one static composition may touch; absolutely
      // positioned siblings (the stacked-carousel class) stay checked.
      if (A.el.parentElement === B.el.parentElement
        && A.cs.position === 'static' && B.cs.position === 'static') continue;
      const x = Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left);
      const y = Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top);
      if (x <= 8 || y <= 8) continue;
      const smaller = Math.min(A.r.width * A.r.height, B.r.width * B.r.height);
      if (smaller <= 0 || (x * y) / smaller < 0.25) continue;
      const cx = Math.max(A.r.left, B.r.left) + x / 2;
      const cy = Math.max(A.r.top, B.r.top) + y / 2;
      if (cx < 0 || cy < 0 || cx >= vw || cy >= vh) continue;
      const hit = document.elementFromPoint(cx, cy);
      if (!hit) continue;
      const top = (A.el.contains(hit) || hit.contains(A.el)) ? A
        : (B.el.contains(hit) || hit.contains(B.el)) ? B : null;
      if (!top) {
        // Neither text is on top — both sit under whatever was hit. A
        // surface there means both are legitimately covered; anything
        // else is a transparent pile-up.
        if (surfaceAt(hit, cx, cy)) continue;
        out.overlaps.push(label(A.el) + ' x ' + label(B.el) + ' (both under ' + label(hit) + ')');
        continue;
      }
      // The upper text is legitimate only if something between it and the
      // lower text provides a surface at the point.
      if (surfaceAt(top.el, cx, cy)) continue;
      out.overlaps.push(label(A.el) + ' x ' + label(B.el));
    }
  }
  return out;
})()`;

/**
 * The page runtime re-mounts <x-dc> content into #dc-root after load; until
 * that finishes the DOM is a half-styled intermediate no user ever sees.
 * Measuring during that window is what a cold CI runner does with a fixed
 * settle wait — so wait for the mount itself. Pages without the runtime
 * (status, legacy, 404) have no <x-dc> and pass immediately; a page whose
 * mount never completes FAILS here, which is itself a defect worth failing.
 */
async function settle(tab) {
  await tab.waitForFunction(
    () => !document.querySelector('x-dc') || !!document.querySelector('#dc-root'),
    undefined, { timeout: 15000 });
  await tab.evaluate(() => document.fonts.ready);
  await tab.waitForTimeout(300);
}

async function auditPage(page, width) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
  const tab = await ctx.newPage();
  const pageErrors = [];
  tab.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 160)));
  await tab.goto(`${server.origin}/${page}`, { waitUntil: 'networkidle' });
  await settle(tab);

  const found = [];
  const seen = new Set();
  const height = await tab.evaluate(() => document.documentElement.scrollHeight);
  const step = Math.floor(844 * 0.9);
  const steps = Math.min(40, Math.ceil(height / step));
  for (let s = 0; s <= steps; s++) {
    await tab.evaluate((y) => scrollTo(0, y), s * step);
    await tab.waitForTimeout(60);
    const r = await tab.evaluate(AUDIT_FN);
    const at = ` @scroll ${s * step}`;
    if (r.overflow) { const k = 'overflow'; if (!seen.has(k)) { seen.add(k); found.push(`horizontal overflow ${r.overflow}`); } }
    for (const o of r.offscreen) { if (!seen.has(o)) { seen.add(o); found.push(`offscreen: ${o}${at}`); } }
    for (const o of r.overlaps) { if (!seen.has(o)) { seen.add(o); found.push(`overlap: ${o}${at}`); } }
  }
  await ctx.close();
  return { found, pageErrors };
}

test('no page paints meaningful text through other text, off the screen, or past the body at any width', async (t) => {
  const violations = [];
  for (const page of H.PAGES) {
    for (const width of WIDTHS) {
      const { found, pageErrors } = await auditPage(page, width);
      assert.deepEqual(pageErrors, [], `${page} @${width}px threw: ${pageErrors.join(' | ')}`);
      for (const f of found) violations.push(`${page} @${width}px  ${f}`);
    }
    t.diagnostic(`${page}: audited at ${WIDTHS.join('/')}px`);
  }
  assert.deepEqual(violations, [],
    `${violations.length} layout violation(s):\n    ` + violations.join('\n    '));
});

test('the mobile navigation is deliberate and fully usable at phone widths', async () => {
  // Pages carrying the redesign nav, and therefore this contract. A page
  // with no [data-nav-toggle] is skipped as a legacy header — this floor
  // keeps that skip from silently absorbing the whole redesign.
  let pagesWithToggle = 0;
  for (const page of H.PAGES) {
    for (const width of PHONE_WIDTHS) {
      const ctx = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
      const tab = await ctx.newPage();
      await tab.goto(`${server.origin}/${page}`, { waitUntil: 'networkidle' });
      await settle(tab);

      const toggle = await tab.evaluate(() => {
        const b = document.querySelector('[data-nav-toggle]');
        if (!b) return null;
        const r = b.getBoundingClientRect();
        const cs = getComputedStyle(b);
        return { w: r.width, h: r.height, visible: cs.display !== 'none' && r.width > 0 };
      });
      // The legacy pages keep their own header pattern (measured sound);
      // this contract binds every page that carries the redesign nav.
      if (toggle === null) { await ctx.close(); continue; }
      pagesWithToggle += 1;
      assert.ok(toggle.visible, `${page} @${width}px: Menu toggle hidden`);
      assert.ok(toggle.w >= 24 && toggle.h >= 24, `${page} @${width}px: Menu toggle below 24px target size`);

      await tab.click('[data-nav-toggle]');
      await tab.waitForTimeout(350);
      const links = await tab.evaluate(() => {
        const vw = document.documentElement.clientWidth, vh = window.innerHeight;
        return [...document.querySelectorAll('[data-nav-links] a')].map((a) => {
          const r = a.getBoundingClientRect();
          const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          const hit = document.elementFromPoint(cx, cy);
          return {
            text: (a.textContent || '').trim(),
            onScreen: r.top >= 0 && r.bottom <= vh && r.left >= 0 && r.right <= vw,
            hittable: !!hit && (hit === a || a.contains(hit)),
            tap: r.height >= 24,
          };
        });
      });
      assert.ok(links.length >= 6, `${page} @${width}px: expected the full link set in the panel, saw ${links.length}`);
      for (const l of links) {
        assert.ok(l.onScreen, `${page} @${width}px: "${l.text}" is outside the viewport in the open menu`);
        assert.ok(l.hittable, `${page} @${width}px: "${l.text}" is not hittable at its own center`);
        assert.ok(l.tap, `${page} @${width}px: "${l.text}" tap target under 24px`);
      }

      await tab.keyboard.press('Escape');
      await tab.waitForTimeout(300);
      const closed = await tab.evaluate(() => {
        const nav = document.querySelector('nav[data-nav]');
        const panel = document.querySelector('[data-nav-links]');
        return { open: nav.classList.contains('gh-open'), vis: getComputedStyle(panel).visibility };
      });
      assert.equal(closed.open, false, `${page} @${width}px: Escape does not close the menu`);
      assert.equal(closed.vis, 'hidden', `${page} @${width}px: closed menu still visible`);
      await ctx.close();
    }
  }
  // 12 redesign pages x 2 widths. Falling below this means pages LOST the
  // mobile nav, not that they grew a better one.
  assert.ok(pagesWithToggle >= 24,
    `only ${pagesWithToggle} page/width combinations carried the mobile nav toggle — expected 24`);
});

test('the desktop navigation still shows every link in the bar at 1280px', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const tab = await ctx.newPage();
  await tab.goto(`${server.origin}/index.html`, { waitUntil: 'networkidle' });
  await settle(tab);
  const state = await tab.evaluate(() => {
    const toggle = document.querySelector('[data-nav-toggle]');
    const links = [...document.querySelectorAll('[data-nav-links] a')].map((a) => {
      const r = a.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { text: (a.textContent || '').trim(), inBar: r.top < 120 && r.width > 0, hittable: !!hit && (hit === a || a.contains(hit)) };
    });
    return { toggleHidden: getComputedStyle(toggle).display === 'none', links };
  });
  assert.ok(state.toggleHidden, 'the Menu toggle must not appear on desktop');
  assert.ok(state.links.length >= 6);
  for (const l of state.links) {
    assert.ok(l.inBar && l.hittable, `desktop nav link "${l.text}" is not in the bar and hittable`);
  }
  await ctx.close();
});
