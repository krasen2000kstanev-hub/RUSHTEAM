import { verifyGoogleIdToken, signSession, verifySession } from './auth.js';
import {
  ALL_TEAMS, parsePath, collectionKind, normalizeTeams, canReadDoc, canWriteDoc, canReadSheets, matchesWhere, deepMerge,
} from './rules.js';
import { readSheetCsv, textToBase64 } from './sheets.js';

const MAX_BODY_BYTES = 256 * 1024;
const MAX_SYNC_QUERIES = 80;

class HttpError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean);
  const local = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin);
  const headers = { Vary: 'Origin' };
  if (origin && (allowed.includes(origin) || local)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type';
    headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
    headers['Access-Control-Max-Age'] = '86400';
  }
  return headers;
}

const json = (body, status, headers) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
});

async function readJson(request) {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, 'invalid_argument', 'Body too large');
  try { return text ? JSON.parse(text) : {}; } catch { throw new HttpError(400, 'invalid_argument', 'Invalid JSON'); }
}

const plainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function toUser(row) {
  if (!row) return null;
  let teams = [];
  try { teams = normalizeTeams(JSON.parse(row.teams || '[]')); } catch { teams = []; }
  return { id: row.id, email: row.email, name: row.name, picture: row.picture, role: row.role, teams, active: row.active === 1 };
}

async function currentUser(request, env) {
  const header = request.headers.get('Authorization') || '';
  if (!header.startsWith('Bearer ')) return null;
  const userId = await verifySession(header.slice(7), env.SESSION_SECRET);
  if (!userId) return null;
  const user = toUser(await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(userId).first());
  return user && user.active ? user : null;
}

async function requireUser(request, env) {
  const user = await currentUser(request, env);
  if (!user) throw new HttpError(401, 'not_granted', 'Sign in required');
  return user;
}

const publicUser = (user) => ({ id: user.id, email: user.email, name: user.name, picture: user.picture, role: user.role, teams: user.teams });

async function upsertUser(env, { sub, email, name, picture }) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const admins = String(env.ADMIN_EMAILS || '').split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
  const now = new Date().toISOString();
  const existing = await env.DB.prepare('SELECT * FROM users WHERE google_sub=? OR email=? LIMIT 1').bind(sub, normalizedEmail).first();
  if (existing) {
    // Имейл от ADMIN_EMAILS винаги е мениджър; останалите запазват ролята си.
    const role = admins.includes(normalizedEmail) ? 'admin' : existing.role;
    await env.DB.prepare('UPDATE users SET google_sub=?, email=?, name=?, picture=?, role=?, updated_at=? WHERE id=?')
      .bind(sub, normalizedEmail, name || existing.name, picture || existing.picture, role, now, existing.id).run();
    return toUser(await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(existing.id).first());
  }
  const id = `u_${crypto.randomUUID().replace(/-/g, '').slice(0, 22)}`;
  const role = admins.includes(normalizedEmail) ? 'admin' : 'member';
  await env.DB.prepare('INSERT INTO users (id,google_sub,email,name,picture,role,teams,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,1,?,?)')
    .bind(id, sub, normalizedEmail, name || normalizedEmail, picture || '', role, '[]', now, now).run();
  return toUser(await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(id).first());
}

// „depts“ е виртуална колекция върху таблицата users: екипи и роля на всеки човек.
async function listDepts(env, user) {
  const rows = (await env.DB.prepare('SELECT * FROM users WHERE active=1').all()).results || [];
  return rows.map(toUser).filter((row) => canReadDoc(user, { kind: 'depts' }, row.id, null))
    .map((row) => ({ id: row.id, data: { teams: row.teams, admin: row.role === 'admin' } }));
}

