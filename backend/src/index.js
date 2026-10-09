import { verifyGoogleIdToken, signSession, verifySession } from './auth.js';
import { ALL_TEAMS, parsePath, collectionKind, normalizeTeams, canReadDoc, canWriteDoc, canReadSheets, canWriteSheets, matchesWhere, deepMerge, isFounder } from './rules.js';
import { appendSheetRow, readSheetCsv, textToBase64 } from './sheets.js';
import { createUser, deleteDoc, findUser, getDoc, getUser, listDocs, listUsers, putDoc, updateUser } from './store.js';
import { enqueueNotification } from './notify.js';

const MAX_BODY_BYTES = 256 * 1024;
const MAX_SYNC_QUERIES = 80;
class HttpError extends Error { constructor(status, code, message) { super(message); this.status = status; this.code = code; } }
const env = () => process.env;
const plainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const publicUser = (user) => ({ id: user.id, email: user.email, name: user.name, picture: user.picture, role: user.role, teams: user.teams });

function corsHeaders(request) {
  const origin = request.headers.get('origin') || '';
  const allowed = String(env().ALLOWED_ORIGINS || '').split(',').map((v) => v.trim()).filter(Boolean);
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

async function readJson(request) {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, 'invalid_argument', 'Body too large');
  try { return text ? JSON.parse(text) : {}; } catch { throw new HttpError(400, 'invalid_argument', 'Invalid JSON'); }
}

function toUser(row) {
  if (!row) return null;
  return { id: row.id, email: row.email, name: row.name, picture: row.picture, role: row.role, memberRole: row.memberRole || '', teams: normalizeTeams(row.teams), active: row.active !== false };
}

async function currentUser(request) {
  const header = request.headers.get('authorization') || '';
  const cookie = request.headers.get('cookie')?.match(/(?:^|;\s*)team_hub_session=([^;]+)/)?.[1];
  const token = header.startsWith('Bearer ') ? header.slice(7) : cookie;
  const userId = await verifySession(token, env().SESSION_SECRET);
  if (!userId) return null;
  const user = toUser(await getUser(env(), userId));
  return user && user.active ? user : null;
}

async function requireUser(request) { const user = await currentUser(request); if (!user) throw new HttpError(401, 'not_granted', 'Sign in required'); return user; }

async function upsertUser({ sub, email, name, picture }) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const admins = String(env().ADMIN_EMAILS || '').split(',').map((v) => v.trim().toLowerCase()).filter(Boolean);
  const existing = await findUser(env(), sub, normalizedEmail); const now = new Date().toISOString();
  if (existing) {
    const role = admins.includes(normalizedEmail) ? 'founder' : (existing.role === 'admin' ? 'founder' : existing.role);
    await updateUser(env(), existing.id, { googleSub: sub, email: normalizedEmail, name: name || existing.name, picture: picture || existing.picture, role, updatedAt: now });
    return toUser({ ...existing, googleSub: sub, email: normalizedEmail, name: name || existing.name, picture: picture || existing.picture, role });
  }
  const id = `u_${crypto.randomUUID().replace(/-/g, '').slice(0, 22)}`;
  const role = admins.includes(normalizedEmail) ? 'founder' : 'member';
  const user = { id, googleSub: sub, email: normalizedEmail, name: name || normalizedEmail, picture: picture || '', role, teams: [], active: true, createdAt: now, updatedAt: now };
  await createUser(env(), user); return toUser(user);
}

async function listDepts(user) {
  return (await listUsers(env())).map(toUser).filter((row) => canReadDoc(user, { kind: 'depts' }, row.id, row)).map((row) => ({ id: row.id, data: { teams: row.teams, founder: isFounder(row), manager: row.role === 'manager' } }));
}

async function listCollection(user, collection, where) {
  const kind = collectionKind(collection); if (!kind) throw new HttpError(400, 'invalid_argument', 'Unknown collection');
  if (kind.kind === 'depts') return listDepts(user);
  if (kind.kind === 'members') return (await listUsers(env())).map(toUser).filter((row) => canReadDoc(user, kind, row.id, row)).map((row) => ({ id: row.id, data: { role: (row.memberRole || '') } })).filter((row) => matchesWhere(row.data, where));
  return (await listDocs(env(), collection)).filter((row) => canReadDoc(user, kind, row.id, row.data) && matchesWhere(row.data, where));
}

async function notify(event, actor) {
  try { await enqueueNotification(env(), { ...event, actor: actor.id, actorName: actor.name }); } catch (error) { console.error('notification enqueue failed', error); }
}

