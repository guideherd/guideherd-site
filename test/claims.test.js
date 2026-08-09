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