async function listCollection(env, user, collection, where) {
  const kind = collectionKind(collection);
  if (!kind) throw new HttpError(400, 'invalid_argument', 'Unknown collection');
  if (kind.kind === 'depts') return listDepts(env, user);
  const rows = (await env.DB.prepare('SELECT id, data FROM docs WHERE collection=? ORDER BY id').bind(collection).all()).results || [];
  const out = [];
  for (const row of rows) {
    let data;
    try { data = JSON.parse(row.data); } catch { continue; }
    if (canReadDoc(user, kind, row.id, data) && matchesWhere(data, where)) out.push({ id: row.id, data });
  }
  return out;
}

async function loadDoc(env, path) {
  const row = await env.DB.prepare('SELECT data, version FROM docs WHERE path=?').bind(path).first();
  if (!row) return null;
  try { return { data: JSON.parse(row.data), version: row.version }; } catch { return null; }
}

async function writeDepts(env, user, id, body) {
  if (!canWriteDoc(user, { kind: 'depts' }, id, null, body)) throw new HttpError(403, 'invalid_argument', 'Not allowed');
  const target = await env.DB.prepare('SELECT id FROM users WHERE id=?').bind(id).first();
  if (!target) throw new HttpError(404, 'invalid_argument', 'Unknown user');
  const sets = ['updated_at=?']; const values = [new Date().toISOString()];
  if ('teams' in body) { sets.push('teams=?'); values.push(JSON.stringify(normalizeTeams(body.teams))); }
  if ('admin' in body) { sets.push('role=?'); values.push(body.admin ? 'admin' : 'member'); }
  await env.DB.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id=?`).bind(...values, id).run();
}

async function handleDoc(request, env, user, url) {
  const parsed = parsePath(url.searchParams.get('path'));
  const kind = parsed && collectionKind(parsed.collection);
  if (!parsed || !kind) throw new HttpError(400, 'invalid_argument', 'Invalid path');
  const method = request.method;

  if (kind.kind === 'depts') {
    if (method === 'GET') {
      const found = (await listDepts(env, user)).find((row) => row.id === parsed.id);
      return found ? { exists: true, data: found.data } : { exists: false };
    }
    if (method === 'PUT' || method === 'PATCH') {
      const body = await readJson(request);
      if (!plainObject(body)) throw new HttpError(400, 'invalid_argument', 'Body must be an object');
      await writeDepts(env, user, parsed.id, body);
      return { ok: true };
    }
    throw new HttpError(405, 'invalid_argument', 'Method not allowed');
  }

  const existing = await loadDoc(env, parsed.path);
  if (method === 'GET') {
    if (!existing || !canReadDoc(user, kind, parsed.id, existing.data)) return { exists: false };
    return { exists: true, data: existing.data, version: existing.version };
  }
  if (method === 'DELETE') {
    if (!existing) return { ok: true };
    if (!canWriteDoc(user, kind, parsed.id, existing.data, null)) throw new HttpError(403, 'invalid_argument', 'Not allowed');
    await env.DB.prepare('DELETE FROM docs WHERE path=?').bind(parsed.path).run();
    return { ok: true };
  }
  if (method !== 'PUT' && method !== 'PATCH') throw new HttpError(405, 'invalid_argument', 'Method not allowed');

  const body = await readJson(request);
  if (!plainObject(body)) throw new HttpError(400, 'invalid_argument', 'Body must be an object');
  if (method === 'PATCH' && !existing) throw new HttpError(404, 'invalid_argument', 'Document does not exist');
  const next = method === 'PATCH' ? deepMerge(existing.data, body) : body;
  // Скрит документ изглежда като липсващ: без право на запис отговорът е един и същ.
  if (!canWriteDoc(user, kind, parsed.id, existing?.data || null, next)) throw new HttpError(403, 'invalid_argument', 'Not allowed');
  const serialized = JSON.stringify(next);
  if (serialized.length > MAX_BODY_BYTES) throw new HttpError(413, 'invalid_argument', 'Document too large');
  const now = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO docs (path,collection,id,data,version,updated_by,updated_at) VALUES (?,?,?,?,1,?,?)
    ON CONFLICT(path) DO UPDATE SET data=excluded.data, version=docs.version+1, updated_by=excluded.updated_by, updated_at=excluded.updated_at`)
    .bind(parsed.path, parsed.collection, parsed.id, serialized, user.id, now).run();
  return { ok: true };
}

