import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeTab } from '../src/sheets.js';

const row = (name, checked = '', rejected = '', interview = '', hired = '', cv = 'https://drive.google.com/x') => ['18.08', name, '0888', 'a@b.bg', name ? cv : '', '', '', '', '', '', '', '', checked, rejected, '', '', interview, hired];
const head = ['Дата', 'Име', 'Телефон', 'E-mail', 'CV линк', 'LInkedIn линк', 'Pleggi профил', 'Сфера', 'Място', 'Информация от Ръш фор Практис', 'Инфо от компания', '', 'Проверен', 'Отхвърлен', 'Причина', '', 'Интервю', 'Нает'];

test('„Лист1“ with one title row: position from the title, company part dropped', () => {
  assert.deepEqual(summarizeTab('Shelly', { title: 'Лист1', values: [head, ['Shelly - Офис Мениджър'], row('Иван'), row('Мария')] }).map((p) => [p.title, p.candidates]), [['Офис Мениджър', 2]]);
});

test('several positions stacked in one tab, newest (bottom) first; rows without a CV link are not counted', () => {
  const values = [head,
    ['', 'HR Operations and Administration - Магнум 7 ЕООД'], row('А', 'TRUE'), row('Б'),
    ['', 'Оперативен счетоводител - Магнум 7 (Нови)'], row('В', '', 'TRUE'),
    ['Складов работник - Нови - Магнум 7'], row('Г', '', '', 'TRUE'), row('Д', '', '', '', 'TRUE'), row(''), row('Без CV', 'TRUE', '', '', '', '')];
  assert.deepEqual(summarizeTab('Магнум 7 ООД', { title: 'Лист1', values }), [
    { title: 'Складов работник - Нови', candidates: 2, checked: 0, rejected: 0, interview: 1, hired: 1 },
    { title: 'Оперативен счетоводител (Нови)', candidates: 1, checked: 0, rejected: 1, interview: 0, hired: 0 },
    { title: 'HR Operations and Administration', candidates: 2, checked: 1, rejected: 0, interview: 0, hired: 0 },
  ]);
});

test('named tab without title rows is one position', () => {
  const p = summarizeTab('Technopolis', { title: 'QA Automation lead', values: [head, row('Иван', 'TRUE', '', 'TRUE'), row('Мария', 'TRUE', 'TRUE'), row(''), row('Петя', 'FALSE', '', '', 'TRUE')] });
  assert.deepEqual(p, [{ title: 'QA Automation lead', candidates: 3, checked: 2, rejected: 1, interview: 1, hired: 1 }]);
});
