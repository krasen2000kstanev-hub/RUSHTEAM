import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeTab } from '../src/sheets.js';

const row = (name, checked = '', rejected = '', interview = '', hired = '') => ['18.08', name, '0888', 'a@b.bg', '', '', '', '', '', '', '', '', checked, rejected, '', '', interview, hired];
const head = (first, second) => [first, second, 'Телефон', 'E-mail', 'CV линк', 'LInkedIn линк', 'Pleggi профил', 'Сфера', 'Място', 'Информация от Ръш фор Практис', 'Инфо от компания', '', 'Проверен', 'Отхвърлен', 'Причина', '', 'Интервю', 'Нает'];

test('position from „Лист1“ header, company part dropped either side', () => {
  assert.equal(summarizeTab('Shelly', { title: 'Лист1', values: [head('Дата', 'Име'), ['Shelly - Офис Мениджър'], row('Иван')] }).title, 'Офис Мениджър');
  assert.equal(summarizeTab('Магнум 7 ООД', { title: 'Лист1', values: [head('Дата', 'Име'), ['', 'Складов работник, София - Магнум 7'], row('Иван')] }).title, 'Складов работник, София');
  assert.equal(summarizeTab('Магнум 7 ООД', { title: 'Лист1', values: [head('Дата', 'Име'), ['', 'Складов работник, София - Магнум 7'], row('Иван')] }).candidates, 1);
});

test('named tab is the position; counts candidates and checkbox columns, skips empty rows', () => {
  const p = summarizeTab('Technopolis', { title: 'QA Automation lead', values: [head('Дата QA Automation Lead - Технополис', 'Име'), row('Иван', 'TRUE', '', 'TRUE'), row('Мария', 'TRUE', 'TRUE'), row(''), row('Петя', 'FALSE', '', '', 'TRUE')] });
  assert.deepEqual(p, { title: 'QA Automation lead', candidates: 3, checked: 2, rejected: 1, interview: 1, hired: 1 });
});