async function writeDepts(user, id, body) {
  if (!canWriteDoc(user, { kind: 'depts' }, id, null, body)) throw new HttpError(403, 'invalid_argument', 'Not allowed');
  if (!await getUser(env(), id)) throw new HttpError(404, 'invalid_argument', 'Unknown user');
  const fields = { updatedAt: new Date().toISOString() };
  if ('teams' in body) fields.teams = normalizeTeams(body.teams);
  if ('manager' in body) fields.role = body.manager ? 'manager' : 'member';
  if ('admin' in body) fields.role = body.admin ? 'manager' : 'member';
  await updateUser(env(), id, fields); await notify({ action: 'updated', collection: 'depts', id, newData: fields }, user);
}

async function handleDoc(request, user, url) {
  const parsed = parsePath(url.searchParams.get('path')); const kind = parsed && collectionKind(parsed.collection);
  if (!parsed || !kind) throw new HttpError(400, 'invalid_argument', 'Invalid path');
  const method = request.method;
  if (kind.kind === 'depts') {
    if (method === 'GET') { const found = (await listDepts(user)).find((row) => row.id === parsed.id); return found ? { exists: true, data: found.data } : { exists: false }; }
    if (method === 'PUT' || method === 'PATCH') { const body = await readJson(request); if (!plainObject(body)) throw new HttpError(400, 'invalid_argument', 'Body must be an object'); await writeDepts(user, parsed.id, body); return { ok: true }; }
    throw new HttpError(405, 'invalid_argument', 'Method not allowed');
  }
  if (kind.kind === 'members') {
    const target = await getUser(env(), parsed.id);
    if (method === 'GET') { if (!target || !canReadDoc(user, kind, parsed.id, target)) return { exists: false }; return { exists: true, data: { role: target.memberRole || '' } }; }
    if (method !== 'PUT' && method !== 'PATCH') throw new HttpError(405, 'invalid_argument', 'Method not allowed');
    const body = await readJson(request); if (!plainObject(body)) throw new HttpError(400, 'invalid_argument', 'Body must be an object');
    if (!target || !canWriteDoc(user, kind, parsed.id, target, body)) throw new HttpError(403, 'invalid_argument', 'Not allowed');
    const nextRole = method === 'PATCH' ? deepMerge({ role: target.memberRole || '' }, body).role : body.role;
    await updateUser(env(), parsed.id, { memberRole: String(nextRole || '').slice(0, 40), updatedAt: new Date().toISOString() });
    await notify({ action: method === 'PUT' ? 'created' : 'updated', collection: 'members', id: parsed.id, newData: { role: nextRole } }, user);
    return { ok: true };
  }
  const existing = await getDoc(env(), parsed.collection, parsed.id);
  if (method === 'GET') { if (!existing || !canReadDoc(user, kind, parsed.id, existing.data)) return { exists: false }; return { exists: true, data: existing.data, version: existing.version }; }
  if (method === 'DELETE') {
    if (!existing) return { ok: true }; if (!canWriteDoc(user, kind, parsed.id, existing.data, null)) throw new HttpError(403, 'invalid_argument', 'Not allowed');
    await deleteDoc(env(), parsed.collection, parsed.id); await notify({ action: 'deleted', collection: parsed.collection, id: parsed.id, oldData: existing.data }, user); return { ok: true };
  }
  if (method !== 'PUT' && method !== 'PATCH') throw new HttpError(405, 'invalid_argument', 'Method not allowed');
  const body = await readJson(request); if (!plainObject(body)) throw new HttpError(400, 'invalid_argument', 'Body must be an object');
  if (method === 'PATCH' && !existing) throw new HttpError(404, 'invalid_argument', 'Document does not exist');
  const next = method === 'PATCH' ? deepMerge(existing.data, body) : body;
  if (!canWriteDoc(user, kind, parsed.id, existing?.data || null, next)) throw new HttpError(403, 'invalid_argument', 'Not allowed');
  if (JSON.stringify(next).length > MAX_BODY_BYTES) throw new HttpError(413, 'invalid_argument', 'Document too large');
  await putDoc(env(), parsed.collection, parsed.id, next, user.id, (existing?.version || 0) + 1);
  await notify({ action: method === 'PUT' ? 'created' : 'updated', collection: parsed.collection, id: parsed.id, oldData: existing?.data, newData: next, owner: kind.owner }, user);
  return { ok: true };
}