async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const method = request.method;

  if (path === '/api/health') return { ok: true, service: 'team-hub-api' };

  if (path === '/api/auth/google' && method === 'POST') {
    const body = await readJson(request);
    let claims;
    try { claims = await verifyGoogleIdToken(body.credential, env); } catch (error) { throw new HttpError(401, 'not_granted', `Google sign-in failed: ${error.message}`); }
    const user = await upsertUser(env, claims);
    if (!user.active) throw new HttpError(403, 'not_granted', 'Account disabled');
    return { token: await signSession(user.id, env.SESSION_SECRET), user: publicUser(user) };
  }

  // Вход без Google само за локални тестове (wrangler.test.toml). В продукция променливата липсва.
  if (path === '/api/auth/test' && method === 'POST' && env.ALLOW_TEST_LOGIN === '1') {
    const body = await readJson(request);
    const email = String(body.email || '').trim().toLowerCase();
    if (!/^[^@\s]+@example\.test$/.test(email)) throw new HttpError(400, 'invalid_argument', 'Test logins use @example.test');
    const user = await upsertUser(env, { sub: `test:${email}`, email, name: body.name || email, picture: '' });
    return { token: await signSession(user.id, env.SESSION_SECRET), user: publicUser(user) };
  }

  const user = await requireUser(request, env);

  if (path === '/api/me' && method === 'GET') return { user: publicUser(user) };

  if (path === '/api/users' && method === 'GET') {
    const rows = (await env.DB.prepare('SELECT * FROM users WHERE active=1').all()).results || [];
    const visible = user.role === 'admin' || user.teams.length > 0;
    return {
      users: rows.map(toUser).filter((row) => visible || row.id === user.id)
        .map((row) => ({ id: row.id, name: row.name, picture: row.picture, ...(user.role === 'admin' ? { email: row.email } : {}) })),
    };
  }

  if (path === '/api/sync' && method === 'POST') {
    const body = await readJson(request);
    const queries = Array.isArray(body.queries) ? body.queries : [];
    if (queries.length > MAX_SYNC_QUERIES) throw new HttpError(400, 'resource_exhausted', 'Too many queries');
    const results = [];
    for (const query of queries) {
      try { results.push({ docs: await listCollection(env, user, String(query.collection || ''), Array.isArray(query.where) ? query.where : []) }); }
      catch (error) { results.push({ error: error.code || 'invalid_argument' }); }
    }
    return { results, user: publicUser(user) };
  }

  if (path === '/api/doc') return handleDoc(request, env, user, url);

  const sheet = path.match(/^\/api\/sheets\/([A-Za-z0-9_-]{5,120})$/);
  if (sheet && method === 'GET') {
    if (!canReadSheets(user)) throw new HttpError(403, 'not_in_manifest', 'Not allowed');
    const allowed = String(env.HR_SHEET_IDS || '').split(',').map((value) => value.trim()).filter(Boolean);
    if (!allowed.includes(sheet[1])) throw new HttpError(404, 'tool_error', 'Unknown sheet');
    try { return { content: textToBase64(await readSheetCsv(sheet[1], env)) }; }
    catch (error) {
      if (error.status === 403 || error.status === 404) throw new HttpError(502, 'tool_error', 'Sheet is not shared with the service account');
      throw new HttpError(502, 'server_unavailable', 'Google Sheets is unavailable');
    }
  }

  throw new HttpError(404, 'invalid_argument', 'Not found');
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    try {
      return json(await route(request, env), 200, cors);
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message, code: error.code }, error.status, cors);
      console.error(error);
      return json({ error: 'Internal error', code: 'unavailable' }, 500, cors);
    }
  },
};

export { ALL_TEAMS };
