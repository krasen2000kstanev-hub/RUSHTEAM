import test from 'node:test';
import assert from 'node:assert/strict';
import { digest } from '../src/monthly.js';
import { describe } from '../src/notify.js';

test('daily digest: own late/today/tomorrow items only, done ones skipped', () => {
  const videos = [
    { data: { title: 'Късно', who: 'a', due: '2026-10-20' } },
    { data: { title: 'Събитие', who: 'b', helpers: ['a'], edate: '2026-10-27' } },
    { data: { title: 'Приключено', who: 'a', due: '2026-10-20', doneAt: 1 } },
    { data: { title: 'Далеч', who: 'a', due: '2026-12-01' } },
  ];
  const tasks = [{ data: { title: 'Днес', participants: ['a'], due: '2026-10-26' } }, { data: { title: 'Готова', participants: ['a'], due: '2026-10-26', done: true } }];
  const l = digest(videos, tasks, '2026-10-26', '2026-10-27');
  assert.deepEqual(l.a.late.map((i) => i.title), ['Късно']);
  assert.deepEqual(l.a.today.map((i) => i.title), ['Днес']);
  assert.deepEqual(l.a.tomorrow.map((i) => i.title), ['Събитие']);
  assert.deepEqual(l.b.tomorrow.map((i) => i.title), ['Събитие']);
});

test('notification subject is readable', () => {
  const s = describe({ action: 'updated', collection: 'videos', actorName: 'Красен', oldData: { team: 'events', title: 'ДСК' }, newData: { team: 'events', title: 'ДСК', doneAt: 5 } }).subject;
  assert.equal(s, 'Team Hub: Красен приключи събитие „ДСК“');
});
