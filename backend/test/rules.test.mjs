import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePath, collectionKind, canReadDoc, canWriteDoc, canReadSheets, matchesWhere, deepMerge, normalizeTeams } from '../src/rules.js';

const admin = { id: 'u_admin', role: 'admin', teams: [], active: true };
const manager = { id: 'u_manager', role: 'manager', teams: ['design'], active: true };
const designer = { id: 'u_d', role: 'member', teams: ['design'], active: true };
const editor = { id: 'u_m', role: 'member', teams: ['media'], active: true };
const recruiter = { id: 'u_h', role: 'member', teams: ['hr'], active: true };
const events = { id: 'u_e', role: 'member', teams: ['events'], active: true };
const nobody = { id: 'u_n', role: 'member', teams: [], active: true };
const K = collectionKind;

test('paths: only known shapes are accepted', () => {
  assert.equal(parsePath('videos/abc').collection, 'videos');
  assert.equal(parsePath('time/u_1/days/2026-10-07').collection, 'time/u_1/days');
  assert.equal(parsePath('videos'), null);
  assert.equal(parsePath('videos/../users'), null);
  assert.equal(parsePath('videos/a b'), null);
  assert.equal(K('users'), null);
  assert.equal(K('time/u_1/secret'), null);
  assert.deepEqual(K('time/u_1/days'), { kind: 'time', owner: 'u_1' });
});

test('tasks are visible only to their team', () => {
  const web = { team: 'web' }, video = {}, design = { team: 'design' };
  assert.equal(canReadDoc(designer, K('videos'), 'a', design), true);
  assert.equal(canReadDoc(designer, K('videos'), 'a', web), false);
  assert.equal(canReadDoc(designer, K('videos'), 'a', video), false);
  assert.equal(canReadDoc(editor, K('videos'), 'a', video), true);
  assert.equal(canReadDoc(recruiter, K('videos'), 'a', video), false);
  assert.equal(canReadDoc(admin, K('videos'), 'a', web), true);
  assert.equal(canReadDoc(manager, K('videos'), 'a', design), true);
  assert.equal(canReadDoc(manager, K('videos'), 'a', web), false);
});

test('founders see everything; managers stay team-scoped', () => {
  assert.equal(canReadDoc({ ...admin, role: 'founder' }, K('clients'), 'a', {}), true);
  assert.equal(canReadDoc(manager, K('clients'), 'a', {}), true);
  assert.equal(canWriteDoc(manager, K('depts'), 'u_d', null, { teams: ['hr'] }), false);
});

test('a member cannot move a task into or out of a team they are not in', () => {
  assert.equal(canWriteDoc(designer, K('videos'), 'a', { team: 'design' }, { team: 'design' }), true);
  assert.equal(canWriteDoc(designer, K('videos'), 'a', { team: 'design' }, { team: 'web' }), false);
  assert.equal(canWriteDoc(designer, K('videos'), 'a', { team: 'web' }, { team: 'design' }), false);
  assert.equal(canWriteDoc(designer, K('videos'), 'a', null, { team: 'media' }), false);
  assert.equal(canWriteDoc(designer, K('videos'), 'a', { team: 'web' }, null), false);
});

test('time entries are private; managers read everything', () => {
  assert.equal(canReadDoc(editor, K('time/u_m/days'), '2026-10-07', {}), true);
  assert.equal(canReadDoc(editor, K('time/u_d/days'), '2026-10-07', {}), false);
  assert.equal(canWriteDoc(editor, K('time/u_d/days'), '2026-10-07', null, {}), false);
  assert.equal(canReadDoc(admin, K('time/u_d/days'), '2026-10-07', {}), true);
  assert.equal(canWriteDoc(events, K('time/u_e/days'), '2026-10-07', null, {}), false);
  assert.equal(canWriteDoc(recruiter, K('time/u_h/days'), '2026-10-07', null, {}), false);
});

test('clients: only managers write; recruiters do not read', () => {
  assert.equal(canWriteDoc(editor, K('clients'), 'c', null, {}), false);
  assert.equal(canWriteDoc(admin, K('clients'), 'c', null, {}), true);
  assert.equal(canReadDoc(editor, K('clients'), 'c', {}), true);
  assert.equal(canReadDoc(recruiter, K('clients'), 'c', {}), false);
});

test('access to teams: only a manager changes it, and never their own', () => {
  assert.equal(canWriteDoc(editor, K('depts'), 'u_m', null, { teams: ['hr'] }), false);
  assert.equal(canWriteDoc(editor, K('depts'), 'u_d', null, { teams: ['hr'] }), false);
  assert.equal(canWriteDoc(admin, K('depts'), 'u_d', null, { teams: ['hr'] }), true);
  assert.equal(canWriteDoc(admin, K('depts'), 'u_admin', null, { admin: false }), false);
});

test('a signed-in person with no team sees nothing but their own member row', () => {
  assert.equal(canReadDoc(nobody, K('videos'), 'a', {}), false);
  assert.equal(canReadDoc(nobody, K('clients'), 'a', {}), false);
  assert.equal(canReadDoc(nobody, K('members'), 'u_n', {}), true);
  assert.equal(canReadDoc(nobody, K('members'), 'u_m', {}), false);
  assert.equal(canWriteDoc(nobody, K('members'), 'u_n', null, {}), true);
  assert.equal(canWriteDoc(nobody, K('members'), 'u_m', null, {}), false);
  assert.equal(canReadSheets(nobody), false);
});

test('recruitment sheets: only the hr team and managers', () => {
  assert.equal(canReadSheets(recruiter), true);
  assert.equal(canReadSheets(admin), true);
  assert.equal(canReadSheets(editor), false);
  assert.equal(canReadSheets({ ...recruiter, active: false }), false);
});

test('shoots belong to the video team', () => {
  assert.equal(canReadDoc(editor, K('shoots'), 's', {}), true);
  assert.equal(canReadDoc(events, K('shoots'), 's', {}), false);
  assert.equal(canWriteDoc(designer, K('shoots'), 's', null, {}), false);
});

test('helpers', () => {
  assert.equal(matchesWhere({ date: '2026-10-07' }, [['date', '>=', '2026-10-01'], ['date', '<=', '2026-10-31']]), true);
  assert.equal(matchesWhere({ date: '2026-11-01' }, [['date', '<=', '2026-10-31']]), false);
  assert.equal(matchesWhere({}, [['date', 'like', 'x']]), false);
  assert.deepEqual(deepMerge({ a: { b: 1, c: 2 }, l: [1, 2] }, { a: { c: 3 }, l: [9] }), { a: { b: 1, c: 3 }, l: [9] });
  assert.deepEqual(normalizeTeams(['hr', 'root', 'media']), ['media', 'hr']);
  assert.deepEqual(normalizeTeams('hr'), []);
});
