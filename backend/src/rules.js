// Правила за достъп. Чисти функции, за да се тестват без база.
export const ALL_TEAMS = ['media', 'web', 'events', 'design', 'social', 'hr'];
const SEGMENT = /^[A-Za-z0-9_\-.~:@+]{1,120}$/;

export function parsePath(path) {
  const segments = String(path || '').split('/');
  if (segments.length < 2 || segments.length > 6 || segments.length % 2) return null;
  if (!segments.every((segment) => SEGMENT.test(segment) && segment !== '.' && segment !== '..')) return null;
  return { path: segments.join('/'), collection: segments.slice(0, -1).join('/'), id: segments[segments.length - 1] };
}

export function collectionKind(collection) {
  const segments = String(collection || '').split('/');
  if (!segments.every((segment) => SEGMENT.test(segment))) return null;
  if (segments.length === 1 && ['clients', 'videos', 'shoots', 'members', 'depts', 'tasks', 'hrclients', 'schedules', 'trainings'].includes(segments[0])) return { kind: segments[0] };
  if (segments.length === 3 && segments[0] === 'time' && segments[2] === 'days') return { kind: 'time', owner: segments[1] };
  return null;
}

export function normalizeTeams(value) {
  return Array.isArray(value) ? ALL_TEAMS.filter((team) => value.includes(team)) : [];
}

// Задачите без поле team са от видео екипа (така е и във фронтенда).
export const docTeams = (data) => {
  const teams = Array.isArray(data?.teams) ? data.teams : [data?.team];
  return normalizeTeams(teams).length ? normalizeTeams(teams) : ['media'];
};
export const docTeam = (data) => docTeams(data)[0] || 'media';

export const isFounder = (user) => user?.role === 'founder' || user?.role === 'admin';
export const isManager = (user) => user?.role === 'manager';
const usable = (user) => Boolean(user && user.active);
const manages = (user, data) => user?.role === 'manager' && docTeams(data).some((team) => user.teams.includes(team));
// График за седмицата: id е „<понеделник>_<потребител>“, всеки пише само своя.
export const scheduleOwner = (id) => String(id || '').match(/^\d{4}-\d{2}-\d{2}_(.+)$/)?.[1] || '';
// Ден: { from, to, note, busy: [{ from, to }] } — „busy“ са заетите часове в работния интервал.
// Цел: { goal: число, goalWhat: какво се брои, goalPrev: предишната цел при запис (за сравнение), goalNote: свободен текст }.
const SCHEDULE_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const okTime = (v) => v === '' || v === undefined || /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const okNum = (v) => v === undefined || v === null || (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1e6);
const okDay = (d) => Boolean(d) && typeof d === 'object' && !Array.isArray(d) && okTime(d.from) && okTime(d.to) && String(d.note || '').length <= 200
  && (d.busy === undefined || (Array.isArray(d.busy) && d.busy.length <= 6 && d.busy.every((b) => b && okTime(b.from) && okTime(b.to) && b.from && b.to && b.from < b.to)));
export function validSchedule(id, next) {
  const days = next?.days && typeof next.days === 'object' && !Array.isArray(next.days) ? next.days : {};
  return next?.owner === scheduleOwner(id) && next.week === String(id).slice(0, 10) && Object.keys(days).every((k) => SCHEDULE_DAYS.includes(k))
    && Object.values(days).every(okDay) && String(next.note || '').length <= 500 && okNum(next.goal) && okNum(next.goalPrev) && String(next.goalWhat || '').length <= 80 && String(next.goalNote || '').length <= 500;
}
// Обучение на отдел: материал (урок с линк) или среща (дата, час, зала). `people` = кой е минал материала / ще присъства.
const okDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
export function validTraining(next) {
  const people = next?.people === undefined ? [] : next.people;
  const title = String(next?.title || '').trim();
  return ['material', 'session'].includes(next?.kind) && ALL_TEAMS.includes(next?.team) && title.length > 0 && title.length <= 140
    && String(next.desc || '').length <= 2000 && String(next.link || '').length <= 500 && String(next.place || '').length <= 140
    && (next.kind === 'material' || okDate(next.date)) && (!next.date || okDate(next.date)) && okTime(next.start) && okTime(next.end)
    && Array.isArray(people) && people.length <= 200 && people.every((id) => typeof id === 'string' && id.length <= 120);
}
// Член на отдела може да промени само себе си в `people` („Минах го“ / „Ще присъствам“).
const onlySelfMark = (userId, a, b) => {
  const rest = (d) => JSON.stringify(Object.fromEntries(Object.entries(d).filter(([k]) => k !== 'people').sort()));
  const sa = new Set(a.people || []), sb = new Set(b.people || []);
  return rest(a) === rest(b) && [...sa, ...sb].every((id) => id === userId || (sa.has(id) && sb.has(id)));
};
const tracksTime = (user) => user.teams.some((team) => team !== 'hr' && team !== 'events');

