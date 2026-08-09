'use strict';
/**
 * Marketing screenshot renders (guideherd-site #294). Serves THIS repo,
 * mocks the API entirely (request interception — no production calls), and
 * captures real product surfaces populated with a FICTIONAL firm:
 * "Ashford & Bell, LLP" — every person, key, and address here is invented.
 *
 * Captures (1400x900):
 *   1. auth entry, dark            -> entry-dark.png
 *   2. Administration Center — Catalog workspace, dark  -> admin-catalog-dark.png
 *   3. Operations Center — Overview, dark               -> ops-overview-dark.png
 *   4. Administration Center — Catalog workspace, light -> admin-catalog-light.png
 *
 * Run from the PRODUCT repo tests/frontend dir (for playwright-core resolution):
 *      OUT_DIR=/path/to/site/images node _final-renders.js
 */
const { chromium } = require('playwright-core');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const API = 'https://api.guideherd.ai';
const OUT = process.env.OUT_DIR || __dirname;

function resolveChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  throw new Error('Set CHROMIUM_PATH.');
}

const server = http.createServer((req, res) => {
  let p = req.url.split('?')[0];
  if (p.endsWith('/')) p += 'index.html';
  try { res.end(fs.readFileSync(path.join(ROOT, p))); }
  catch { res.statusCode = 404; res.end('nf'); }
});

const CORS = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
});

// ── Fictional firm ─────────────────────────────────────────────────────
const ORG = 'ashford-bell';
const ADMIN_IDENTITY = {
  subject: 'dana-whitfield', displayName: 'Dana Whitfield', organizationKey: ORG,
  roles: ['administrator'], expiresAt: '2027-01-01T07:00:00.000Z',
};
const OPERATOR_IDENTITY = {
  subject: 'sam-okafor', displayName: 'Sam Okafor', organizationKey: ORG,
  roles: ['operator'], expiresAt: '2027-01-01T07:00:00.000Z',
};

function fictionConfig() {
  return {
    organization: { key: ORG, name: 'Ashford & Bell, LLP', displayName: 'Ashford & Bell', timezone: 'America/New_York', active: true, version: 6 },
    domains: [
      { id: 'scheduling-policy', title: 'Scheduling policy', owner: 'scheduling', namespace: 'scheduling', key: 'policy', schemaVersion: 1 },
      { id: 'matter-intake-definitions', title: 'Matter intake form definitions', owner: 'matter-intake', namespace: 'intake', key: 'matter-intake-definitions', schemaVersion: 1 },
    ],
    practiceAreas: [
      { key: 'estate-planning', name: 'Estate Planning', active: true },
      { key: 'business-law', name: 'Business Law', active: true },
      { key: 'employment-law', name: 'Employment Law', active: true },
      { key: 'real-estate', name: 'Real Estate', active: false },
    ],
    consultationTypes: [
      { key: 'initial-consultation', name: 'Initial Consultation', active: true },
      { key: 'document-review', name: 'Document Review', active: true },
    ],
    attorneys: [
      { key: 'eleanor-ashford', name: 'Eleanor Ashford', displayName: 'Eleanor Ashford', active: true },
      { key: 'marcus-bell', name: 'Marcus Bell', displayName: 'Marcus Bell', active: true },
      { key: 'priya-raman', name: 'Priya Raman', displayName: 'Priya Raman', active: true },
    ],
    routingGroups: [
      { key: 'estate-group', name: 'Estate Planning Group', serviceArea: 'estate-planning', providers: ['eleanor-ashford', 'priya-raman'] },
      { key: 'business-group', name: 'Business Law Group', serviceArea: 'business-law', providers: ['marcus-bell'] },
    ],
    locations: [
      { key: 'midtown', name: 'Midtown Office', timezone: 'America/New_York',
        officeHours: [{ dayOfWeek: 1, opens: '09:00', closes: '17:30' }] },
    ],
    settings: {
      schedulingPolicy: { value: { preferredTimeOfDay: 'morning' }, version: 4, live: true },
      notifications: { value: { enabled: true }, version: 3, live: true },
      notificationBranding: { value: { senderName: 'Ashford & Bell' }, version: 2, live: true },
      identityProvider: { value: { provider: 'static-token' }, version: 0, live: true },
      conversationProvider: { value: { provider: 'elevenlabs' }, version: 0, live: true },
      notificationProvider: { value: { provider: 'graph-email' }, version: 0, live: true },
      notificationChannelPolicy: { value: { policies: { 'appointment-reminder': 'sms-else-email' } }, version: 1, live: true },
      appointmentReminders: { value: { enabled: true }, version: 1, live: true },
      operationalAlerts: { value: { enabled: false, recipient: null }, version: 0, live: true },
      manageLinks: { value: { enabled: true, baseUrl: 'https://app.guideherd.ai/manage', customOrigin: null }, version: 2, live: true },
      dataRetention: { value: { enabled: false, cancelledExpiredHours: 24, terminalDays: 30 }, version: 1, live: true },
      firmMailboxes: { value: { summaryRecipient: 'intake@ashfordbell.example', senderAddress: null }, version: 2, live: true },
    },
    registeredIdentityProviders: ['static-token'],
    registeredNotificationProviders: ['graph-email'],
    notificationProviderFacts: { 'graph-email': { channel: 'email', attachments: true } },
    routableNotificationTypes: [
      { type: 'appointment-confirmation', attachment: true },
      { type: 'consultation-summary', attachment: false },
    ],
    configurationAuthority: { mode: 'live', seedOnBoot: false, lastBootImport: 'none' },
    users: [
      { subject: 'dana-whitfield', displayName: 'Dana Whitfield', roles: ['administrator'], active: true, hasCredential: true, createdAt: '2026-05-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' },
      { subject: 'jordan-pruitt', displayName: 'Jordan Pruitt', roles: ['receptionist'], active: true, hasCredential: true, createdAt: '2026-05-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' },
      { subject: 'sam-okafor', displayName: 'Sam Okafor', roles: ['operator'], active: true, hasCredential: true, createdAt: '2026-05-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' },
    ],
    assignableRoles: ['scheduling-assistant', 'receptionist', 'operator', 'administrator'],
  };
}

