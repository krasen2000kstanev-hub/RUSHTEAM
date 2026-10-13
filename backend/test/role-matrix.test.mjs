import test from 'node:test';
import assert from 'node:assert/strict';
import { canReadDoc, canWriteDoc, canReadSheets, canWriteSheets, collectionKind as K } from '../src/rules.js';

// Фиктивни профили: не се записват в DynamoDB и не могат да засегнат продукцията.
const founder = { id: 'qa-founder', role: 'founder', teams: [], active: true };
const mediaManager = { id: 'qa-media-manager', role: 'manager', teams: ['media'], active: true };
const hrManager = { id: 'qa-hr-manager', role: 'manager', teams: ['hr'], active: true };
const mediaMember = { id: 'qa-media-member', role: 'member', teams: ['media'], active: true };
const hrMember = { id: 'qa-hr-member', role: 'member', teams: ['hr'], active: true };
const noTeam = { id: 'qa-no-team', role: 'member', teams: [], active: true };
const video = { team: 'media' };
const hrClient = {};
const mediaClient = { teams: ['media'] };
const hrClientDoc = { teams: ['hr'] };
const mediaTask = { createdBy: mediaManager.id, participants: [mediaMember.id] };

test('QA profile matrix: founder, manager and member permissions stay scoped', () => {
  assert.equal(canReadDoc(founder, K('videos'), 'v', hrClientDoc), true);
  assert.equal(canWriteDoc(founder, K('clients'), 'c', null, {}), true);
  assert.equal(canReadDoc(mediaManager, K('videos'), 'v', video), true);
  assert.equal(canReadDoc(mediaManager, K('clients'), 'c', hrClientDoc), false);
  assert.equal(canWriteDoc(mediaManager, K('clients'), 'c', mediaClient, mediaClient), true);
  assert.equal(canWriteDoc(mediaManager, K('clients'), 'c', hrClientDoc, hrClientDoc), false);
  assert.equal(canReadDoc(mediaMember, K('videos'), 'v', video), true);
  assert.equal(canReadDoc(mediaMember, K('videos'), 'v', hrClientDoc), false);
  assert.equal(canWriteDoc(mediaMember, K('videos'), 'v', video, video), true);
  assert.equal(canWriteDoc(mediaMember, K('clients'), 'c', mediaClient, mediaClient), false);
  assert.equal(canReadDoc(noTeam, K('videos'), 'v', video), false);
  assert.equal(canReadDoc(noTeam, K('clients'), 'c', mediaClient), false);
  assert.equal(canReadDoc(mediaManager, K('tasks'), 't', mediaTask), true);
  assert.equal(canReadDoc(hrMember, K('tasks'), 't', mediaTask), false);
  assert.equal(canReadDoc(mediaManager, K('members'), 'u_hr', { teams: ['hr'] }), true);
  assert.equal(canReadDoc(mediaManager, K('depts'), 'u_hr', { teams: ['hr'] }), true);
  assert.equal(canReadDoc(mediaMember, K('members'), 'u_hr', { teams: ['hr'] }), false);
});

test('QA profile matrix: recruitment write controls are manager-only', () => {
  assert.equal(canReadSheets(hrMember), true);
  assert.equal(canWriteSheets(hrMember), false);
  assert.equal(canWriteSheets(hrManager), true);
  assert.equal(canWriteSheets(founder), true);
  assert.equal(canWriteDoc(hrMember, K('hrclients'), 'c', null, hrClient), false);
  assert.equal(canWriteDoc(hrManager, K('hrclients'), 'c', null, hrClient), true);
  assert.equal(canWriteDoc(founder, K('hrclients'), 'c', null, hrClient), true);
});