async function route(request) {
  const url = new URL(request.url); const path = url.pathname.replace(/\/+$/, '') || '/'; const method = request.method;
  if (path === '/api/health') return { ok: true, service: 'team-hub-api' };
  if (path === '/api/auth/google' && method === 'POST') { const body = await readJson(request); let claims; try { claims = await verifyGoogleIdToken(body.credential, env()); } catch (error) { throw new HttpError(401, 'not_granted', `Google sign-in failed: ${error.message}`); } const user = await upsertUser(claims); if (!user.active) throw new HttpError(403, 'not_granted', 'Account disabled'); return { token: await signSession(user.id, env().SESSION_SECRET), user: publicUser(user) }; }
  if (path === '/api/auth/test' && method === 'POST' && env().ALLOW_TEST_LOGIN === '1') { const body = await readJson(request); const email = String(body.email || '').trim().toLowerCase(); if (!/^[^@\s]+@example\.test$/.test(email)) throw new HttpError(400, 'invalid_argument', 'Test logins use @example.test'); const user = await upsertUser({ sub: `test:${email}`, email, name: body.name || email, picture: '' }); return { token: await signSession(user.id, env().SESSION_SECRET), user: publicUser(user) }; }
  const user = await requireUser(request);
  if (path === '/api/me' && method === 'GET') return { user: publicUser(user) };
  if (path === '/api/users' && method === 'GET') { const rows = (await listUsers(env())).map(toUser).filter((row) => row.active); const visible = isFounder(user) || user.teams.length > 0; return { users: rows.filter((row) => visible || row.id === user.id).map((row) => ({ id: row.id, name: row.name, picture: row.picture, ...(isFounder(user) ? { email: row.email } : {}) })) }; }
  if (path === '/api/sync' && method === 'POST') { const body = await readJson(request); const queries = Array.isArray(body.queries) ? body.queries : []; if (queries.length > MAX_SYNC_QUERIES) throw new HttpError(400, 'resource_exhausted', 'Too many queries'); const results = []; for (const query of queries) { try { results.push({ docs: await listCollection(user, String(query.collection || ''), Array.isArray(query.where) ? query.where : []) }); } catch (error) { results.push({ error: error.code || 'invalid_argument' }); } } return { results, user: publicUser(user) }; }
  if (path === '/api/doc') return handleDoc(request, user, url);
  const sheet = path.match(/^\/api\/sheets\/([A-Za-z0-9_-]{5,120})$/);
  if (sheet && method === 'GET') { if (!canReadSheets(user)) throw new HttpError(403, 'not_in_manifest', 'Not allowed'); const allowed = String(env().HR_SHEET_IDS || '').split(',').map((v) => v.trim()).filter(Boolean); if (!allowed.includes(sheet[1])) throw new HttpError(404, 'tool_error', 'Unknown sheet'); try { return { content: textToBase64(await readSheetCsv(sheet[1], env())) }; } catch (error) { if (error.status === 403 || error.status === 404) throw new HttpError(502, 'tool_error', 'Sheet is not shared with the service account'); throw new HttpError(502, 'server_unavailable', 'Google Sheets is unavailable'); } }
  const sheetRow = path.match(/^\/api\/sheets\/([A-Za-z0-9_-]{5,120})\/rows$/);
  if (sheetRow && method === 'POST') { if (!canWriteSheets(user)) throw new HttpError(403, 'not_in_manifest', 'Not allowed'); const allowed = String(env().HR_SHEET_IDS || '').split(',').map((v) => v.trim()).filter(Boolean); if (!allowed.includes(sheetRow[1])) throw new HttpError(404, 'tool_error', 'Unknown sheet'); const body = await readJson(request); if (!plainObject(body)) throw new HttpError(400, 'invalid_argument', 'Row must be an object'); try { await appendSheetRow(sheetRow[1], body, env()); return { ok: true }; } catch (error) { if (error.status === 403 || error.status === 404) throw new HttpError(502, 'tool_error', 'Таблицата не позволява запис от сервизния акаунт'); throw new HttpError(502, 'server_unavailable', 'Google Sheets is unavailable'); } }
  throw new HttpError(404, 'invalid_argument', 'Not found');
}

function eventRequest(event) {
  const headers = new Headers(event.headers || {}); const method = event.requestContext?.http?.method || event.httpMethod || 'GET'; const rawBody = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString() : event.body || '';
  const query = event.rawQueryString ? `?${event.rawQueryString}` : '';
  return new Request(`https://${event.requestContext?.http?.domainName || 'localhost'}${event.rawPath || event.path || '/'}${query}`, { method, headers, body: ['GET', 'HEAD'].includes(method) ? undefined : rawBody });
}

export async function handler(event) {
  const request = event.requestContext ? eventRequest(event) : event; const cors = corsHeaders(request);
  if (request.method === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  try { const body = await route(request); return { statusCode: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors }, body: JSON.stringify(body) }; }
  catch (error) { if (error instanceof HttpError) return { statusCode: error.status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors }, body: JSON.stringify({ error: error.message, code: error.code }) }; console.error(error); return { statusCode: 500, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors }, body: JSON.stringify({ error: 'Internal error', code: 'unavailable' }) }; }
}

export { ALL_TEAMS };
