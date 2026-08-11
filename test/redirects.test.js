'use strict';

/**
 * The retired redirect posture (#254, owner decision 2026-08-10).
 *
 * The apex's legacy product-path 302s existed to keep pre-cutover
 * caller-held /manage/<token> and /intake/<token> links working. The
 * owners confirmed no such link needs honoring, so the rules are GONE:
 * the apex serves marketing and /status/, and every product path is an
 * ordinary 404 here, exactly like any unknown path. These tests pin
 * that absence — a compatibility rule reappearing is a deliberate edit
 * here, not a leftover.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RULES = fs.readFileSync(path.join(__dirname, '..', '_redirects'), 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'))
  .map((l) => { const [from, to, status] = l.split(/\s+/); return { from, to, status }; });

const RETIRED_GROUPS = ['receptionist', 'operations', 'admin', 'manage', 'intake', 'intake-review', 'documents', 'demo'];

test('the apex carries NO redirect rules at all (#254 retirement)', () => {
  assert.deepEqual(RULES, [],
    'the legacy apex→app compatibility 302s were retired 2026-08-10; a rule here is a regression');
});

test('no retired product path group has any rule — old apex product links 404 like any unknown path', () => {
  const sources = RULES.map((r) => r.from);
  for (const g of RETIRED_GROUPS) {
    assert.ok(!sources.some((s) => s === `/${g}/*` || s.startsWith(`/${g}/`) || s === `/${g}`),
      `/${g} must not be redirected — product surfaces live on app.guideherd.ai only`);
  }
});

test('the retirement decision is recorded in the file itself', () => {
  const text = fs.readFileSync(path.join(__dirname, '..', '_redirects'), 'utf8');
  assert.match(text, /#254/, 'the file explains why it is empty, so the next editor knows');
  assert.match(text, /2026-08-10/, 'with the decision date');
});
