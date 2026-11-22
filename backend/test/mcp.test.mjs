import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BOARD_STAGES, handleMcp, weekOf } from '../src/mcp.js';

test('board stages mirror TEAMS in app.js', () => {
  const app = readFileSync(new URL('../../app.js', import.meta.url), 'utf8');
  const code = app.slice(app.indexOf('const STAGES='), app.indexOf('const TASK_TEMPLATES'));
  const TEAMS = new Function(`${code};return TEAMS;`)();
  assert.deepEqual(Object.fromEntries(Object.entries(TEAMS).map(([k, t]) => [k, t.stages])), BOARD_STAGES);
});

// Фалшива база: пази какво е записано, за да проверим какво праща Claude.
function fake(user = { id: 'u_me', name: 'Аз', role: 'member', teams: ['media'] }) {
  const db = {}; const calls = [];
  return {
    db, calls,
    deps: {
      user,
      users: async () => [{ id: 'u_me', name: 'Аз' }, { id: 'u_a', name: 'Колега' }],
      list: async (collection, where) => Object.entries(db).filter(([k, v]) => k.startsWith(`${collection}/`) && (where || []).every(([f, , val]) => v[f] === val)).map(([k, data]) => ({ id: k.split('/')[1], data })),
      doc: async (method, path, body) => { calls.push([method, path, body]); if (method === 'GET') return db[path] ? { exists: true, data: db[path] } : { exists: false }; db[path] = method === 'PATCH' ? { ...db[path], ...body } : body; return { ok: true }; },
    },
  };
}
const call = async (f, name, args) => { const out = await handleMcp({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }, f.deps); return { ...out.result, data: out.result.isError ? null : JSON.parse(out.result.content[0].text) }; };

test('protocol: initialize, tools/list, notifications', async () => {
  const f = fake();
  const init = await handleMcp({ jsonrpc: '2.0', id: 0, method: 'initialize', params: { protocolVersion: '2025-03-26' } }, f.deps);
  assert.equal(init.result.protocolVersion, '2025-03-26');
  assert.ok(init.result.capabilities.tools);
  const tools = (await handleMcp({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, f.deps)).result.tools;
  assert.ok(tools.some((t) => t.name === 'save_board_item'));
  // ChatGPT/Claude не питат за потвърждение при четене, само при запис.
  assert.ok(tools.every((t) => t.annotations && t.annotations.readOnlyHint === !t.name.match(/^(save|set|mark)_/)));
  assert.equal(await handleMcp({ jsonrpc: '2.0', method: 'notifications/initialized' }, f.deps), undefined);
  assert.equal((await handleMcp({ jsonrpc: '2.0', id: 3, method: 'nope' }, f.deps)).error.code, -32601);
});

test('board: create in first stage, move to done sets doneAt, only changed fields are sent', async () => {
  const f = fake();
  const { data } = await call(f, 'save_board_item', { team: 'media', title: 'Монтаж ДСК' });
  const path = `videos/${data.id}`;
  assert.equal(f.db[path].stage, 'idea');
  assert.equal(f.db[path].doneAt, 0);
  await call(f, 'save_board_item', { id: data.id, stage: 'done' });
  const patch = f.calls.at(-1);
  assert.equal(patch[0], 'PATCH');
  assert.deepEqual(Object.keys(patch[2]).sort(), ['doneAt', 'moved', 'stage']);
  assert.ok(f.db[path].doneAt > 0);
  const bad = await call(f, 'save_board_item', { id: data.id, stage: 'legal' });
  assert.equal(bad.isError, true);
  assert.deepEqual((await call(f, 'list_board', { team: 'media' })).data, []);
  assert.equal((await call(f, 'list_board', { team: 'media', include_done: true })).data[0].title, 'Монтаж ДСК');
});

test('shared task: a member is always a participant', async () => {
  const f = fake();
  const { data } = await call(f, 'save_shared_task', { title: 'Обади се', participants: ['u_a'] });
  assert.deepEqual(f.db[`tasks/${data.id}`].participants, ['u_me', 'u_a']);
  assert.equal(f.db[`tasks/${data.id}`].createdBy, 'u_me');
});

test('schedule and goal: kept together, goal compared with the last one', async () => {
  const f = fake();
  f.db['schedules/2026-11-09_u_me'] = { owner: 'u_me', week: '2026-11-09', goal: 20, goalWhat: 'часа' };
  await call(f, 'save_my_schedule', { date: '2026-11-19', days: { thu: { from: '09:00', to: '18:00', busy: [{ from: '12:00', to: '13:00' }] } } });
  const { data } = await call(f, 'set_my_goal', { date: '2026-11-19', goal: 30 });
  const rec = f.db['schedules/2026-11-16_u_me'];
  assert.match(data.level, /висока/);
  assert.equal(rec.goalPrev, 20);
  assert.equal(rec.goalWhat, 'часа');
  assert.equal(rec.days.thu.busy[0].from, '12:00');
  assert.equal(weekOf('2026-11-22'), '2026-11-16');
});

test('trainings: list hides past sessions, mark toggles only me', async () => {
  const f = fake();
  f.db['trainings/old'] = { kind: 'session', team: 'media', title: 'Стара', date: '2020-01-01', people: [] };
  const { data } = await call(f, 'save_training', { team: 'media', kind: 'session', title: 'Светлина', date: '2099-01-01', start: '10:00' });
  assert.equal((await call(f, 'save_training', { team: 'media', kind: 'session', title: 'Без дата' })).isError, true);
  f.db[`trainings/${data.id}`].people = ['u_a'];
  await call(f, 'mark_training', { id: data.id });
  assert.deepEqual(f.db[`trainings/${data.id}`].people, ['u_a', 'u_me']);
  await call(f, 'mark_training', { id: data.id, yes: false });
  assert.deepEqual(f.db[`trainings/${data.id}`].people, ['u_a']);
  const list = (await call(f, 'list_trainings', {})).data;
  assert.deepEqual(list.map((t) => t.title), ['Светлина']);
  assert.equal((await call(f, 'list_trainings', { include_past: true })).data.length, 2);
});
