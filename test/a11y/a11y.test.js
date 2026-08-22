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
const fs = require('node:fs');
const path = require('node:path');

let H, server, browser;
const KNOWN = JSON.parse(fs.readFileSync(path.join(__dirname, 'known-issues.json'), 'utf8'));
const waivedRules = new Set(KNOWN.waived.map((w) => w.rule));
const seenByRule = new Map();

test.before(async () => {
  H = await import('./harness.mjs');
  server = await H.serveBuiltSite();
  browser = await H.launch();
});
test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.close();
});

test('every shipped page is free of unwaived serious and critical violations', async (t) => {
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
        seenByRule.set(v.id, (seenByRule.get(v.id) || 0) + 1);
        if (!waivedRules.has(v.id)) unexpected.push(`${page} @${width}px  ${v.impact} ${v.id}  ${v.target}\n      ${v.summary}`);
      }
      for (const v of H.flatten(results, ['moderate', 'minor'])) {
        moderate.push(`${page} @${width}px  ${v.impact} ${v.id}  ${v.target}`);
      }
    }
  }
  // Reported, not enforced — same posture as the application's suite.
  if (moderate.length) t.diagnostic(`moderate/minor (reported, not failing): ${moderate.length}\n  ` + moderate.slice(0, 20).join('\n  '));
  assert.deepEqual(unexpected, [],
    `${unexpected.length} serious/critical violation(s) that are not waived in known-issues.json:\n    `
    + unexpected.join('\n    '));
});

test('the waiver has not grown beyond what was measured', () => {
  for (const w of KNOWN.waived) {
    const n = seenByRule.get(w.rule) || 0;
    assert.ok(n <= w.maxNodes,
      `${w.rule} is waived for ${w.issue} at up to ${w.maxNodes} nodes but produced ${n}. `
      + 'A waiver is permission to not fix what was measured, not a licence to add more.');
  }
});

test('no waiver outlives its fix', () => {
  // The failure mode this exists for: a rule gets fixed, nobody removes its
  // waiver, and the entry silently keeps granting permission for the same
  // violation to return years later.
  for (const w of KNOWN.waived) {
    const n = seenByRule.get(w.rule) || 0;
    assert.ok(n > 0,
      `${w.rule} is waived for ${w.issue} but produced NO violations — the fix has landed. `
      + 'Delete the entry. When "waived" is empty, delete known-issues.json and the two tests '
      + 'that read it; the gate then simply requires zero serious violations.');
  }
});
