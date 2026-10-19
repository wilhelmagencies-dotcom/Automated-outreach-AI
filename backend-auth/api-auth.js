'use strict';
// Drop-in authentication for the Express outreach backend (and the batch/scraper service).
//
//   const apiAuth = require('./api-auth');
//   const auth = apiAuth();                 // reads config from env, throws if incomplete
//   app.use(auth.routes);                   // /auth/login, /auth/login/callback, /auth/logout, /auth/me
//   app.use('/api', auth.requireAuth);      // BEFORE any /api route is registered
//
// A request is let through when it carries one of:
//   - a valid `wa_session` cookie (set after Google sign-in by an allow-listed email)
//   - `Authorization: Bearer <token>` matching one of API_TOKENS (scripts, service-to-service)
// Paths listed in WEBHOOK_PATHS skip the session check and instead require WEBHOOK_SECRET,
// sent as the `X-Webhook-Secret` header or a `?secret=` query parameter.

const crypto = require('crypto');
const express = require('express');

const SESSION_COOKIE = 'wa_session';
const STATE_COOKIE = 'wa_login_state';

const list = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);
const b64url = (buf) => Buffer.from(buf).toString('base64url');

function safeEqual(a, b) {
  // Hash first so differing lengths don't short-circuit timingSafeEqual.
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function cookie(name, value, maxAgeSec) {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSec}; HttpOnly; Secure; SameSite=Lax`;
}

// Only allow same-site relative redirects after login ("/x", not "//evil.com" or "https://...").
function safeNext(next) {
  return typeof next === 'string' && /^\/(?![/\\])/.test(next) ? next : '/';
}

module.exports = function apiAuth(opts = {}) {
  const env = process.env;
  const cfg = {
    sessionSecret: opts.sessionSecret ?? env.SESSION_SECRET,
    allowedEmails: (opts.allowedEmails ?? list(env.ALLOWED_EMAILS)).map((e) => e.toLowerCase()),
    googleClientId: opts.googleClientId ?? env.LOGIN_GOOGLE_CLIENT_ID ?? env.GOOGLE_CLIENT_ID,
    googleClientSecret: opts.googleClientSecret ?? env.LOGIN_GOOGLE_CLIENT_SECRET ?? env.GOOGLE_CLIENT_SECRET,
    loginRedirectUri: opts.loginRedirectUri ?? env.LOGIN_REDIRECT_URI,
    apiTokens: opts.apiTokens ?? list(env.API_TOKENS),
    webhookSecret: opts.webhookSecret ?? env.WEBHOOK_SECRET,
    webhookPaths: opts.webhookPaths ?? list(env.WEBHOOK_PATHS),
    sessionDays: Number(opts.sessionDays ?? env.SESSION_DAYS ?? 30),
    loginRoutes: opts.loginRoutes ?? true,
    fetch: opts.fetch ?? globalThis.fetch,
  };

  // Fail closed: refuse to start rather than serve an unprotected API.
  const missing = [];
  if (!cfg.sessionSecret || cfg.sessionSecret.length < 32) missing.push('SESSION_SECRET (>= 32 chars)');
  if (!cfg.allowedEmails.length) missing.push('ALLOWED_EMAILS');
  if (cfg.loginRoutes) {
    if (!cfg.googleClientId) missing.push('LOGIN_GOOGLE_CLIENT_ID');
    if (!cfg.googleClientSecret) missing.push('LOGIN_GOOGLE_CLIENT_SECRET');
    if (!cfg.loginRedirectUri) missing.push('LOGIN_REDIRECT_URI');
  }
  if (cfg.webhookPaths.length && (!cfg.webhookSecret || cfg.webhookSecret.length < 24)) {
    missing.push('WEBHOOK_SECRET (>= 24 chars)');
  }
  if (missing.length) throw new Error(`api-auth: missing config: ${missing.join(', ')}`);

  const hmac = (data) => b64url(crypto.createHmac('sha256', cfg.sessionSecret).update(data).digest());

  function sign(obj) {
    const body = b64url(JSON.stringify(obj));
    return `${body}.${hmac(body)}`;
  }

  function verify(token) {
    if (typeof token !== 'string') return null;
    const [body, mac] = token.split('.');
    if (!body || !mac || !safeEqual(mac, hmac(body))) return null;
    try {
      const obj = JSON.parse(Buffer.from(body, 'base64url').toString());
      return obj.exp > Date.now() ? obj : null;
    } catch {
      return null;
    }
  }

  // Exposed so the Google Calendar connect flow (/auth/google -> /auth/callback) can bind its
  // OAuth `state` to a signed-in user; that callback lands on the Railway domain where the
  // session cookie isn't sent, so the state is what proves the request started from Carl.
  const signState = (data = {}, ttlMs = 10 * 60 * 1000) =>
    sign({ ...data, n: b64url(crypto.randomBytes(12)), exp: Date.now() + ttlMs });
  const verifyState = (state) => verify(state);

  function sessionEmail(req) {
    const s = verify(parseCookies(req.headers.cookie)[SESSION_COOKIE]);
    return s && cfg.allowedEmails.includes(s.email) ? s.email : null;
  }

  function hasApiToken(req) {
    const m = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
    return !!m && cfg.apiTokens.some((t) => safeEqual(t, m[1].trim()));
  }

  function hasWebhookSecret(req) {
    const given = req.headers['x-webhook-secret'] || (req.query && req.query.secret);
    return !!cfg.webhookSecret && typeof given === 'string' && safeEqual(given, cfg.webhookSecret);
  }

  const isWebhookPath = (req) => cfg.webhookPaths.includes((req.originalUrl || req.url).split('?')[0]);

  function deny(req, res) {
    // Browser navigations (e.g. clicking "Connect Google Calendar") go to sign-in; fetches get 401.
    if (req.method === 'GET' && /text\/html/.test(req.headers.accept || '') && cfg.loginRoutes) {
      return res.redirect(302, `/auth/login?next=${encodeURIComponent(req.originalUrl)}`);
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }

  function requireWebhookSecret(req, res, next) {
    if (hasWebhookSecret(req)) return next();
    return res.status(401).json({ error: 'Unauthorized' });
  }

  function requireAuth(req, res, next) {
    if (req.method === 'OPTIONS') return next(); // CORS preflight carries no credentials
    if (isWebhookPath(req)) return requireWebhookSecret(req, res, next);
    const email = sessionEmail(req);
    if (email) {
      req.user = { email };
      return next();
    }
    if (hasApiToken(req)) {
      req.user = { apiToken: true };
      return next();
    }
    return deny(req, res);
  }

  const routes = express.Router();

  if (cfg.loginRoutes) {
    routes.get('/auth/login', (req, res) => {
      const nonce = b64url(crypto.randomBytes(16));
      const state = sign({ nonce, next: safeNext(req.query.next), exp: Date.now() + 10 * 60 * 1000 });
      res.setHeader('Set-Cookie', cookie(STATE_COOKIE, state, 600));
      const params = new URLSearchParams({
        client_id: cfg.googleClientId,
        redirect_uri: cfg.loginRedirectUri,
        response_type: 'code',
        scope: 'openid email',
        prompt: 'select_account',
        state: nonce,
      });
      res.redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params}`);
    });

    routes.get('/auth/login/callback', async (req, res) => {
      const st = verify(parseCookies(req.headers.cookie)[STATE_COOKIE]);
      const clearState = cookie(STATE_COOKIE, '', 0);
      if (!st || typeof req.query.state !== 'string' || !safeEqual(st.nonce, req.query.state) || !req.query.code) {
        res.setHeader('Set-Cookie', clearState);
        return res.status(400).send('Sign-in expired or invalid. <a href="/auth/login">Try again</a>.');
      }
      try {
        const r = await cfg.fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code: String(req.query.code),
            client_id: cfg.googleClientId,
            client_secret: cfg.googleClientSecret,
            redirect_uri: cfg.loginRedirectUri,
            grant_type: 'authorization_code',
          }),
        });
        const tok = await r.json();
        if (!r.ok || !tok.id_token) throw new Error(tok.error || `token exchange ${r.status}`);
        // The ID token came straight from Google's token endpoint over TLS, authenticated with our
        // client secret, so its claims can be trusted without a JWKS signature check (OIDC 3.1.3.7).
        const claims = JSON.parse(Buffer.from(tok.id_token.split('.')[1], 'base64url').toString());
        const email = String(claims.email || '').toLowerCase();
        const okIssuer = ['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss);
        if (!okIssuer || claims.aud !== cfg.googleClientId || claims.email_verified !== true ||
            !cfg.allowedEmails.includes(email)) {
          res.setHeader('Set-Cookie', clearState);
          return res.status(403).send(`${email || 'This account'} is not allowed to use this app.`);
        }
        const maxAge = Math.round(cfg.sessionDays * 86400);
        res.setHeader('Set-Cookie', [
          clearState,
          cookie(SESSION_COOKIE, sign({ email, exp: Date.now() + maxAge * 1000 }), maxAge),
        ]);
        return res.redirect(302, safeNext(st.next));
      } catch (e) {
        console.error('api-auth: login failed:', e.message);
        res.setHeader('Set-Cookie', clearState);
        return res.status(502).send('Sign-in failed. <a href="/auth/login">Try again</a>.');
      }
    });
  }

  routes.get('/auth/me', (req, res) => {
    const email = sessionEmail(req);
    return email ? res.json({ email }) : res.status(401).json({ error: 'Unauthorized' });
  });

  routes.all('/auth/logout', (req, res) => {
    res.setHeader('Set-Cookie', cookie(SESSION_COOKIE, '', 0));
    res.redirect(302, '/');
  });

  return { routes, requireAuth, requireWebhookSecret, signState, verifyState };
};
