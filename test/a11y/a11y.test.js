'use strict';
// The marketing site's accessibility gate (#355).
//
// The application has had a WCAG 2.2 AA suite in its required CI gate for
// months. The public site — the first thing a customer, a reseller, or a
// procurement reviewer touches — had none. Spot checks during the redesign
// found real defects (nav unreachable at <=414px, a 16px tap target, a
// missing lang attribute), which is the argument for measuring rather than
// assuming.
//
// This audits the BUILD OUTPUT, not the working tree, so it tests what ships.
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

// The waiver this suite shipped with (#355) is gone, along with
// known-issues.json and the two tests that policed it. It carried exactly two
// rules — colour contrast and one unfocusable scrollable region — and #358
// emptied it. The gate now simply requires zero.
test('every shipped page is free of serious and critical violations', async (t) => {
  const unexpected = [];
  const moderate = [];
  for (const page of (await import('./harness.mjs')).PAGES) {
    for (const width of (await import('./harness.mjs')).WIDTHS) {
      const { results, unsettled, pageErrors } = await H.auditPage(browser, server.origin, page, width);

      assert.equal(unsettled, 0,
        `${page} @${width}px still had ${unsettled} element(s) mid-reveal when axe ran — the audit `
        + 'would be measuring a state no user sees (#347)');
      assert.deepEqual(pageErrors, [], `${page} @${width}px threw: ${pageErrors.join(' | ')}`);

      for (const v of H.flatten(results, ['critical', 'serious'])) {
        unexpected.push(`${page} @${width}px  ${v.impact} ${v.id}  ${v.target}\n      ${v.summary}`);
      }
      for (const v of H.flatten(results, ['moderate', 'minor'])) {
        moderate.push(`${page} @${width}px  ${v.impact} ${v.id}  ${v.target}`);
      }
    }
  }
  // Reported, not enforced — same posture as the application's suite.
  if (moderate.length) t.diagnostic(`moderate/minor (reported, not failing): ${moderate.length}\n  ` + moderate.slice(0, 20).join('\n  '));
  assert.deepEqual(unexpected, [],
    `${unexpected.length} serious/critical violation(s):\n    ` + unexpected.join('\n    '));
});
