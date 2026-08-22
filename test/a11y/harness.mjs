// Shared harness for the marketing-site accessibility gate (#355).
//
// Modelled on the application's tests/frontend/a11y.test.js: axe-core
// injected into a real browser, `serious`/`critical` fail, `moderate`/`minor`
// are reported. Two things are specific to this site and were measured, not
// assumed — see auditPage below.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, '..', '..');
const AXE = fs.readFileSync(path.join(REPO, 'node_modules', 'axe-core', 'axe.min.js'), 'utf8');

// WCAG 2.2 A and AA — the same tag set the application's suite runs.
export const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];

// Every page the allowlist ships, at the two widths the design switches
// between. 320 is covered by the responsive pins; these are the widths where
// layout and type actually differ.
export const PAGES = [
  'index.html', 'platform.html', 'solutions.html', 'how-it-works.html',
  'academy.html', 'resources.html', 'company.html', 'lets-talk.html',
  'privacy.html', 'terms.html', 'about.html', 'approach.html',
  'services.html', 'training.html', '404.html', 'status/index.html',
];
export const WIDTHS = [1440, 390];

const MIME = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript',
  '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.ico':'image/x-icon',
  '.woff2':'font/woff2', '.woff':'font/woff', '.json':'application/json',
  '.xml':'application/xml', '.txt':'text/plain', '.webmanifest':'application/manifest+json' };

/** Build the site and serve the OUTPUT — the gate must audit what ships. */
export async function serveBuiltSite() {
  const out = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP || '/tmp', 'gh-a11y-'));
  execFileSync('bash', [path.join(REPO, 'scripts', 'build-site.sh'), out], { stdio: 'pipe' });
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(out, url === '/' ? 'index.html' : url);
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { origin: `http://127.0.0.1:${server.address().port}`, out,
           close: () => new Promise((r) => server.close(r)) };
}

export const launch = () => chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

/**
 * Audit one page at one width.
 *
 * `reducedMotion: 'reduce'` is not a convenience — it is what makes this
 * gate honest. The site reveals content with IntersectionObserver-driven
 * opacity transitions, and axe SKIPS elements that are not yet visible. A
 * naive "load, wait, audit" therefore under-reports badly: measured on this
 * site, index.html returned 1 violation that way against 14 with everything
 * revealed, and platform.html 7 against 22. It also removes the #347 hazard
 * from the other direction — auditing mid-transition invents contrast
 * failures that do not exist once the page settles. Under reduced motion
 * every element is at its final opacity immediately, which is both the state
 * a reduced-motion user gets and the complete page. Verified identical to
 * scrolling the whole page and waiting.
 */
export async function auditPage(browser, origin, page, width) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  const tab = await ctx.newPage();
  const pageErrors = [];
  tab.on('pageerror', (e) => pageErrors.push(e.message));
  await tab.goto(`${origin}/${page}`, { waitUntil: 'networkidle' });
  await tab.evaluate(() => document.fonts.ready);
  await tab.waitForTimeout(400);

  // Nothing may still be mid-reveal when axe runs, or the audit is measuring
  // a state no user ever sees.
  const unsettled = await tab.evaluate(() =>
    [...document.querySelectorAll('[data-reveal],[data-stagger]')]
      .filter((el) => parseFloat(getComputedStyle(el).opacity) < 0.99).length);

  await tab.evaluate(AXE);
  const results = await tab.evaluate(
    async (tags) => await axe.run(document, { runOnly: { type: 'tag', values: tags } }), TAGS);
  await ctx.close();
  return { results, unsettled, pageErrors };
}

export const flatten = (results, impacts) =>
  results.violations.filter((v) => impacts.includes(v.impact)).flatMap((v) =>
    v.nodes.map((n) => ({ id: v.id, impact: v.impact, target: n.target.join(' '),
      html: n.html.replace(/\s+/g, ' ').slice(0, 120),
      summary: (n.failureSummary || '').replace(/\s+/g, ' ').slice(0, 160) })));
