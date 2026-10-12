// Правила за достъп. Чисти функции, за да се тестват без база.
export const ALL_TEAMS = ['media', 'web', 'events', 'design', 'hr'];
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
  if (segments.length === 1 && ['clients', 'videos', 'shoots', 'members', 'depts', 'tasks', 'hrclients'].includes(segments[0])) return { kind: segments[0] };
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
    default: return false;
  }
}

export const canReadSheets = (user) => usable(user) && (isFounder(user) || user.teams.includes('hr'));
export const canWriteSheets = (user) => usable(user) && (isFounder(user) || (user.role === 'manager' && user.teams.includes('hr')));

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

