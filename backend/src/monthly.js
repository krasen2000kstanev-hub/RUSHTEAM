import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { listDocs, listUsers } from './store.js';

const ses = new SESv2Client({});
const localParts = (date = new Date()) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Sofia', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]));
const previousMonth = () => { const p = localParts(); const d = new Date(Date.UTC(+p.year, +p.month - 2, 1)); const year = d.getUTCFullYear(); const month = String(d.getUTCMonth() + 1).padStart(2, '0'); const end = new Date(Date.UTC(year, d.getUTCMonth() + 1, 0)).getUTCDate(); return { year, month, start: `${year}-${month}-01`, finish: `${year}-${month}-${String(end).padStart(2, '0')}` }; };
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Сутрешен имейл (пн–пт): на всеки човек неговите просрочени и със срок днес/утре. Без нищо – без имейл.
export function digest(videos, tasks, today, tomorrow) {
  const byUser = {}; const add = (ids, item) => ids.filter(Boolean).forEach((id) => (byUser[id] = byUser[id] || []).push(item));
  videos.forEach(({ data: v }) => { const due = v.due || v.edate; if (!v.doneAt && due && due <= tomorrow) add([v.who, ...(Array.isArray(v.helpers) ? v.helpers : [])], { title: v.title, due }); });
  tasks.forEach(({ data: t }) => { if (!t.done && t.due && t.due <= tomorrow) add(Array.isArray(t.participants) ? t.participants : [], { title: t.title, due: t.due }); });
  return Object.fromEntries(Object.entries(byUser).map(([id, items]) => [id, { late: items.filter((i) => i.due < today), today: items.filter((i) => i.due === today), tomorrow: items.filter((i) => i.due === tomorrow) }]));
}

export async function daily() {
  const env = process.env; const p = localParts(); const today = `${p.year}-${p.month}-${p.day}`;
  const tomorrow = new Date(Date.UTC(+p.year, +p.month - 1, +p.day + 1)).toISOString().slice(0, 10);
  const [users, videos, tasks] = await Promise.all([listUsers(env), listDocs(env, 'videos'), listDocs(env, 'tasks')]);
  const lists = digest(videos, tasks, today, tomorrow); let sent = 0;
  const block = (name, items) => items.length ? `<h3>${name} (${items.length})</h3><ul>${items.map((i) => `<li>${esc(i.title)} – ${i.due.slice(8, 10)}.${i.due.slice(5, 7)}</li>`).join('')}</ul>` : '';
  for (const user of users.filter((u) => u.active !== false && u.email && lists[u.id])) {
    const l = lists[user.id]; const subject = `Team Hub: ${[l.late.length && `${l.late.length} просрочени`, l.today.length && `${l.today.length} за днес`, l.tomorrow.length && `${l.tomorrow.length} за утре`].filter(Boolean).join(', ')}`;
    const html = `<p>Добро утро${user.name ? ', ' + esc(user.name.split(' ')[0]) : ''}!</p>${block('Просрочени', l.late)}${block('Със срок днес', l.today)}${block('Със срок утре', l.tomorrow)}<p><a href="${esc(env.FRONTEND_URL || '')}">Отвори Team Hub</a></p>`;
    try { await ses.send(new SendEmailCommand({ FromEmailAddress: env.SES_FROM_EMAIL, Destination: { ToAddresses: [user.email] }, Content: { Simple: { Subject: { Data: subject, Charset: 'UTF-8' }, Body: { Html: { Data: html, Charset: 'UTF-8' } } } } })); sent++; } catch (error) { console.error('daily digest failed', user.email, error); }
  }
  return { ok: true, sent };
}

export async function handler() {
  const period = previousMonth(); const users = (await listUsers(process.env)).filter((u) => u.active !== false); const rates = JSON.parse(process.env.HOURLY_RATES_JSON || '{}'); const rows = [];
  for (const user of users) {
    const docs = await listDocs(process.env, `time/${user.id}/days`); let ms = 0; const work = [];
    docs.filter((d) => d.id >= period.start && d.id <= period.finish).forEach((d) => Object.values(d.data?.entries || {}).forEach((entry) => { const duration = Math.max(0, (entry.e ?? entry.s) - entry.s); ms += duration; if (entry.d || entry.c || entry.v) work.push(`${entry.d || 'Без описание'}${entry.c ? ` (${entry.c})` : ''}`); }));
    const hours = ms / 3600000; const rate = Number(rates[String(user.email || '').toLowerCase()]); rows.push({ name: user.name || user.email, email: user.email, hours, rate: Number.isFinite(rate) && rate > 0 ? rate : null, amount: Number.isFinite(rate) && rate > 0 ? hours * rate : null, work });
  }
  const total = rows.reduce((sum, row) => sum + (row.amount || 0), 0); const htmlRows = rows.map((r) => `<tr><td>${esc(r.name)}</td><td>${esc(r.email)}</td><td>${r.hours.toFixed(2)}</td><td>${r.rate == null ? 'липсва ставка' : r.rate.toFixed(2) + ' лв.'}</td><td>${r.amount == null ? '–' : r.amount.toFixed(2) + ' лв.'}</td><td>${esc(r.work.slice(0, 8).join('; '))}</td></tr>`).join('');
  const html = `<h2>Team Hub отчет за ${period.month}.${period.year}</h2><p>Период: ${period.start} – ${period.finish}</p><table border="1" cellpadding="6" cellspacing="0"><thead><tr><th>Служител</th><th>Имейл</th><th>Часове</th><th>Ставка</th><th>Сума</th><th>Работа</th></tr></thead><tbody>${htmlRows}</tbody></table><p><b>Общо: ${total.toFixed(2)} лв.</b></p>`;
  const recipients = String(process.env.REPORT_RECIPIENTS || '').split(',').map((v) => v.trim()).filter(Boolean); if (!recipients.length) return { ok: true, skipped: 'no recipients' };
  await ses.send(new SendEmailCommand({ FromEmailAddress: process.env.SES_FROM_EMAIL, Destination: { ToAddresses: recipients }, Content: { Simple: { Subject: { Data: `Team Hub отчет ${period.month}.${period.year}`, Charset: 'UTF-8' }, Body: { Html: { Data: html, Charset: 'UTF-8' } } } } }));
  return { ok: true, period: `${period.year}-${period.month}`, recipients: recipients.length };
}
