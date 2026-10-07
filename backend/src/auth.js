// Вход с Google и собствени сесии, подписани с HMAC.
let jwksCache = null;
const encoder = new TextEncoder();

const base64UrlToBytes = (value) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  return Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0));
};
const bytesToBase64Url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const decodePart = (value) => JSON.parse(new TextDecoder().decode(base64UrlToBytes(value)));

async function googleKeys() {
  if (jwksCache && jwksCache.expiresAt > Date.now()) return jwksCache.keys;
  const response = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  if (!response.ok) throw new Error('Google keys unavailable');
  const keys = (await response.json()).keys || [];
  jwksCache = { keys, expiresAt: Date.now() + 3600000 };
  return keys;
}

export async function verifyGoogleIdToken(token, env) {
  const [encodedHeader, encodedPayload, encodedSignature] = String(token || '').split('.');
  if (!encodedHeader || !encodedPayload || !encodedSignature) throw new Error('Invalid token');
  const header = decodePart(encodedHeader);
  const payload = decodePart(encodedPayload);
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss)) throw new Error('Wrong issuer');
  if (!env.GOOGLE_CLIENT_ID || payload.aud !== env.GOOGLE_CLIENT_ID) throw new Error('Wrong audience');
  if (!payload.exp || payload.exp * 1000 <= Date.now()) throw new Error('Expired token');
  if (!payload.email || payload.email_verified === false || payload.email_verified === 'false') throw new Error('Email not verified');
  const jwk = (await googleKeys()).find((key) => key.kid === header.kid);
  if (!jwk) throw new Error('Unknown signing key');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, base64UrlToBytes(encodedSignature), encoder.encode(`${encodedHeader}.${encodedPayload}`));
  if (!valid) throw new Error('Invalid signature');
  return payload;
}

async function hmacKey(secret) {
  if (!secret || String(secret).length < 16) throw new Error('SESSION_SECRET is not configured');
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signSession(userId, secret, ttlSeconds = 60 * 60 * 24 * 30, now = Date.now()) {
  const body = bytesToBase64Url(encoder.encode(JSON.stringify({ uid: userId, exp: Math.floor(now / 1000) + ttlSeconds })));
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(body));
  return `${body}.${bytesToBase64Url(signature)}`;
}

export async function verifySession(token, secret, now = Date.now()) {
  const [body, signature] = String(token || '').split('.');
  if (!body || !signature) return null;
  let valid = false;
  try { valid = await crypto.subtle.verify('HMAC', await hmacKey(secret), base64UrlToBytes(signature), encoder.encode(body)); } catch { return null; }
  if (!valid) return null;
  try {
    const payload = decodePart(body);
    return payload.exp * 1000 > now && typeof payload.uid === 'string' ? payload.uid : null;
  } catch { return null; }
}
