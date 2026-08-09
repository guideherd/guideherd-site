'use strict';
// Integration-claims consistency (#294 follow-up): the calendar claims on the
// public site must name BOTH validated calendar providers. This test exists
// because "Microsoft-only" survived one audit after Google Calendar was
// already shipped, credentialed, and demonstrated end to end.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const page = (n) => fs.readFileSync(path.join(__dirname, '..', n), 'utf8');
test('the scheduling claims name both validated calendar providers', () => {
  const index = page('index.html');
  assert.match(index, /Google calendars|Google Calendar/, 'index names Google Calendar');
  assert.match(index, /Microsoft 365/, 'index names Microsoft 365');
  assert.match(page('services.html'), /Google Calendar/, 'services names Google Calendar');
  assert.match(page('approach.html'), /Google Calendar/, 'approach names Google Calendar');
});
test('SSO and calendar remain distinct claims', () => {
  const index = page('index.html');
  // Sign-in claim (Workspace SSO) and the calendar claim both present,
  // so one being edited can never silently stand in for the other.
  assert.match(index, /Google Workspace, or a firm-issued account/);
  assert.match(index, /Google Calendar integration/);
});
// The Clio dialect is validated at rung 3 against the Clio TRIAL tenant.
// Rungs 4-5 (pilot-firm live validation) are still open, so no page may
// imply a customer's own Clio account has been used.
test('the Clio claim stays inside the evidence', () => {
  for (const name of ['index.html', 'services.html', 'approach.html']) {
    assert.doesNotMatch(page(name), /real firm|in production at a firm/i,
      name + ' must not claim Clio ran against a customer firm’s own account');
  }
  assert.match(page('index.html'), /validated end to end against a Clio tenant/);
});
// Entra ID sign-in is implemented but dark and never validated against a
// real tenant; the customer reference guide lists it as not available.
// Microsoft 365 CALENDAR is a separate, live-proven claim and stays.
test('Microsoft is not offered as a staff sign-in method', () => {
  const index = page('index.html');
  assert.doesNotMatch(index, /sign in with Microsoft or Google|Microsoft or Google Workspace/i,
    'index must not list Microsoft among the available sign-in methods');
  assert.match(index, /Microsoft 365 calendar integration/,
    'the Microsoft 365 calendar claim is separate and must survive');
});
