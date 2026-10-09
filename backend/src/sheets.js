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

export function rowsToCsv(rows) {
  const cell = (value) => {
    const text = value == null ? '' : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return (rows || []).map((row) => (row || []).map(cell).join(',')).join('\r\n');
}

export function textToBase64(text) {
  const bytes = encoder.encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

const sheetCache = new Map();

// Връща първия лист на таблицата като CSV. Кешира за 30 секунди.
export async function readSheetCsv(sheetId, env) {
  const cached = sheetCache.get(sheetId);
  if (cached && cached.expiresAt > Date.now()) return cached.csv;
  const token = await accessToken(env);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/A1:Z3000?majorDimension=ROWS`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const error = new Error(`Sheet unavailable (${response.status})`);
    error.status = response.status;
    throw error;
  }
  const csv = rowsToCsv((await response.json()).values || []);
  sheetCache.set(sheetId, { csv, expiresAt: Date.now() + 30000 });
  return csv;
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
  sheetCache.delete(sheetId);
}
