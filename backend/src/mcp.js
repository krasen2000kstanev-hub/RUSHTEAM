// Връзка с AI (Claude, ChatGPT, Codex – MCP през HTTP, без състояние): колегата добавя в своя AI адреса /mcp/<личен ключ>
// и Claude работи в Team Hub с неговите права. Всяко действие минава през същите проверки и история,
// както от сайта (deps.doc → handleDoc в index.js). Триене няма нарочно.

// Огледало на TEAMS в app.js – тестът mcp.test.mjs пада, ако се разминат.
export const BOARD_STAGES = {
  media: [['idea', 'Идея'], ['script', 'Сценарий'], ['shoot', 'Заснемане'], ['edit', 'Монтаж'], ['review', 'Ревизия'], ['done', 'Предадено'], ['published', 'Публикувано'], ['results', 'Резултати']],
  web: [['brief', 'Бриф'], ['design', 'Дизайн'], ['dev', 'Разработка'], ['backend', 'Backend'], ['content', 'Съдържание'], ['review', 'Преглед от клиента'], ['legal', 'Юрист'], ['done', 'Пуснат']],
  events: [['request', 'Запитване'], ['plan', 'Планиране'], ['vendors', 'Локация и доставчици'], ['promo', 'Промоция'], ['ready', 'Готово за провеждане'], ['done', 'Проведено']],
  design: [['brief', 'Бриф'], ['concept', 'Концепция'], ['work', 'Изработка'], ['review', 'Ревизия'], ['done', 'Предадено']],
  social: [['idea', 'Идея'], ['content', 'Текст и визия'], ['review', 'Одобрение от клиента'], ['scheduled', 'Планирано'], ['done', 'Публикувано']],
};
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const teamOf = (v) => (BOARD_STAGES[v?.team] ? v.team : 'media');
const isDoneStage = (team, stage) => { const st = BOARD_STAGES[team]; const i = st.findIndex(([id]) => id === stage); return i >= 0 && i >= st.findIndex(([id]) => id === 'done'); };
const sofiaToday = (now = new Date()) => now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Sofia' });
export function weekOf(date) {
  const d = new Date(`${date || sofiaToday()}T12:00:00Z`); if (Number.isNaN(d.getTime())) throw new ToolError('Невалидна дата. Ползвайте ГГГГ-ММ-ДД.');
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10);
}
const shiftWeek = (week, n) => { const d = new Date(`${week}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 7 * n); return d.toISOString().slice(0, 10); };
class ToolError extends Error {}
const str = { type: 'string' }, date = { type: 'string', description: 'ГГГГ-ММ-ДД' }, ids = { type: 'array', items: { type: 'string' } };
const time = { type: 'string', description: 'ЧЧ:ММ, празно = без край' };
const daySchema = { type: 'object', properties: { from: time, to: time, note: str, busy: { type: 'array', description: 'заети интервали в деня', items: { type: 'object', properties: { from: time, to: time }, required: ['from', 'to'] } } } };

export const TOOLS = [
  { name: 'overview', annotations: { readOnlyHint: true }, description: 'Кой съм аз, моите отдели, колегите (id и име), клиентите (id и име) и етапите на всяка дъска. Извикай първо, за да знаеш id-тата.', inputSchema: { type: 'object', properties: {} } },
  { name: 'list_board', annotations: { readOnlyHint: true }, description: 'Задачите на дъската на отдел (media=Видео, web=Сайтове, events=Събития, design=Дизайн, social=Социални мрежи).', inputSchema: { type: 'object', properties: { team: { type: 'string', enum: Object.keys(BOARD_STAGES) }, include_done: { type: 'boolean', description: 'и приключените' } }, required: ['team'] } },
  { name: 'save_board_item', annotations: { readOnlyHint: false, destructiveHint: false }, description: 'Създава задача на дъска (без id) или променя съществуваща (с id; пращай само полетата за смяна). Местене по етапи = смяна на stage.', inputSchema: { type: 'object', properties: { id: str, team: { type: 'string', enum: Object.keys(BOARD_STAGES) }, title: str, stage: { type: 'string', description: 'id на етап от overview' }, due: date, client: { type: 'string', description: 'id на клиент' }, who: { type: 'string', description: 'id на главния отговорник' }, helpers: ids, notes: str } } },
  { name: 'list_shared_tasks', annotations: { readOnlyHint: true }, description: 'Споделените задачи, в които участвам (или всички, ако съм основател).', inputSchema: { type: 'object', properties: { include_done: { type: 'boolean' } } } },
  { name: 'save_shared_task', annotations: { readOnlyHint: false, destructiveHint: false }, description: 'Създава (без id) или променя (с id) споделена задача. participants = id-та на колеги; редовият член винаги е включен.', inputSchema: { type: 'object', properties: { id: str, title: str, description: str, due: date, client: str, participants: ids, done: { type: 'boolean' } } } },
  { name: 'get_schedules', annotations: { readOnlyHint: true }, description: 'Графиците и целите на екипа за седмицата на дадена дата (по подразбиране тази седмица).', inputSchema: { type: 'object', properties: { date } } },
  { name: 'save_my_schedule', annotations: { readOnlyHint: false, destructiveHint: false }, description: 'Записва МОЯ график за седмицата. days заменя целия график: ключове mon..sun; ден без ключ = не съм на разположение.', inputSchema: { type: 'object', properties: { date, days: { type: 'object', properties: Object.fromEntries(DAYS.map((d) => [d, daySchema])) }, note: str }, required: ['days'] } },
  { name: 'set_my_goal', annotations: { readOnlyHint: false, destructiveHint: false }, description: 'Записва МОЯТА цел за седмицата (число + какво се брои) и казва дали е висока/ниска спрямо предишната. Записва се и при висока/ниска.', inputSchema: { type: 'object', properties: { date, goal: { type: 'number', minimum: 0 }, what: str }, required: ['goal'] } },
];

const INSTRUCTIONS = 'Team Hub е вътрешната платформа на екипа. Отговаряй на български. Започни с overview, за да знаеш id-тата на колеги, клиенти и етапи. Преди промени, които засягат колеги (нова задача към друг човек, смяна на отговорник), кажи накратко какво ще направиш. Изтриване няма – насочи човека към сайта.';

// deps: { user, doc(method, path, body) → резултат на /api/doc, list(collection, where) → [{id,data}], users() → [{id,name}] }
export async function callTool(name, args, deps) {
  const a = args || {}; const { user } = deps;
  const people = async () => Object.fromEntries((await deps.users()).map((u) => [u.id, u.name]));
  if (name === 'overview') {
    const clients = (await deps.list('clients', [])).filter((c) => !c.data.archived).map((c) => ({ id: c.id, name: c.data.name }));
    return { me: { id: user.id, name: user.name, role: user.role, teams: user.teams }, colleagues: (await deps.users()).map((u) => ({ id: u.id, name: u.name })), clients, stages: BOARD_STAGES, today: sofiaToday() };
  }
  if (name === 'list_board') {
    if (!BOARD_STAGES[a.team]) throw new ToolError('Непознат отдел.');
    const names = await people();
    return (await deps.list('videos', [])).filter((v) => teamOf(v.data) === a.team && (a.include_done || !isDoneStage(a.team, v.data.stage)))
      .map(({ id, data: v }) => ({ id, title: v.title, stage: v.stage, due: v.due || '', client: v.client || '', who: names[v.who] || v.who || '', helpers: (v.helpers || []).map((h) => names[h] || h), notes: v.notes || '' }));
  }
  if (name === 'save_board_item') {
    const pick = Object.fromEntries(['title', 'stage', 'due', 'client', 'who', 'helpers', 'notes'].filter((k) => a[k] !== undefined).map((k) => [k, a[k]]));
    if (a.id) {
      const cur = await deps.doc('GET', `videos/${a.id}`); if (!cur.exists) throw new ToolError('Няма такава задача.');
      const team = teamOf(cur.data); if (pick.stage !== undefined && !BOARD_STAGES[team].some(([s]) => s === pick.stage)) throw new ToolError(`Непознат етап за отдела. Етапи: ${BOARD_STAGES[team].map(([s]) => s).join(', ')}`);
      if (pick.stage !== undefined && pick.stage !== cur.data.stage) { pick.moved = Date.now(); pick.doneAt = isDoneStage(team, pick.stage) ? (cur.data.doneAt || Date.now()) : 0; }
      await deps.doc('PATCH', `videos/${a.id}`, pick); return { ok: true, id: a.id };
    }
    const team = a.team; if (!BOARD_STAGES[team] || !String(a.title || '').trim()) throw new ToolError('За нова задача трябват team и title.');
    const stage = BOARD_STAGES[team].some(([s]) => s === a.stage) ? a.stage : BOARD_STAGES[team][0][0];
    const rec = { title: String(a.title).trim(), client: a.client || '', stage, who: a.who || '', helpers: a.helpers || [], due: a.due || '', est: 0, notes: a.notes || '', links: [], created: Date.now(), fmt: '', revs: 0, check: [], comments: [], moved: Date.now(), team, doneAt: isDoneStage(team, stage) ? Date.now() : 0 };
    const id = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    await deps.doc('PUT', `videos/${id}`, rec); return { ok: true, id };
  }
  if (name === 'list_shared_tasks') {
    const names = await people();
    return (await deps.list('tasks', [])).filter((t) => a.include_done || !t.data.done)
      .map(({ id, data: t }) => ({ id, title: t.title, description: t.description || '', due: t.due || '', done: Boolean(t.done), participants: (t.participants || []).map((p) => names[p] || p) }));
  }
  if (name === 'save_shared_task') {
    const pick = Object.fromEntries(['title', 'description', 'due', 'client', 'participants', 'done'].filter((k) => a[k] !== undefined).map((k) => [k, a[k]]));
    const manager = user.role === 'manager' || user.role === 'founder' || user.role === 'admin';
    if (pick.participants && !manager && !pick.participants.includes(user.id)) pick.participants = [user.id, ...pick.participants];
    if (a.id) { pick.updatedAt = Date.now(); await deps.doc('PATCH', `tasks/${a.id}`, pick); return { ok: true, id: a.id }; }
    const rec = { title: '', description: '', client: '', due: '', done: false, priority: false, ...pick, participants: pick.participants?.length ? pick.participants : [user.id], createdBy: user.id, createdAt: Date.now(), updatedAt: Date.now() };
    const id = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    await deps.doc('PUT', `tasks/${id}`, rec); return { ok: true, id };
  }
  if (name === 'get_schedules') {
    const week = weekOf(a.date); const names = await people();
    return { week, people: (await deps.list('schedules', [['week', '==', week]])).map(({ data: r }) => ({ name: names[r.owner] || r.owner, days: r.days || null, note: r.note || '', goal: r.goal ?? null, goalWhat: r.goalWhat || '', goalPrev: r.goalPrev ?? null })) };
  }
  const mine = async (week) => { const cur = await deps.doc('GET', `schedules/${week}_${user.id}`); return cur.exists ? cur.data : null; };
  if (name === 'save_my_schedule') {
    const week = weekOf(a.date); const days = a.days && typeof a.days === 'object' ? a.days : {};
    await deps.doc('PUT', `schedules/${week}_${user.id}`, { note: '', ...(await mine(week)), days, ...(a.note !== undefined ? { note: a.note } : {}), owner: user.id, week });
    return { ok: true, week };
  }
  if (name === 'set_my_goal') {
    const week = weekOf(a.date); let prev = null;
    for (let i = 1; i <= 8 && !prev; i += 1) { const r = await mine(shiftWeek(week, -i)); if (r && r.goal != null) prev = r; }
    const goal = Number(a.goal); if (!Number.isFinite(goal) || goal < 0) throw new ToolError('Целта трябва да е число ≥ 0.');
    await deps.doc('PUT', `schedules/${week}_${user.id}`, { note: '', ...(await mine(week)), goal, goalWhat: String(a.what || prev?.goalWhat || '').slice(0, 80), goalPrev: prev ? prev.goal : null, owner: user.id, week });
    const level = !prev || !(prev.goal > 0) ? 'няма предишна цел за сравнение' : goal > prev.goal * 1.2 ? `висока спрямо предишната (${prev.goal})` : goal < prev.goal * 0.8 ? `ниска спрямо предишната (${prev.goal})` : `близо до предишната (${prev.goal})`;
    return { ok: true, week, level };
  }
  throw new ToolError(`Непознат инструмент: ${name}`);
}

const VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
// Един JSON-RPC запис → отговор (или undefined за известия, които нямат отговор).
export async function handleMcp(msg, deps) {
  if (!msg || typeof msg !== 'object' || msg.jsonrpc !== '2.0') return { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Request' } };
  if (msg.id === undefined) return undefined;
  const ok = (result) => ({ jsonrpc: '2.0', id: msg.id, result });
  switch (msg.method) {
    case 'initialize': return ok({ protocolVersion: VERSIONS.includes(msg.params?.protocolVersion) ? msg.params.protocolVersion : VERSIONS[0], capabilities: { tools: {} }, serverInfo: { name: 'team-hub', version: '1.0.0' }, instructions: INSTRUCTIONS });
    case 'ping': return ok({});
    case 'tools/list': return ok({ tools: TOOLS });
    case 'tools/call':
      try { return ok({ content: [{ type: 'text', text: JSON.stringify(await callTool(msg.params?.name, msg.params?.arguments, deps)) }] }); }
      catch (error) {
        const text = error instanceof ToolError ? error.message : error?.status === 403 ? 'Нямате права за това действие.' : error?.status === 400 ? `Някое поле не е правилно: ${error.message}` : error?.status === 404 ? 'Записът не съществува.' : error?.status === 409 ? 'Колега промени записа междувременно – опитайте пак.' : 'Team Hub не успя да изпълни действието.';
        if (!(error instanceof ToolError) && !error?.status) console.error('mcp tool failed', error);
        return ok({ content: [{ type: 'text', text }], isError: true });
      }
    default: return { jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'Method not found' } };
  }
}