const OPS_OVERVIEW = {
  sessions: { groups: { pending: 2, active: 1, completed: 34, failed: 1 }, recent: [] },
  health: [{ capability: 'operational-store', status: 'available' }],
  healthStatus: 'healthy',
};
const OPS_SESSIONS = [
  { sessionId: 'ab-3407', status: 'booked', attorneyId: 'eleanor-ashford', practiceAreaId: 'estate-planning',
    createdAt: '2026-08-08T14:02:00.000Z', connectedAt: '2026-08-08T14:05:00.000Z', completedAt: '2026-08-08T14:19:00.000Z' },
  { sessionId: 'ab-3406', status: 'booked', attorneyId: 'marcus-bell', practiceAreaId: 'business-law',
    createdAt: '2026-08-08T13:31:00.000Z', connectedAt: '2026-08-08T13:33:00.000Z', completedAt: '2026-08-08T13:47:00.000Z' },
  { sessionId: 'ab-3405', status: 'pending', attorneyId: 'priya-raman', practiceAreaId: 'estate-planning',
    createdAt: '2026-08-08T12:58:00.000Z', connectedAt: null, completedAt: null },
];

function mockApi(page, kind) {
  return page.route(API + '/**', async (route) => {
    const req = route.request();
    const origin = (await req.headerValue('origin')) || 'http://127.0.0.1';
    const method = req.method();
    const url = req.url();
    const json = (status, body) => route.fulfill({
      status, headers: { 'content-type': 'application/json', ...CORS(origin) }, body: JSON.stringify(body),
    });
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS(origin) });

    if (url.endsWith('/api/v1/auth/session')) {
      if (kind === 'entry') return json(401, { error: { code: 'unauthorized' } });
      return json(200, kind === 'admin' ? ADMIN_IDENTITY : OPERATOR_IDENTITY);
    }
    if (url.endsWith('/api/v1/auth/providers')) {
      return json(200, { providers: [
        { provider: 'local', label: 'Sign-in credential', available: true },
        { provider: 'entra-id', label: 'Microsoft', startPath: '/api/v1/auth/federated/entra-id/start' },
        { provider: 'google-workspace', label: 'Google Workspace', startPath: '/api/v1/auth/federated/google-workspace/start' },
      ] });
    }

    if (kind === 'admin') {
      if (method === 'GET' && url.includes('/api/v1/admin/configuration')) return json(200, fictionConfig());
      if (method === 'GET' && url.includes('/api/v1/admin/setup')) {
        return json(200, { total: 3, doneCount: 3, complete: true, steps: [] });
      }
      if (method === 'GET' && url.includes('/api/v1/admin/audit')) return json(200, { audit: [] });
      if (url.includes('/api/v1/admin/guides')) return json(200, { guides: [] });
      if (method === 'GET' && url.includes('/api/v1/admin/working-hours')) {
        return json(200, { version: 2, attorneys: [] });
      }
      if (method === 'GET' && url.includes('/api/v1/admin/scheduling-status')) {
        return json(200, {
          registeredProviders: ['msgraph'],
          connections: [{ provider: 'msgraph', registered: true, configured: true, missing: [], credential: null }],
          conversation: { provider: 'elevenlabs', registered: true, bound: true, agentReference: 'sha256:0a1b2c3d4e5f' },
          config: null,
          readiness: { ready: true, issues: [], attorneys: [], bindingVerification: { status: 'verified', calendars: [] } },
        });
      }
    }

    if (kind === 'ops') {
      if (url.includes('/api/v1/operations/overview')) return json(200, OPS_OVERVIEW);
      if (url.includes('/api/v1/operations/scheduling')) return json(200, {
        configured: true, provider: 'msgraph',
        connection: { configured: true, missing: [] },
        readiness: { ready: true, issues: [], attorneys: { bound: 3, schedulable: 3, total: 3 }, bindingVerification: 'verified' },
        probe: { status: 'ok', latencyMs: 236 },
        rates: { windowMinutes: 60, offered: 12, availabilityFailures: 0, routingUnresolved: 0, throttled: 0 },
        credential: null,
      });
      if (url.includes('/api/v1/operations/bookings')) return json(200, { bookings: [
        { bookingContextId: 'bc-91', attorneyId: 'eleanor-ashford', routingGroupKey: 'estate-group', practiceAreaId: 'estate-planning',
          startsAt: '2026-08-11T15:00:00.000Z', provider: 'msgraph', createdAt: '2026-08-08T14:19:00.000Z' },
      ] });
      if (url.includes('/api/v1/operations/history')) return json(200, { events: [], nextBeforeId: null });
      if (url.includes('/api/v1/operations/dead-letters')) return json(200, { outbox: [], scheduler: [], workflow: [] });
      if (url.includes('/api/v1/operations/intake-summary')) return json(200, { timezone: 'America/New_York', since: '2026-08-01T04:00:00.000Z', rows: [] });
      if (url.includes('/api/v1/operations/inbound-messages')) return json(200, { messages: [] });
      if (url.includes('/api/v1/operations/workqueue')) return json(200, { items: [] });
      if (url.includes('/api/v1/operations/sessions')) return json(200, { sessions: OPS_SESSIONS });
      if (url.includes('/api/v1/operations/notifications')) return json(200, { notifications: [
        { type: 'appointment-confirmation', sessionId: 'ab-3407', status: 'sent', claimedAt: '2026-08-08T14:20:00.000Z' },
        { type: 'appointment-reminder', sessionId: 'ab-3406', status: 'sent', claimedAt: '2026-08-08T13:48:00.000Z' },
      ] });
      if (url.includes('/api/v1/operations/search')) return json(200, { kind: 'none', results: [] });
      if (url.includes('/api/v1/operations/usage')) return json(200, { organizationKey: ORG, metrics: {}, usage: [] });
      if (url.includes('/api/v1/operations/document-requests')) return json(200, { receipts: [] });
      if (url.includes('/api/v1/operations/errors')) return json(200, { events: [] });
      if (url.includes('/api/v1/operations/')) return json(200, { sessions: [], deliveries: [], events: [] });
    }

    return json(404, { error: { code: 'not_found', message: 'Resource not found.' } });
  });
}

