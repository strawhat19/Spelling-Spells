const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { randomUUID } = require('node:crypto');

// Synthetic transport fixtures only. Real SQL/RLS authorization is tested separately.
const root = path.resolve(__dirname, '../../dist');
const port = Number(process.env.CATALOG_FIXTURE_PORT || 8086);
const backendOrigin = 'https://qtfajiuilwdtywkklbjq.supabase.co';
const ownerUid = '00000000-0000-4000-8000-000000000001';
const memberUid = '00000000-0000-4000-8000-000000000002';
const accountId = (owner) => 'User_' + (owner ? 1 : 2) + '_Account_2026-10-21_' + (owner ? ownerUid : memberUid);
const date = '2026-10-21T12:00:00.000Z';
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const requests = [];
let state;
let tick = 0;
const now = () => new Date(Date.now() + ++tick).toISOString();
const error = (message, code = '22023', status = 400) => Object.assign(new Error(message), { code, status });
const user = (owner) => ({
  id: owner ? ownerUid : memberUid, aud: 'authenticated', role: 'authenticated',
  email: owner ? 'fixture-owner@example.test' : 'fixture-subscriber@example.test',
  email_confirmed_at: date, created_at: date, updated_at: date, identities: [],
  app_metadata: { provider: 'email', providers: ['email'], fixture_only: true, role: owner ? 'Owner' : 'Subscriber' },
  user_metadata: { display_name: owner ? 'Fixture Owner' : 'Fixture Subscriber' },
});
const session = (owner) => ({
  user: user(owner), token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'synthetic-fixture-refresh-not-valid',
  access_token: Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url') + '.' +
    Buffer.from(JSON.stringify({ sub: owner ? ownerUid : memberUid, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url') + '.synthetic-fixture-signature',
});
const sourceId = 'Source_100_Fixture_2026-10-21_00000000-0000-4000-8000-000000000100';
const worldId = 'Universe_100_Fixture_2026-10-21_00000000-0000-4000-8000-000000000100';
const spell = (number, name, slug, status = 'published') => {
  const id = 'Spell_' + number + '_Fixture_2026-10-21_00000000-0000-4000-8000-' + String(number).padStart(12, '0');
  return { id, number, name, slug, universe_id: worldId, status, revision: 1, created_at: date, updated_at: date, payload: {
    id, number, name, slug, worldId, sourceTitle: 'Synthetic Fixture Continuity', medium: 'Books', kind: 'Fixture Light Charm', language: 'Invented Fixture Script',
    pronunciation: '', pronunciationNote: '', pronunciationStatus: 'unavailable', syllables: [], aliases: ['Synthetic Light'],
    definition: 'A synthetic catalog entry used only to verify local browsing and editorial controls.',
    effect: 'Creates an invented light in the synthetic test story.', usage: 'Fixture use only.', etymology: 'No real etymology is claimed.',
    etymologyStatus: 'Unconfirmed', breakdown: [], danger: 1, utility: 2, skill: 'Beginner', category: 'Fixture Light', accent: 'light',
    casters: ['Synthetic Archivist'], continuity: 'Isolated browser fixture / version 1', entryType: 'spell', evidenceStatus: 'verified', sourceIds: [sourceId],
    sources: [{ label: 'Synthetic Reference / No Real Canon Claim', url: 'https://example.test/catalog-fixture' }],
  } };
};
function reset() {
  const sample = spell(100, 'Fixture Beacon', 'fixture-beacon');
  const dynamic = spell(101, 'Newly Published Fixture', 'fixture-newly-published');
  const draft = spell(102, 'Private Fixture Draft', 'fixture-private-draft', 'draft');
  const approved = spell(103, 'Approved Fixture Entry', 'fixture-approved-entry', 'approved');
  state = {
    catalog_spells: [sample, dynamic, draft, approved],
    catalog_universes: [{ id: worldId, number: 100, slug: 'fixture-archive', name: 'Fixture Archive', kind: 'fictional', revision: 1, created_at: date, updated_at: date, payload: { medium: 'Books', description: 'An entirely synthetic universe for isolated browser review.', continuity: 'Fixture Version 1' } }],
    catalog_sources: [{ id: sourceId, number: 100, label: 'Synthetic Reference / No Real Canon Claim', url: 'https://example.test/catalog-fixture', revision: 1, created_at: date, updated_at: date, payload: { publisher: 'Fixture Only', kind: 'synthetic', evidenceNote: 'Transport fixture. No external source was fetched.' } }],
    catalog_submissions: [{ id: 'Submission_1_Entry_2026-10-21_00000000-0000-4000-8000-000000000001', number: 1, account_id: accountId(false), request_id: '00000000-0000-4000-8000-000000000010', status: 'review', reviewer_note: null, entry_id: null, revision: 1, created_at: date, updated_at: date, payload: { kind: 'new-spell', name: 'Fixture Reader Suggestion', world: 'Fixture Archive', pronunciation: '', definition: 'A synthetic reader suggestion awaiting an Owner decision.', sourceUrl: 'https://example.test/submitted-fixture', mediaUrl: '', notes: 'Synthetic contributor note.' } }],
    saved_spells: [],
    contacts: [{ id: 'Contact_1_Submission_2026-10-21_00000000-0000-4000-8000-000000000001', number: 1, name: 'Fixture Visitor', email: 'fixture-visitor@example.test', subject: 'Fixture Contact Message', message: 'A synthetic contact message for the Owner inbox.', status: 'new', created_at: date, updated_at: date }],
    contactAttempts: {}, writes: [], feed: 1,
  };
}
reset();
function actor(request, url) {
  const token = (request.headers.authorization || '').replace(/^Bearer /i, '');
  let uid = null;
  try { uid = JSON.parse(Buffer.from(token.split('.')[1] || '', 'base64url').toString()).sub; } catch {}
  if (uid === ownerUid) return { owner: true, uid, id: accountId(true) };
  if (uid === memberUid) return { owner: false, uid, id: accountId(false) };
  return null;
}
function requireActor(who, payload, owner = false) {
  if (!who || (owner && !who.owner) || (payload.p_expected_auth_uid && payload.p_expected_auth_uid !== who.uid)) throw error('Fixture Permission Denied', '42501', 403);
}
function result(response, value, status = 200, extra = {}) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Catalog-Fixture': 'synthetic-in-memory-no-cloud', ...extra });
  response.end(value === undefined ? '' : JSON.stringify(value));
}
function rowsFor(table, who, url) {
  if (table === 'accounts') return [true, false].filter((owner) => who && (who.owner || who.owner === owner)).map((owner) => ({ id: accountId(owner), number: owner ? 1 : 2, auth_uid: owner ? ownerUid : memberUid, email: user(owner).email, role: owner ? 'Owner' : 'Subscriber', active: true, created_at: date, updated_at: date }));
  if (table === 'profiles') return [true, false].filter((owner) => who && (who.owner || who.owner === owner)).map((owner) => ({ account_id: accountId(owner), display_name: user(owner).user_metadata.display_name, avatar_url: null, privacy: 'private' }));
  if (table === 'catalog_feed_state') return [{ id: 'public', revision: state.feed, updated_at: now() }];
  if (table === 'catalog_submissions') return who ? state[table].filter((row) => who.owner || row.account_id === who.id) : [];
  if (table === 'catalog_spells') return state[table].filter((row) => who?.owner || row.status === 'published');
  if (table === 'catalog_universes' || table === 'catalog_sources') return state[table];
  if (table === 'catalog_spell_sources') return state.catalog_spells.filter((row) => who?.owner || row.status === 'published').flatMap((row) => row.payload.sourceIds.map((source_id) => ({ spell_id: row.id, source_id })));
  if (table === 'saved_spells') return who ? state.saved_spells.filter((row) => row.account_id === who.id) : [];
  if (['notifications', 'notification_receipts'].includes(table)) return [];
  throw error('Fixture Table Not Implemented: ' + table, 'PGRST205', 404);
}
function filterRows(rows, url, request) {
  let output = rows.slice();
  for (const [key, value] of url.searchParams) {
    if (/^(eq|lt|gt|lte|gte)\./.test(value)) {
      const [operation, ...parts] = value.split('.');
      const needle = parts.join('.');
      output = output.filter((row) => operation === 'eq' ? String(row[key]) === needle : operation === 'lt' ? row[key] < Number(needle) : operation === 'gt' ? row[key] > Number(needle) : operation === 'lte' ? row[key] <= Number(needle) : row[key] >= Number(needle));
    }
  }
  const order = url.searchParams.get('order');
  if (order) { const [field, direction] = order.split('.'); output.sort((a, b) => (a[field] < b[field] ? -1 : a[field] > b[field] ? 1 : 0) * (direction === 'desc' ? -1 : 1)); }
  const offset = Number(url.searchParams.get('offset') || 0);
  const limit = Number(url.searchParams.get('limit') || 4000);
  output = output.slice(offset, offset + limit);
  return (request.headers.accept || '').includes('application/vnd.pgrst.object+json') ? output[0] ?? null : output;
}
function rpc(name, payload, who) {
  if (name === 'ensure_account') { requireActor(who, payload); return [{ id: who.id, auth_uid: who.uid }]; }
  if (name === 'get_account_sign_in_methods') { requireActor(who, payload, true); return [true, false].map((owner) => ({ account_id: accountId(owner), providers: ['email'] })); }
  if (name === 'get_owner_notifications') { requireActor(who, payload, true); return []; }
  if (name === 'get_owner_contacts') { requireActor(who, payload, true); return state.contacts.filter((row) => !payload.p_before || row.number < payload.p_before).sort((a, b) => b.number - a.number).slice(0, 51); }
  if (name === 'submit_contact') {
    if (payload.p_expected_auth_uid && payload.p_expected_auth_uid !== who?.uid) throw error('Fixture Identity Changed', '42501', 403);
    const input = payload.p_payload;
    if (!input || input.website) throw error('Fixture Honeypot Rejected');
    const key = (who?.id || 'guest') + ':' + payload.p_request_id;
    if (state.contactAttempts[key]) return state.contactAttempts[key];
    const number = state.contacts.length + 1;
    const row = { id: 'Contact_' + number + '_Submission_2026-10-21_' + randomUUID(), number, ...input, status: 'new', created_at: now(), updated_at: now() };
    delete row.website;
    state.contacts.push(row); state.contactAttempts[key] = { id: row.id, number, created_at: row.created_at };
    state.writes.push({ action: name, id: row.id }); return state.contactAttempts[key];
  }
  if (name === 'set_contact_status') {
    requireActor(who, payload, true);
    const row = state.contacts.find((item) => item.id === payload.p_id);
    if (!row || row.updated_at !== payload.p_expected_updated_at) throw error('Fixture Contact Changed', '40001', 409);
    row.status = payload.p_status; row.updated_at = now(); state.writes.push({ action: name, id: row.id, status: row.status }); return [row];
  }
  if (name === 'set_saved_spell' || name === 'import_saved_spells' || name === 'clear_saved_spells') {
    requireActor(who, payload);
    const ids = name === 'set_saved_spell' ? [payload.p_spell_id] : name === 'import_saved_spells' ? payload.p_spell_ids : payload.p_expected.map((row) => row.spell_id);
    for (const id of ids) {
      let row = state.saved_spells.find((item) => item.account_id === who.id && item.spell_id === id);
      if (!row) { row = { account_id: who.id, spell_id: id, is_saved: false, saved_at: now(), updated_at: now(), revision: 0 }; state.saved_spells.push(row); }
      row.is_saved = name !== 'clear_saved_spells' && (name !== 'set_saved_spell' || payload.p_is_saved);
      row.updated_at = now(); row.saved_at = now(); row.revision++;
    }
    state.writes.push({ action: name, account: who.id, ids }); return null;
  }
  if (name === 'submit_catalog_entry') {
    requireActor(who, payload);
    const existing = state.catalog_submissions.find((row) => row.account_id === who.id && row.request_id === payload.p_request_id);
    if (existing) { if (JSON.stringify(existing.payload) !== JSON.stringify(payload.p_payload)) throw error('Fixture Attempt Already Used'); return [existing]; }
    const number = state.catalog_submissions.length + 1;
    const row = { id: 'Submission_' + number + '_Entry_2026-10-21_' + randomUUID(), number, account_id: who.id, request_id: payload.p_request_id, payload: payload.p_payload, status: 'review', reviewer_note: null, entry_id: null, revision: 1, created_at: now(), updated_at: now() };
    state.catalog_submissions.push(row); state.writes.push({ action: name, id: row.id, account: who.id }); return [row];
  }
  if (name === 'review_catalog_submission') {
    requireActor(who, payload, true);
    const row = state.catalog_submissions.find((item) => item.id === payload.p_id);
    if (!row || row.revision !== payload.p_expected_revision) throw error('Fixture Submission Changed', '40001', 409);
    if (payload.p_status === 'approved' && !state.catalog_spells.some((entry) => entry.id === payload.p_entry_id && ['approved', 'published'].includes(entry.status))) throw error('Fixture Approval Requires Approved Entry');
    row.status = payload.p_status; row.reviewer_note = payload.p_note; row.entry_id = payload.p_entry_id; row.revision++; row.updated_at = now();
    state.writes.push({ action: name, id: row.id, status: row.status }); return [row];
  }
  if (name.startsWith('owner_save_catalog_')) {
    const input = payload.p_record;
    requireActor(who, { p_expected_auth_uid: input.expectedAuthUid }, true);
    const kind = name.replace('owner_save_catalog_', '');
    const table = kind === 'spell' ? 'catalog_spells' : kind === 'universe' ? 'catalog_universes' : 'catalog_sources';
    const records = state[table];
    let row = records.find((item) => item.id === input.id);
    if (input.id && (!row || row.revision !== input.expectedRevision)) throw error('Fixture Record Changed', '40001', 409);
    if (!row) { const number = Math.max(100, ...records.map((item) => item.number)) + 1; row = { id: (kind === 'spell' ? 'Spell' : kind === 'source' ? 'Source' : 'Universe') + '_' + number + '_Fixture_2026-10-21_' + randomUUID(), number, revision: 0, created_at: now() }; records.push(row); }
    row.revision++; row.updated_at = now(); row.payload = { ...input.payload };
    if (kind === 'source') { row.label = input.label; row.url = input.url; }
    else { row.name = input.name; row.slug = input.slug; if (kind === 'universe') row.kind = input.kind; else { row.universe_id = input.universe_id; row.status = 'draft'; row.payload.id = row.id; row.payload.number = row.number; } }
    state.feed++; state.writes.push({ action: name, id: row.id }); return [row];
  }
  if (name === 'owner_set_catalog_status') {
    requireActor(who, payload, true);
    const row = state.catalog_spells.find((item) => item.id === payload.p_id);
    if (!row || row.revision !== payload.p_expected_revision) throw error('Fixture Entry Changed', '40001', 409);
    if (['approved', 'published'].includes(payload.p_status) && (row.payload.evidenceStatus !== 'verified' || !row.payload.continuity || !row.payload.sourceIds.length)) throw error('Fixture Evidence Required');
    if (payload.p_status === 'published' && !['approved', 'unpublished'].includes(row.status)) throw error('Fixture Approval Required');
    row.status = payload.p_status; row.revision++; row.updated_at = now(); state.feed++;
    state.writes.push({ action: name, id: row.id, status: row.status }); return [row];
  }
  throw error('Fixture RPC Not Implemented: ' + name, 'PGRST202', 404);
}
function browserBootstrap(config) {
  var mode = new URLSearchParams(location.search).get('scenario') || sessionStorage.getItem('catalog-fixture-scenario') || 'public';
  sessionStorage.setItem('catalog-fixture-scenario', mode);
  window.__catalogFixture = { mode: mode, syntheticOnly: true, blocked: [], requests: [], responses: [], errors: [] };
  window.addEventListener('unhandledrejection', function(event) { window.__catalogFixture.errors.push(String(event.reason && (event.reason.message || event.reason))); });
  var storageKey = 'spelling-spells:' + config.backendOrigin + ':auth';
  if (mode === 'owner' || mode === 'subscriber') localStorage.setItem(storageKey, JSON.stringify(mode === 'owner' ? config.ownerSession : config.memberSession));
  else localStorage.removeItem(storageKey);
  var fetchOriginal = window.fetch.bind(window);
  function diagnostics() {
    var box = document.getElementById('catalog-fixture-diagnostics-body');
    if (box) box.textContent = JSON.stringify({ mode: mode, responses: window.__catalogFixture.responses.slice(-14), errors: window.__catalogFixture.errors, blocked: window.__catalogFixture.blocked }, null, 2);
  }
  window.fetch = async function(input, init) {
    var request = new Request(input, init);
    var url = new URL(request.url, location.href);
    if (url.origin === config.backendOrigin) {
      window.__catalogFixture.requests.push(request.method + ' ' + url.pathname);
      var local = new URL('/__fixture' + url.pathname + url.search, location.origin);
      local.searchParams.set('scenario', mode);
      try {
      var body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.clone().text();
      return await fetchOriginal(local.href, { method: request.method, headers: request.headers, body: body, signal: request.signal, credentials: 'omit', redirect: 'error' }).then(async function(response) {
        var diagnostic = { endpoint: url.pathname, status: response.status, bearer: /^Bearer /.test(request.headers.get('Authorization') || '') };
        if (url.pathname === '/auth/v1/user' || url.pathname.endsWith('/ensure_account')) {
          try { var value = await response.clone().json(); diagnostic.syntheticId = value.id || (value[0] && value[0].id); diagnostic.code = value.code; diagnostic.message = value.message; } catch (failure) { diagnostic.parseError = String(failure); }
        }
        window.__catalogFixture.responses.push(diagnostic);
        diagnostics();
        return response;
      });
      } catch (failure) { window.__catalogFixture.errors.push(request.method + ' ' + url.pathname + ': ' + String(failure && failure.message || failure)); diagnostics(); throw failure; }
    }
    if (url.origin === location.origin) return fetchOriginal(request);
    window.__catalogFixture.blocked.push(request.method + ' ' + url.origin + url.pathname);
    return Promise.reject(new TypeError('External Request Blocked By Catalog Fixture'));
  };
  class FixtureSocket extends EventTarget {
    constructor(url) {
      super(); this.url = String(url); this.readyState = 0; this.protocol = ''; this.extensions = ''; this.bufferedAmount = 0; this.binaryType = 'blob';
      if (!this.url.startsWith(config.backendOrigin.replace('https:', 'wss:') + '/realtime/')) window.__catalogFixture.blocked.push('WebSocket ' + this.url.split('?')[0]);
      queueMicrotask(() => { this.readyState = 1; this.emit('open', new Event('open')); });
    }
    emit(type, event) { this.dispatchEvent(event); if (typeof this['on' + type] === 'function') this['on' + type](event); }
    send(raw) {
      try {
        var message = JSON.parse(String(raw));
        if (Array.isArray(message)) {
          var join = message[0], ref = message[1], topic = message[2], event = message[3], payload = message[4];
          var changes = ((payload && payload.config && payload.config.postgres_changes) || []).map((item, index) => ({ id: index + 1, ...item }));
          if (['phx_join', 'phx_leave', 'heartbeat'].includes(event)) queueMicrotask(() => this.emit('message', new MessageEvent('message', { data: JSON.stringify([join, ref, topic, 'phx_reply', { status: 'ok', response: event === 'phx_join' ? { postgres_changes: changes } : {} }]) })));
        }
      } catch {}
    }
    close(code, reason) { if (this.readyState === 3) return; this.readyState = 3; this.emit('close', new CloseEvent('close', { code: code || 1000, reason: reason || '', wasClean: true })); }
  }
  FixtureSocket.CONNECTING = 0; FixtureSocket.OPEN = 1; FixtureSocket.CLOSING = 2; FixtureSocket.CLOSED = 3;
  window.WebSocket = FixtureSocket;
  navigator.sendBeacon = function(url) { window.__catalogFixture.blocked.push('Beacon ' + String(url).split('?')[0]); return false; };
  if (navigator.serviceWorker) navigator.serviceWorker.register = function() { return Promise.reject(new Error('Service Workers Disabled In Catalog Fixture')); };
  window.open = function(url) { var target = new URL(String(url), location.href); if (target.origin !== location.origin) { window.__catalogFixture.blocked.push('Open ' + target.origin); return null; } location.href = target.href; return null; };
  document.addEventListener('click', function(event) { var link = event.target.closest && event.target.closest('a[href]'); if (link) { var target = new URL(link.href, location.href); if (target.origin !== location.origin) { event.preventDefault(); event.stopImmediatePropagation(); window.__catalogFixture.blocked.push('Link ' + target.origin); } } }, true);
  window.addEventListener('load', function() {
    setTimeout(function() {
      var banner = document.createElement('div'); banner.id = 'catalog-fixture-banner'; banner.setAttribute('role', 'status');
      banner.textContent = 'ISOLATED FIXTURE / ' + mode.toUpperCase() + ' / Synthetic In-Memory Records / No Cloud Writes';
      Object.assign(banner.style, { position: 'fixed', bottom: '0', left: '0', right: '0', zIndex: '2147483647', padding: '5px 10px', background: '#fff0ba', color: '#291a35', font: '11px Arial,sans-serif', textAlign: 'center', pointerEvents: 'none' });
      document.body.appendChild(banner);
      var details = document.createElement('details'); details.id = 'catalog-fixture-diagnostics';
      Object.assign(details.style, { position: 'fixed', right: '8px', bottom: '28px', zIndex: '2147483646', maxWidth: 'min(640px,95vw)', maxHeight: '50vh', overflow: 'auto', background: '#fff9ea', color: '#20134d', padding: '8px', border: '1px solid #493348', font: '11px monospace' });
      var summary = document.createElement('summary'); summary.textContent = 'Fixture Diagnostics / Synthetic Only'; details.appendChild(summary);
      var output = document.createElement('pre'); output.id = 'catalog-fixture-diagnostics-body'; output.style.whiteSpace = 'pre-wrap'; details.appendChild(output); document.body.appendChild(details); diagnostics();
    }, 250);
  });
}
function inject(html) {
  const config = { backendOrigin, ownerSession: session(true), memberSession: session(false) };
  return html.replace(/<head([^>]*)>/i, '<head$1><script>(' + browserBootstrap.toString() + ')(' + JSON.stringify(config).replace(/</g, '\\u003c') + ');</script>');
}
async function body(request) {
  let data = '';
  for await (const chunk of request) { data += chunk; if (data.length > 300000) throw error('Fixture Payload Too Large'); }
  return data ? JSON.parse(data) : {};
}
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1:' + port);
    if (url.pathname === '/__fixture/state') return result(response, { syntheticOnly: true, requests, writes: state.writes, published: state.catalog_spells.filter((row) => row.status === 'published').map(({ id, name, slug }) => ({ id, name, slug })), submissions: state.catalog_submissions, contacts: state.contacts, saved: state.saved_spells });
    if (url.pathname === '/__fixture/reset' && request.method === 'POST') { reset(); return result(response, { reset: true, syntheticOnly: true }); }
    if (url.pathname.startsWith('/__fixture/')) {
      const endpoint = url.pathname.slice('/__fixture'.length);
      const who = actor(request, url);
      const audit = { method: request.method, endpoint, scenario: url.searchParams.get('scenario') || 'public', syntheticActor: who?.uid ?? null };
      requests.push(audit);
      response.once('finish', () => { audit.status = response.statusCode; });
      if (requests.length > 2000) requests.shift();
      if (endpoint === '/auth/v1/user') { if (!who) throw error('No Fixture Session', '401', 401); return result(response, user(who.owner)); }
      if (endpoint === '/auth/v1/settings') return result(response, { external: { google: false }, disable_signup: false, mailer_autoconfirm: true });
      if (endpoint === '/auth/v1/token') { const input = await body(request); return result(response, session(String(input.email || '').includes('owner'))); }
      if (endpoint === '/auth/v1/logout') return result(response, undefined, 204);
      if (endpoint.startsWith('/rest/v1/rpc/')) return result(response, rpc(endpoint.split('/').at(-1), await body(request), who));
      if (endpoint.startsWith('/rest/v1/')) {
        const table = endpoint.split('/').at(-1);
        if (url.searchParams.get('scenario') === 'failure' && table.startsWith('catalog_')) throw error('Synthetic Catalog Outage / No Seed Fallback', 'PGRST205', 404);
        const rows = rowsFor(table, who, url);
        return result(response, filterRows(rows, url, request), 200, { 'Content-Range': '0-' + Math.max(0, rows.length - 1) + '/' + rows.length });
      }
      throw error('Fixture Endpoint Not Implemented', 'PGRST202', 404);
    }
    if (!['GET', 'HEAD'].includes(request.method)) throw error('Static Fixture Is Read Only', '405', 405);
    const candidate = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (candidate !== root && !candidate.startsWith(root + path.sep)) throw error('Path Rejected', '403', 403);
    let file = [candidate, candidate + '.html', path.join(candidate, 'index.html')].find((name) => fs.existsSync(name) && fs.statSync(name).isFile());
    let fallback = false;
    if (!file && /^\/spell\/[^/]+\/?$/.test(url.pathname)) { file = path.join(root, 'spell.html'); fallback = true; }
    if (!file && /^\/world\/[^/]+\/?$/.test(url.pathname)) { file = path.join(root, 'world.html'); fallback = true; }
    if (!file || !fs.existsSync(file)) throw error('Static Fixture Page Not Found / Build dist First', '404', 404);
    const html = path.extname(file) === '.html';
    response.writeHead(200, {
      'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store',
      'X-Catalog-Fixture': 'synthetic-in-memory-no-cloud', 'X-Fixture-Dynamic-Fallback': String(fallback),
      'Content-Security-Policy': "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self' data:; frame-src 'none'; form-action 'self'; base-uri 'self'",
    });
    if (request.method === 'HEAD') response.end();
    else if (html) response.end(inject(fs.readFileSync(file, 'utf8')));
    else fs.createReadStream(file).pipe(response);
  } catch (failure) { result(response, { code: failure.code || 'FIXTURE_ERROR', message: failure.message, syntheticOnly: true }, failure.status || 500); }
});
server.listen(port, '127.0.0.1', () => console.log('Catalog Fixture Only: http://127.0.0.1:' + port + '/spells?scenario=public\nOwner: /catalog-editor?scenario=owner\nSubscriber: /submissions?scenario=subscriber\nOutage: /spells?scenario=failure\nState: /__fixture/state\nNo external requests or cloud writes are permitted'));
