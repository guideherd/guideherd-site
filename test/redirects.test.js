'use strict';

/**
 * Existing-link compatibility (repository split, Stage 3). Previously-
 * issued apex product links — the /manage/<token> and /intake/<token>
 * URLs already sitting in customers' inboxes — must keep working after
 * the marketing apex moves. These tests hold the _redirects contract:
 * every product path group forwards, path- and query-preserving, to the
 * product origin; nothing marketing, status, or unknown is touched; and
 * the status is the rollback-safe temporary 302.
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

const APP = 'https://app.guideherd.ai';
const PRODUCT_GROUPS = ['receptionist', 'operations', 'admin', 'manage', 'intake', 'intake-review', 'documents', 'demo'];

/** Apply the first matching rule the way Cloudflare Pages does: a
 *  trailing /* captures the splat; query strings are appended by the
 *  platform, so we model that a splat rule preserves the tail + query. */
function resolve(reqPath) {
  for (const r of RULES) {
    if (r.from.endsWith('/*')) {
      const prefix = r.from.slice(0, -1); // keep trailing slash, drop '*'
      if (reqPath.startsWith(prefix)) {
        const splat = reqPath.slice(prefix.length);
        return { location: r.to.replace(':splat', splat), status: Number(r.status) };
      }
    } else if (r.from === reqPath) {
      return { location: r.to, status: Number(r.status) };
    }
  }
  return null;
}

test('every product path group has a rule to the product origin, path-preserving', () => {
  for (const g of PRODUCT_GROUPS) {
    const r = RULES.find((x) => x.from === `/${g}/*`);
    assert.ok(r, `missing redirect for /${g}/*`);
    assert.equal(r.to, `${APP}/${g}/:splat`);
    assert.equal(r.status, '302', 'temporary, so rollback stays safe');
  }
});

test('a previously-issued manage link maps deterministically to the product origin, token intact', () => {
  const out = resolve('/manage/mgr_SYNTHETIC_TOKEN');
  assert.deepEqual(out, { location: `${APP}/manage/mgr_SYNTHETIC_TOKEN`, status: 302 });
});

test('an intake link with a path tail and query string is preserved', () => {
  // The token rides the fragment in production, but path + query must
  // survive regardless; :splat carries the path and Cloudflare appends
  // the query.
  const out = resolve('/intake/resume');
  assert.equal(out.location, `${APP}/intake/resume`);
  // Query preservation is a platform behaviour; assert the rule doesn't
  // hardcode or drop a query on the destination.
  assert.equal(RULES.find((r) => r.from === '/intake/*').to.includes('?'), false,
    'the destination carries no query of its own, so the original survives');
});

test('a staff console path forwards to the product origin', () => {
  assert.equal(resolve('/operations/dashboard').location, `${APP}/operations/dashboard`);
  assert.equal(resolve('/admin/').location, `${APP}/admin/`);
});

test('marketing, status, and unknown paths are NOT redirected', () => {
  for (const p of ['/', '/about', '/approach', '/services', '/training', '/status/', '/status/?drill=1', '/robots.txt', '/nope-unknown']) {
    assert.equal(resolve(p), null, `${p} must not be redirected`);
  }
});

test('no redirect targets the marketing apex or the API — and no loop', () => {
  for (const r of RULES) {
    assert.ok(r.to.startsWith(`${APP}/`), `${r.from} must target the product origin`);
    assert.equal(r.to.includes('api.guideherd.ai'), false, 'never redirect to the API');
    // A rule whose destination host+path would re-match its own source
    // would loop; since the destination host is app.guideherd.ai (a
    // different origin) and this file only runs on the apex, no loop.
    assert.equal(r.to.startsWith('https://guideherd.ai/'), false, 'never point back at the apex');
  }
});