export function canReadDoc(user, kind, id, data) {
  if (!usable(user) || !kind) return false;
  if (isFounder(user)) return true;
  switch (kind.kind) {
    case 'tasks': return isFounder(user) || (user.teams.length > 0 && (data?.createdBy === user.id || (Array.isArray(data?.participants) && data.participants.includes(user.id))));
    case 'hrclients': return isFounder(user) || user.teams.includes('hr');
    case 'clients': return docTeams(data).some((team) => user.teams.includes(team));
    // Мениджърите трябва да могат да намират колега от друг отдел за обща задача;
    // това е само право за преглед, не разширява write правилата по-долу.
    case 'members': return isManager(user) || id === user.id || (Array.isArray(data?.teams) && data.teams.some((team) => user.teams.includes(team)));
    case 'depts': return isManager(user) || id === user.id || (user.teams.length > 0 && data?.teams?.some((team) => user.teams.includes(team)));
    case 'videos': return user.teams.includes(docTeam(data));
    case 'shoots': return user.teams.includes('media');
    case 'time': return kind.owner === user.id && tracksTime(user);
    case 'schedules': return user.teams.length > 0;
    case 'trainings': return user.teams.includes(docTeam(data));
    default: return false;
  }
}

export function canWriteDoc(user, kind, id, oldData, newData) {
  if (!usable(user) || !kind) return false;
  if (kind.kind === 'depts') {
    const target = oldData || newData || {};
    const nextTeams = normalizeTeams(newData?.teams ?? oldData?.teams);
    return id !== user.id && !isFounder(target) && (isFounder(user) || (manages(user, target) && nextTeams.every((team) => user.teams.includes(team))));
  }
  if (isFounder(user)) return true;
  switch (kind.kind) {
    case 'tasks': return user.teams.length > 0 && ((newData || oldData)?.createdBy === user.id || (Array.isArray((newData || oldData)?.participants) && (newData || oldData).participants.includes(user.id)));
    case 'hrclients': return isFounder(user) || (user.role === 'manager' && user.teams.includes('hr'));
    case 'clients': return user.role === 'manager' && manages(user, oldData || newData);
    case 'members': return id === user.id || (user.role === 'manager' && manages(user, oldData));
    case 'videos':
      return (!oldData || user.teams.includes(docTeam(oldData))) && (!newData || user.teams.includes(docTeam(newData)));
    case 'shoots': return user.teams.includes('media');
    case 'time': return kind.owner === user.id && tracksTime(user);
    case 'schedules': return user.teams.length > 0 && scheduleOwner(id) === user.id && [oldData, newData].every((d) => !d || d.owner === user.id);
    case 'trainings':
      if ([oldData, newData].every((d) => !d || manages(user, d))) return true;
      return Boolean(oldData && newData && user.teams.includes(docTeam(oldData)) && onlySelfMark(user.id, oldData, newData));
    default: return false;
  }
}

export const canReadSheets = (user) => usable(user) && (isFounder(user) || user.teams.includes('hr'));
export const canWriteSheets = (user) => usable(user) && (isFounder(user) || (user.role === 'manager' && user.teams.includes('hr')));

// Отговорник на видео/задача от дъската: колега от отдела или основател (основателите виждат всички отдели).
export const canBeAssigned = (assignee, team) => usable(assignee) && (isFounder(assignee) || assignee.teams.includes(team));
// Отговорници на видео: `who` (главен) + `helpers`.
export const videoTeam = (data) => (ALL_TEAMS.includes(data?.team) ? data.team : 'media');
export const videoOwners = (data) => [...new Set([data?.who, ...(Array.isArray(data?.helpers) ? data.helpers : [])].filter(Boolean).map(String))];
// Проверяват се само новите отговорници (или всички, ако отделът се сменя), за да не блокира стар отговорник редакцията.
export const ownersToCheck = (next, old) => {
  const before = old && videoTeam(next) === videoTeam(old) ? videoOwners(old) : [];
  return videoOwners(next).filter((id) => !before.includes(id));
};

export function matchesWhere(data, where) {
  return (where || []).every(([field, op, value]) => {
    const actual = data?.[field];
    switch (op) {
      case '==': return actual === value;
      case '>=': return actual >= value;
      case '<=': return actual <= value;
      case '>': return actual > value;
      case '<': return actual < value;
      default: return false;
    }
  });
}

export function deepMerge(target, patch) {
  const out = { ...target };
  for (const [key, value] of Object.entries(patch || {})) {
    const both = value && typeof value === 'object' && !Array.isArray(value) && out[key] && typeof out[key] === 'object' && !Array.isArray(out[key]);
    out[key] = both ? deepMerge(out[key], value) : value;
  }
  return out;
}

// За историята: какво се е променило, поле → [преди, след] като JSON текст.
// Вложените обекти (напр. записите за време в деня) се сравняват едно ниво надолу.
export function auditChanges(before, after, max = 400) {
  const plain = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
  const cut = (v) => { const s = v === undefined ? '' : JSON.stringify(v); return s.length > max ? `${s.slice(0, max)}…` : s; };
  const out = {};
  const walk = (a, b, prefix, deep) => {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const x = a[k], y = b[k];
      if (JSON.stringify(x) === JSON.stringify(y)) continue;
      if (deep && plain(x) && plain(y)) walk(x, y, `${prefix}${k}.`, false);
      else out[prefix + k] = [cut(x), cut(y)];
    }
  };
  walk(plain(before) ? before : {}, plain(after) ? after : {}, '', true);
  return out;
}

