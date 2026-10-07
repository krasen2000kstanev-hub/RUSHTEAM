// Проверка на живо срещу локалния Worker:  npm run migrate:local && npm run dev   →   node tests/api.e2e.mjs
import assert from 'node:assert/strict';
const API = process.env.API || 'http://127.0.0.1:8787';
const run = Date.now().toString(36);
async function call(token, method, path, body) {
  const response = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  let data = null; try { data = await response.json(); } catch {}
  return { status: response.status, data };
}
const login = async (email, name) => (await call(null, 'POST', '/api/auth/test', { email, name })).data;
const doc = (path) => `/api/doc?path=${encodeURIComponent(path)}`;
const list = async (token, collection, where = []) => (await call(token, 'POST', '/api/sync', { queries: [{ collection, where }] })).data.results[0];
let passed = 0; const ok = (name, fn) => fn().then(() => { passed++; console.log('PASS', name); }, (e) => { console.log('FAIL', name, '\n   ', e.message); process.exitCode = 1; });

const admin = await login('admin@example.test', 'Админ');
const des = await login(`des-${run}@example.test`, 'Дизайнер');
const med = await login(`med-${run}@example.test`, 'Монтажист');
const hr = await login(`hr-${run}@example.test`, 'Рекрутър');

await ok('без вход няма достъп', async () => {
  assert.equal((await call(null, 'GET', '/api/me')).status, 401);
  assert.equal((await call('x.y', 'POST', '/api/sync', { queries: [] })).status, 401);
});
await ok('имейл от ADMIN_EMAILS става мениджър, останалите са без екип', async () => {
  assert.equal(admin.user.role, 'admin'); assert.equal(des.user.role, 'member'); assert.deepEqual(des.user.teams, []);
});
await ok('нов човек без екип не вижда нищо и не може да пише задачи', async () => {
  await call(admin.token, 'PUT', doc(`videos/v-${run}`), { title: 'Видео', stage: 'idea' });
  assert.equal((await list(des.token, 'videos')).docs.length, 0);
  assert.equal((await call(des.token, 'PUT', doc(`videos/x-${run}`), { title: 'x', team: 'design' })).status, 403);
  assert.equal((await call(des.token, 'GET', doc(`videos/v-${run}`))).data.exists, false);
});
await ok('само мениджър раздава екипи; никой не си дава сам', async () => {
  assert.equal((await call(des.token, 'PATCH', doc(`depts/${des.user.id}`), { teams: ['hr'], admin: true })).status, 403);
  assert.equal((await call(des.token, 'PATCH', doc(`depts/${med.user.id}`), { teams: ['hr'] })).status, 403);
  assert.equal((await call(admin.token, 'PATCH', doc(`depts/${des.user.id}`), { teams: ['design', 'root'] })).status, 200);
  assert.equal((await call(admin.token, 'PATCH', doc(`depts/${med.user.id}`), { teams: ['media'] })).status, 200);
  assert.equal((await call(admin.token, 'PATCH', doc(`depts/${hr.user.id}`), { teams: ['hr'] })).status, 200);
  assert.deepEqual((await call(des.token, 'GET', '/api/me')).data.user.teams, ['design']);
  assert.equal((await call(admin.token, 'PATCH', doc(`depts/${admin.user.id}`), { admin: false })).status, 403);
});
await ok('задачите се виждат само от своя екип', async () => {
  await call(admin.token, 'PUT', doc(`videos/w-${run}`), { title: 'Сайт', team: 'web', stage: 'brief' });
  assert.equal((await call(des.token, 'PUT', doc(`videos/d-${run}`), { title: 'Лого', team: 'design', stage: 'brief' })).status, 200);
  const seen = (await list(des.token, 'videos')).docs.map((d) => d.id);
  assert.ok(seen.includes(`d-${run}`)); assert.ok(!seen.includes(`w-${run}`)); assert.ok(!seen.includes(`v-${run}`));
  assert.ok((await list(med.token, 'videos')).docs.every((d) => (d.data.team || 'media') === 'media'));
  assert.equal((await list(hr.token, 'videos')).docs.length, 0);
});
await ok('не може да се премести задача в чужд екип или да се пипа чужда', async () => {
  assert.equal((await call(des.token, 'PATCH', doc(`videos/d-${run}`), { team: 'web' })).status, 403);
  assert.equal((await call(des.token, 'PATCH', doc(`videos/w-${run}`), { title: 'хак' })).status, 403);
  assert.equal((await call(des.token, 'DELETE', doc(`videos/w-${run}`))).status, 403);
  assert.equal((await call(des.token, 'PATCH', doc(`videos/d-${run}`), { stage: 'work', check: [{ t: 'a', done: true }] })).status, 200);
  const got = (await call(des.token, 'GET', doc(`videos/d-${run}`))).data.data;
  assert.equal(got.stage, 'work'); assert.equal(got.title, 'Лого'); assert.equal(got.check[0].done, true);
});
await ok('времето е лично; мениджърът го вижда', async () => {
  const mine = `time/${med.user.id}/days/2026-10-07`;
  assert.equal((await call(med.token, 'PUT', doc(mine), { date: '2026-10-07', entries: { e1: { s: 1, e: 2 } } })).status, 200);
  assert.equal((await list(des.token, `time/${med.user.id}/days`)).docs.length, 0);
  assert.equal((await call(des.token, 'PUT', doc(mine), { date: '2026-10-07', entries: {} })).status, 403);
  assert.equal((await list(admin.token, `time/${med.user.id}/days`, [['date', '>=', '2026-10-01'], ['date', '<=', '2026-10-31']])).docs.length, 1);
  assert.equal((await list(admin.token, `time/${med.user.id}/days`, [['date', '>=', '2026-11-01']])).docs.length, 0);
});
await ok('клиенти: пише само мениджър; подборът не ги вижда', async () => {
  assert.equal((await call(med.token, 'PUT', doc(`clients/c-${run}`), { name: 'X' })).status, 403);
  assert.equal((await call(admin.token, 'PUT', doc(`clients/c-${run}`), { name: 'Клиент' })).status, 200);
  assert.ok((await list(med.token, 'clients')).docs.some((d) => d.id === `c-${run}`));
  assert.equal((await list(hr.token, 'clients')).docs.length, 0);
});
await ok('таблиците на подбора: само екип „Подбор“ и мениджъри, само разрешени таблици', async () => {
  assert.equal((await call(med.token, 'GET', '/api/sheets/sheet-a')).status, 403);
  assert.equal((await call(hr.token, 'GET', '/api/sheets/not-listed')).status, 404);
  assert.notEqual((await call(hr.token, 'GET', '/api/sheets/sheet-a')).status, 403);
});
await ok('непознати колекции и пътища се отказват', async () => {
  assert.equal((await call(admin.token, 'PUT', doc('users/u1'), { role: 'admin' })).status, 400);
  assert.equal((await call(admin.token, 'PUT', doc('videos/../x'), {})).status, 400);
  assert.equal((await list(admin.token, 'users')).error, 'invalid_argument');
  assert.equal((await call(admin.token, 'PUT', doc(`videos/a-${run}`), [1, 2])).status, 400);
  assert.equal((await call(admin.token, 'PATCH', doc(`videos/missing-${run}`), { a: 1 })).status, 404);
});
await ok('имейлите се виждат само от мениджър', async () => {
  assert.ok((await call(admin.token, 'GET', '/api/users')).data.users.every((u) => 'email' in u));
  assert.ok((await call(med.token, 'GET', '/api/users')).data.users.every((u) => !('email' in u)));
});
await ok('CORS: непознат сайт не получава разрешение', async () => {
  const bad = await fetch(API + '/api/health', { headers: { Origin: 'https://evil.example' } });
  assert.equal(bad.headers.get('access-control-allow-origin'), null);
  const good = await fetch(API + '/api/health', { headers: { Origin: 'http://127.0.0.1:8765' } });
  assert.equal(good.headers.get('access-control-allow-origin'), 'http://127.0.0.1:8765');
});
console.log(`${passed} passed`);
