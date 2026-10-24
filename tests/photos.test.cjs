const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../app/static/photos.js');

function wire() {
  const sent = [], timers = [];
  const api = P.client(m => sent.push(m), { set: (fn) => { timers.push(fn); return timers.length; }, clear: () => {} });
  return { api, sent, timers };
}

test('client sends relay calls and resolves the matching answer', async () => {
  const { api, sent } = wire();
  const p = api.setEnabled(true);
  assert.deepEqual({ type: sent[0].type, method: sent[0].method, params: sent[0].params }, { type: 'wizard-os:photos', method: 'setEnabled', params: { on: true } });
  api.onMessage({ type: 'wizard-os:photos', id: sent[0].id, ok: true, result: { v: 1, enabled: true } });
  assert.deepEqual(await p, { v: 1, enabled: true });
});

test('no-bridge (browser, desktop) and silence (old Wizard OS) are told apart', async () => {
  const a = wire();
  const d = P.detect(a.api, { set: () => 0 });
  a.api.onMessage({ type: 'wizard-os:photos', id: a.sent[0].id, ok: false, error: 'no-bridge' });
  assert.equal(await d, 'none');
  const b = wire();
  const d2 = P.detect(b.api, { set: fn => fn() });
  assert.equal(await d2, 'legacy');
  const c = wire();
  const d3 = P.detect(c.api, { set: () => 0 });
  c.api.onMessage({ type: 'wizard-os:photos', id: c.sent[0].id, ok: true, result: { v: 1, enabled: false, server: '' } });
  assert.equal(await d3, 'v1');
});

test('pushes update status; resume asks the page to refresh', () => {
  let s = null, r = 0;
  const api = P.client(() => {}, { onStatus: x => { s = x; }, onResume: () => { r++; } });
  api.onMessage({ type: 'wizard-os:photos-push', push: { type: 'status', status: { v: 1, enabled: true } } });
  api.onMessage({ type: 'wizard-os:photos-push', push: { type: 'resume' } });
  api.onMessage({ type: 'wizard-os:photos-push', push: { type: 'status', status: { v: 9 } } });
  assert.deepEqual(s, { v: 1, enabled: true });
  assert.equal(r, 1);
});

test('views: browser explains where backup runs; old app opens its native screen; v1 shows the switch', () => {
  assert.match(P.html({ mode: 'none' }), /Wizard OS Android app/);
  assert.match(P.html({ mode: 'legacy' }), /data-ph="native"/);
  const v1 = P.html({ mode: 'v1', status: { v: 1, enabled: false, connected: false, server: 'https://photos.example', permission: 'none' } });
  assert.match(v1, /data-ph="enabled"/);
  assert.doesNotMatch(v1, /<script|onerror=/);
});

test('owner text is escaped', () => {
  assert.equal(P.esc('<img onerror=x>'), '&lt;img onerror=x&gt;');
});
