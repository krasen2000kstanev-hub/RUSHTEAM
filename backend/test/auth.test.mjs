import test from 'node:test';
import assert from 'node:assert/strict';
import { signSession, verifySession, verifyGoogleIdToken } from '../src/auth.js';
import { rowsToCsv, textToBase64 } from '../src/sheets.js';

const SECRET = 'unit-test-secret-0123456789';

test('session round trip', async () => {
  const token = await signSession('u_1', SECRET);
  assert.equal(await verifySession(token, SECRET), 'u_1');
});

test('tampered, expired or foreign sessions are rejected', async () => {
  const token = await signSession('u_1', SECRET);
  const [body, signature] = token.split('.');
  const forged = btoa(JSON.stringify({ uid: 'u_admin', exp: 9999999999 })).replace(/=+$/, '');
  assert.equal(await verifySession(`${forged}.${signature}`, SECRET), null);
  assert.equal(await verifySession(`${body}.${signature.slice(0, -2)}AA`, SECRET), null);
  assert.equal(await verifySession(token, 'another-secret-0123456789'), null);
  assert.equal(await verifySession(await signSession('u_1', SECRET, -10), SECRET), null);
  assert.equal(await verifySession('garbage', SECRET), null);
  assert.equal(await verifySession('', SECRET), null);
});

test('signing refuses a missing or short secret', async () => {
  await assert.rejects(() => signSession('u_1', ''));
  await assert.rejects(() => signSession('u_1', 'short'));
});

test('google token: wrong audience or issuer fails before any network call', async () => {
  const part = (value) => btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const make = (payload) => `${part({ alg: 'RS256', kid: 'k' })}.${part(payload)}.c2ln`;
  const env = { GOOGLE_CLIENT_ID: 'mine.apps.googleusercontent.com' };
  const base = { iss: 'https://accounts.google.com', aud: env.GOOGLE_CLIENT_ID, exp: Math.floor(Date.now() / 1000) + 600, email: 'a@b.c', email_verified: true };
  await assert.rejects(() => verifyGoogleIdToken(make({ ...base, aud: 'someone-else' }), env), /audience/);
  await assert.rejects(() => verifyGoogleIdToken(make({ ...base, iss: 'https://evil.example' }), env), /issuer/);
  await assert.rejects(() => verifyGoogleIdToken(make({ ...base, exp: 1 }), env), /Expired/);
  await assert.rejects(() => verifyGoogleIdToken(make({ ...base, email_verified: false }), env), /verified/);
  await assert.rejects(() => verifyGoogleIdToken('nope', env), /Invalid/);
});

test('csv export keeps commas, quotes, newlines and Cyrillic', () => {
  const csv = rowsToCsv([['Компания', 'Бележки'], ['Магнум 7', 'опит, "английски"\nвтори ред'], ['AVIAT']]);
  assert.equal(csv, 'Компания,Бележки\r\nМагнум 7,"опит, ""английски""\nвтори ред"\r\nAVIAT');
  assert.equal(new TextDecoder().decode(Uint8Array.from(atob(textToBase64('Здравей')), (c) => c.charCodeAt(0))), 'Здравей');
});