async function openWorkspace(page, ws) {
  await page.click('.gh-shell-nav a[href="#ws-' + ws + '"]');
  await page.waitForSelector('#ws-' + ws + ':not([hidden])');
}

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const BASE = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: resolveChromium() });

  async function capture(kind, url, file, { theme = 'dark', workspace = null, settleMs = 900 } = {}) {
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await mockApi(page, kind);
    await page.goto(BASE + url);
    if (kind !== 'entry') await page.waitForSelector('#app', { state: 'visible' }).catch(() => {});
    if (theme === 'light') {
      await page.click('#theme-light').catch(() => {});
    }
    if (workspace) await openWorkspace(page, workspace);
    // The suggestions aside carries an internal example card that must not
    // appear in customer-facing imagery; drop it and settle at the top.
    if (kind === 'admin') {
      await page.evaluate(() => {
        document.getElementById('catalog-aside')?.remove();
        // The shipped placeholder example uses a real firm's attorney name;
        // marketing imagery must stay fully fictional.
        for (const input of document.querySelectorAll('input[placeholder]')) {
          if (/raina/i.test(input.placeholder)) {
            input.placeholder = input.placeholder === 'raina-baugher' ? 'jordan-avery' : 'Jordan Avery';
          }
        }
      });
    }
    await page.waitForTimeout(settleMs);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(OUT, file) });
    console.log('captured ' + file);
    await ctx.close();
  }

  try {
    await capture('entry', '/', 'entry-dark.png');
    await capture('admin', '/admin/', 'admin-catalog-dark.png', { workspace: 'catalog' });
    await capture('admin', '/admin/', 'admin-catalog-light.png', { workspace: 'catalog', theme: 'light' });
    await capture('ops', '/operations/', 'ops-overview-dark.png');
  } finally {
    await browser.close();
    server.close();
  }
})();
