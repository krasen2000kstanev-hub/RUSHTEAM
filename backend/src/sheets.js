// Четене и добавяне на редове в Google таблици със сервизен акаунт.
let tokenCache = null;
const encoder = new TextEncoder();
const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlText = (text) => b64url(encoder.encode(text));

async function accessToken(env) {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60000) return tokenCache.token;
  if (!env.GOOGLE_SERVICE_ACCOUNT_JSON) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not configured');
  const account = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64urlText(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64urlText(JSON.stringify({
    iss: account.client_email, scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  }))}`;
  const pem = account.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(unsigned));
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${b64url(signature)}` }),
  });
  if (!response.ok) throw new Error('Google token request failed');
  const data = await response.json();
  tokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 };
  return tokenCache.token;
}

const get = async (url, token) => {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) { const error = new Error(`Sheet unavailable (${response.status})`); error.status = response.status; throw error; }
  return response.json();
};

// Всички листове на таблицата наведнъж: [{ title, values }].
async function readTabs(sheetId, token, only) {
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}`;
  // Скритите листове са стари позиции – не се броят.
  let titles = ((await get(`${base}?fields=sheets.properties(title,hidden)`, token)).sheets || []).filter((sheet) => !sheet.properties.hidden).map((sheet) => sheet.properties.title);
  if (only) titles = titles.filter((title) => only.some((name) => title.trim().toLowerCase() === name));
  if (!titles.length) return [];
  const ranges = titles.map((title) => `ranges=${encodeURIComponent(`'${title.replace(/'/g, "''")}'!A1:Z3000`)}`).join('&');
  const out = await get(`${base}/values:batchGet?majorDimension=ROWS&${ranges}`, token);
  return titles.map((title, i) => ({ title, values: out.valueRanges?.[i]?.values || [] }));
}

const low = (value) => String(value ?? '').trim().toLowerCase();
const col = (head, ...keys) => head.findIndex((cell) => keys.some((key) => low(cell).includes(key)));
const yes = (value) => low(value) !== '' && !/^(false|не|no|0|-)$/.test(low(value));
const sameCompany = (part, company) => { const a = low(part), b = low(company); return !!a && (b.includes(a) || a.includes(b) || a.split(/\s+/)[0] === b.split(/\s+/)[0]); };

// Лист от базата на компания: първият ред са колоните, после позиции една под друга. Всяка позиция започва
// с ред-заглавие с една клетка („Складов работник - Нови - Магнум 7“), под него са кандидатите.
// Лист без такива редове е една позиция с името на листа. Най-новите (най-долу) излизат първи.
const positionName = (label, company) => {
  const parts = String(label).replace(/^\s*(дата|име)\s+/i, '').split(' - ').map((part) => part.trim()).filter(Boolean);
  const own = parts.filter((part) => !sameCompany(part, company)); const note = parts.filter((part) => sameCompany(part, company)).map((part) => part.match(/\([^)]*\)/)?.[0]).filter(Boolean);
  return [...(own.length ? own : parts.slice(0, 1)), ...note].join(own.length ? ' - ' : ' ').replace(/ - (\()/, ' $1');
};
export function summarizeTab(company, { title, values }) {
  const head = values[0] || [];
  const cvCol = col(head, 'cv'); const c = { checked: col(head, 'провер'), rejected: col(head, 'отхвър'), interview: col(head, 'интерв'), hired: col(head, 'нает') };
  const sections = [{ title: /^(лист|sheet)\s*\d*$/i.test(title.trim()) ? '' : title.trim(), rows: [] }];
  for (const row of values.slice(1)) {
    const cells = row.map((cell) => String(cell ?? '').trim()).filter(Boolean);
    if (cells.length === 1 && cells[0].includes(' - ')) sections.push({ title: positionName(cells[0], company), rows: [] });
    // Кандидат се зачита само с линк към CV.
    else if (cvCol >= 0 && String(row[cvCol] ?? '').trim()) sections[sections.length - 1].rows.push(row);
  }
  const count = (rows, key) => (c[key] < 0 ? 0 : rows.filter((row) => yes(row[c[key]])).length);
  return sections.filter((section) => section.title && (section.rows.length || sections.length === 1)).reverse()
    .map(({ title: name, rows }) => ({ title: name, candidates: rows.length, checked: count(rows, 'checked'), rejected: count(rows, 'rejected'), interview: count(rows, 'interview'), hired: count(rows, 'hired') }));
}

// „Подбор“: компаниите от „Достъп до Бази“, позициите и бройките от базата на всяка активна компания,
// описанията от „Обяви“. Към браузъра не излизат имена, телефони и имейли на кандидати.
export async function readHrSummary(masterId, env) {
  const token = await accessToken(env);
  const master = await readTabs(masterId, token, ['достъп до бази', 'обяви']);
  const tab = (name) => master.find((t) => low(t.title) === name)?.values || [];
  const access = tab('достъп до бази'); const ads = tab('обяви');
  if (!access.length) { const error = new Error('No „Достъп до Бази“ tab'); error.status = 404; throw error; }
  const ah = access[0]; const ac = { company: col(ah, 'компан'), link: col(ah, 'линк'), stage: col(ah, 'етап'), status: col(ah, 'статус') };
  const dh = ads[0] || []; const dc = { company: col(dh, 'комп', 'кома'), title: col(dh, 'позици'), text: col(dh, 'описан') };
  const descriptions = ads.slice(1).map((row) => ({ company: row[dc.company] || '', title: low(row[dc.title]), text: String(row[dc.text] || '').trim() }));
  const cell = (row, i) => (i < 0 ? '' : String(row[i] ?? '').trim());
  return Promise.all(access.slice(1).filter((row) => cell(row, ac.company)).map(async (row) => {
    const company = cell(row, ac.company); const status = cell(row, ac.status); const active = /актив/i.test(status) && !/неактив/i.test(status);
    const link = cell(row, ac.link); const base = link.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]{20,120})/)?.[1] || '';
    const out = { company, link: base ? link : '', stage: cell(row, ac.stage), status, active, positions: [] };
    if (!active || !base) return out;
    try {
      out.positions = (await readTabs(base, token)).flatMap((t) => summarizeTab(company, t))
        .map((p) => ({ ...p, description: descriptions.find((d) => sameCompany(d.company, company) && d.title && (low(p.title).includes(d.title) || d.title.includes(low(p.title))))?.text || '' }));
    } catch (error) { out.error = error.status === 403 || error.status === 404 ? 'not_shared' : 'unavailable'; }
    return out;
  }));
}

const headerKey = (header) => String(header || '').trim().toLowerCase();
const fieldMatches = {
  company: (h) => h.includes('компан') || h.includes('company'), title: (h) => h.includes('позици') || h === 'position', task: (h) => h.includes('задач') || h === 'task',
  description: (h) => h.includes('описание') || h.includes('description'), who: (h) => h.includes('човек') || h.includes('отговор') || h.includes('рекрут') || h.includes('who'),
  status: (h) => h.includes('статус') || h === 'status', heads: (h) => h.includes('търсен') || h.includes('нужн') || h.includes('heads'), sent: (h) => h.includes('изпрат') || h.includes('sent'),
  interview: (h) => h.includes('интерв') || h.includes('interview'), offer: (h) => h.includes('оферт') || h.includes('offer'), hired: (h) => h.includes('нает') || h.includes('hired'),
  platform: (h) => h.includes('платформ') || h.includes('platform'), link: (h) => h.includes('линк') || h.includes('url') || h.includes('link'), from: (h) => h.includes('качен'), to: (h) => h.includes('валид'), notes: (h) => h.includes('бележ') || h.includes('notes'),
};

export async function appendSheetRow(sheetId, row, env) {
  const token = await accessToken(env); const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}`;
  const headResponse = await fetch(`${base}/values/A1:Z1?majorDimension=ROWS`, { headers: { Authorization: `Bearer ${token}` } });
  if (!headResponse.ok) { const error = new Error(`Sheet unavailable (${headResponse.status})`); error.status = headResponse.status; throw error; }
  const headers = ((await headResponse.json()).values || [])[0] || []; if (!headers.length) throw new Error('Sheet has no header row');
  const values = headers.map((raw) => { const h = headerKey(raw); const key = Object.keys(fieldMatches).find((candidate) => row[candidate] != null && fieldMatches[candidate](h)); return key ? String(row[key] ?? '') : ''; });
  const response = await fetch(`${base}/values/A:Z:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ values: [values] }) });
  if (!response.ok) { const error = new Error(`Sheet write failed (${response.status})`); error.status = response.status; throw error; }

}
