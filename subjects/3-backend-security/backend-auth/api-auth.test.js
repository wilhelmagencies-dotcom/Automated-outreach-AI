'use strict';
const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const apiAuth = require('./api-auth');

const CLIENT_ID = 'client-123.apps.googleusercontent.com';
const WEBHOOK_SECRET = 'w'.repeat(32);
const API_TOKEN = 't'.repeat(40);

function fakeIdToken(claims) {
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${enc({ alg: 'RS256' })}.${enc(claims)}.sig`;
}

function googleReturning(claims) {
  return async (url, init) => {
    assert.strictEqual(url, 'https://oauth2.googleapis.com/token');
    assert.match(String(init.body), /code=good-code/);
    return { ok: true, json: async () => ({ id_token: fakeIdToken(claims) }) };
  };
}

async function start(fetchImpl) {
  const auth = apiAuth({
    sessionSecret: 's'.repeat(40),
    allowedEmails: ['carl@example.com'],
    googleClientId: CLIENT_ID,
    googleClientSecret: 'secret',
    loginRedirectUri: 'https://hq.example/auth/login/callback',
    apiTokens: [API_TOKEN],
    webhookSecret: WEBHOOK_SECRET,
    webhookPaths: ['/api/zapbox/inbound', '/webhooks/zapier'],
    fetch: fetchImpl,
  });
  const app = express();
  app.use(express.json());
  app.use(auth.routes);
  app.post('/webhooks/zapier', auth.requireWebhookSecret, (req, res) => res.json({ got: req.body }));
  app.use('/api', auth.requireAuth);
  app.get('/api/conversations', (req, res) => res.json([{ id: 1, user: req.user }]));
  app.post('/api/zapbox/inbound', (req, res) => res.json({ ok: true }));
  app.get('/health', (req, res) => res.json({ ok: true }));
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const req = (path, init = {}) => fetch(base + path, { redirect: 'manual', ...init });
  return { auth, server, req };
}

const cookieFrom = (res, name) =>
  res.headers.getSetCookie().map((c) => c.split(';')[0]).find((c) => c.startsWith(`${name}=`));

async function signIn(req) {
  const login = await req('/auth/login?next=/conversations');
  assert.strictEqual(login.status, 302);
  const state = new URL(login.headers.get('location')).searchParams.get('state');
  const stateCookie = cookieFrom(login, 'wa_login_state');
  return req(`/auth/login/callback?code=good-code&state=${state}`, { headers: { cookie: stateCookie } });
}

test('refuses to start without config', () => {
  assert.throws(() => apiAuth({ sessionSecret: '', allowedEmails: [] }), /missing config/);
});

test('anonymous /api requests get 401; /health stays public', async () => {
  const { server, req } = await start();
  try {
    assert.strictEqual((await req('/api/conversations')).status, 401);
    assert.strictEqual((await req('/api/conversations', { headers: { authorization: 'Bearer nope' } })).status, 401);
    assert.strictEqual((await req('/health')).status, 200);
    const nav = await req('/api/conversations', { headers: { accept: 'text/html' } });
    assert.strictEqual(nav.status, 302);
    assert.strictEqual(nav.headers.get('location'), '/auth/login?next=%2Fapi%2Fconversations');
  } finally {
    server.close();
  }
});

test('allow-listed Google sign-in gets a session that opens /api', async () => {
  const { server, req } = await start(googleReturning({
    iss: 'https://accounts.google.com', aud: CLIENT_ID, email: 'Carl@example.com', email_verified: true,
  }));
  try {
    const cb = await signIn(req);
    assert.strictEqual(cb.status, 302);
    assert.strictEqual(cb.headers.get('location'), '/conversations');
    const session = cookieFrom(cb, 'wa_session');
    assert.ok(session && session.length > 'wa_session='.length);
    assert.match(cb.headers.getSetCookie().join('\n'), /wa_session=[^;]+;.*HttpOnly; Secure; SameSite=Lax/);

    const ok = await req('/api/conversations', { headers: { cookie: session } });
    assert.strictEqual(ok.status, 200);
    assert.deepStrictEqual((await ok.json())[0].user, { email: 'carl@example.com' });
    assert.deepStrictEqual(await (await req('/auth/me', { headers: { cookie: session } })).json(), { email: 'carl@example.com' });

    // Tampered cookie is rejected.
    const tampered = session.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A'));
    assert.strictEqual((await req('/api/conversations', { headers: { cookie: tampered } })).status, 401);
  } finally {
    server.close();
  }
});

test('non-allow-listed or unverified Google accounts are refused', async () => {
  for (const claims of [
    { iss: 'accounts.google.com', aud: CLIENT_ID, email: 'someone@gmail.com', email_verified: true },
    { iss: 'accounts.google.com', aud: CLIENT_ID, email: 'carl@example.com', email_verified: false },
    { iss: 'accounts.google.com', aud: 'other-client', email: 'carl@example.com', email_verified: true },
  ]) {
    const { server, req } = await start(googleReturning(claims));
    try {
      const cb = await signIn(req);
      assert.strictEqual(cb.status, 403);
      assert.strictEqual(cookieFrom(cb, 'wa_session'), undefined);
    } finally {
      server.close();
    }
  }
});

test('callback rejects a state that does not match the cookie (login CSRF)', async () => {
  const { server, req } = await start(googleReturning({}));
  try {
    const login = await req('/auth/login');
    const stateCookie = cookieFrom(login, 'wa_login_state');
    const cb = await req('/auth/login/callback?code=good-code&state=attacker', { headers: { cookie: stateCookie } });
    assert.strictEqual(cb.status, 400);
    assert.strictEqual((await req('/auth/login/callback?code=good-code&state=x')).status, 400);
  } finally {
    server.close();
  }
});

test('login never redirects off-site', async () => {
  const { server, req } = await start(googleReturning({
    iss: 'accounts.google.com', aud: CLIENT_ID, email: 'carl@example.com', email_verified: true,
  }));
  try {
    for (const next of ['//evil.com', 'https://evil.com', '/\\evil.com']) {
      const login = await req(`/auth/login?next=${encodeURIComponent(next)}`);
      const state = new URL(login.headers.get('location')).searchParams.get('state');
      const cb = await req(`/auth/login/callback?code=good-code&state=${state}`, {
        headers: { cookie: cookieFrom(login, 'wa_login_state') },
      });
      assert.strictEqual(cb.headers.get('location'), '/');
    }
  } finally {
    server.close();
  }
});

test('API token works for scripts and service-to-service calls', async () => {
  const { server, req } = await start();
  try {
    const r = await req('/api/conversations', { headers: { authorization: `Bearer ${API_TOKEN}` } });
    assert.strictEqual(r.status, 200);
  } finally {
    server.close();
  }
});

test('webhooks need the shared secret (header or query), not a session', async () => {
  const { server, req } = await start();
  const post = (path, headers = {}) =>
    req(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: '{"a":1}' });
  try {
    assert.strictEqual((await post('/webhooks/zapier')).status, 401);
    assert.strictEqual((await post('/webhooks/zapier', { 'x-webhook-secret': 'wrong' })).status, 401);
    assert.strictEqual((await post('/webhooks/zapier', { 'x-webhook-secret': WEBHOOK_SECRET })).status, 200);
    // A webhook that lives under /api is exempt from the session check but still needs the secret.
    assert.strictEqual((await post('/api/zapbox/inbound')).status, 401);
    assert.strictEqual((await post('/api/zapbox/inbound', { authorization: `Bearer ${API_TOKEN}` })).status, 401);
    assert.strictEqual((await post(`/api/zapbox/inbound?secret=${WEBHOOK_SECRET}`)).status, 200);
  } finally {
    server.close();
  }
});

test('signState/verifyState bind the calendar-connect OAuth flow', async () => {
  const { auth, server } = await start();
  server.close();
  const s = auth.signState({ email: 'carl@example.com' });
  assert.strictEqual(auth.verifyState(s).email, 'carl@example.com');
  assert.strictEqual(auth.verifyState(s + 'x'), null);
  assert.strictEqual(auth.verifyState(auth.signState({}, -1)), null);
});
