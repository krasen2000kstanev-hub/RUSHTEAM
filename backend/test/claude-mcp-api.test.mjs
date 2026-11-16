// Цялата връзка с Claude през истинския API код, с база в паметта вместо DynamoDB.
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
const users = { u_me: { id: 'u_me', email: 'me@x.test', name: 'Аз', role: 'member', teams: ['media'], active: true }, u_hr: { id: 'u_hr', email: 'h@x.test', name: 'HR', role: 'member', teams: ['hr'], active: true } };
const docs = {}; const audits = [];
mock.module(new URL('../src/store.js', import.meta.url).href, { namedExports: {
  getUser: async (env, id) => users[id] || null, findUser: async () => null, listUsers: async () => Object.values(users), createUser: async () => {},
  updateUser: async (env, id, f) => { Object.assign(users[id], f); },
  getDoc: async (env, c, id) => docs[c + '/' + id] || null,
  listDocs: async (env, c) => Object.entries(docs).filter(([k]) => k.startsWith(c + '/') && k.split('/').length === c.split('/').length + 1).map(([k, v]) => ({ id: k.split('/').pop(), ...v })),
  putDoc: async (env, c, id, data, by, version) => { docs[c + '/' + id] = { data, version }; },
  deleteDoc: async () => {}, putAudit: async (env, e) => audits.push(e), listAudit: async () => [] } });
mock.module(new URL('../src/notify.js', import.meta.url).href, { namedExports: { enqueueNotification: async () => {} } });
process.env.SESSION_SECRET = 'x'.repeat(40);
const { handler } = await import(new URL('../src/index.js', import.meta.url).href);
const { signSession } = await import(new URL('../src/auth.js', import.meta.url).href);
const req = (method, path, body, token) => handler(new Request('https://api.test' + path, { method, headers: token ? { authorization: 'Bearer ' + token } : {}, body: body === undefined ? undefined : JSON.stringify(body) }));
const rpc = async (path, method, params, id = 1) => { const r = await req('POST', path, { jsonrpc: '2.0', id, method, params }); return { status: r.statusCode, body: r.body ? JSON.parse(r.body) : null }; };

test('key → mcp → real rules', async () => {
  const me = await signSession('u_me', process.env.SESSION_SECRET);
  assert.equal(JSON.parse((await req('GET', '/api/claude-key', undefined, me)).body).active, false);
  const made = JSON.parse((await req('POST', '/api/claude-key', undefined, me)).body);
  assert.match(made.path, /^\/mcp\/th_/);
  assert.notEqual(users.u_me.claudeKey, made.key.slice(3));
  assert.equal((await rpc('/mcp/th_wrongwrongwrongwrongwrong', 'tools/list')).status, 401);
  assert.equal((await rpc(made.path, 'initialize', { protocolVersion: '2025-06-18' })).body.result.serverInfo.name, 'team-hub');
  const note = await req('POST', made.path, { jsonrpc: '2.0', method: 'notifications/initialized' });
  assert.equal(note.statusCode, 202);
  const created = await rpc(made.path, 'tools/call', { name: 'save_board_item', arguments: { team: 'media', title: 'Видео от Claude' } });
  assert.equal(created.body.result.isError, undefined, JSON.stringify(created.body));
  const id = JSON.parse(created.body.result.content[0].text).id;
  assert.equal(docs['videos/' + id].data.stage, 'idea');
  assert.ok(audits.some((a) => a.collection === 'videos' && a.actor === 'u_me'));
  const moved = await rpc(made.path, 'tools/call', { name: 'save_board_item', arguments: { id, stage: 'edit', who: 'u_me' } });
  assert.equal(docs['videos/' + id].data.stage, 'edit', JSON.stringify(moved.body));
  const web = await rpc(made.path, 'tools/call', { name: 'save_board_item', arguments: { team: 'web', title: 'чужд отдел' } });
  assert.equal(web.body.result.isError, true); assert.match(web.body.result.content[0].text, /права/);
  const bad = await rpc(made.path, 'tools/call', { name: 'save_board_item', arguments: { id, who: 'u_hr' } });
  assert.equal(bad.body.result.isError, true);
  const goal = await rpc(made.path, 'tools/call', { name: 'set_my_goal', arguments: { goal: 10, what: 'видеа' } });
  assert.match(goal.body.result.content[0].text, /няма предишна/);
  const sch = await rpc(made.path, 'tools/call', { name: 'get_schedules', arguments: {} });
  assert.match(sch.body.result.content[0].text, /видеа/);
  await req('DELETE', '/api/claude-key', undefined, me);
  assert.equal((await rpc(made.path, 'tools/list')).status, 401);
});
