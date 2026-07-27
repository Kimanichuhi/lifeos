// Client-side AES-GCM encryption using a key derived from the user's 6-digit PIN.
//
// Security model:
//   - The PIN is never stored or sent anywhere.
//   - A per-installation random salt is stored in localStorage and used for
//     both PIN verification and vault key derivation. This means the same PIN
//     on a different device produces a different key (defends against rainbow
//     tables and cross-device correlation).
//   - PBKDF2 uses 600,000 iterations (OWASP 2023 recommends ≥600k for SHA-256).
//   - For biometric unlock, the derived vault key is exported as JWK and
//     stored in sessionStorage (cleared on tab close). The raw PIN is NEVER
//     stored anywhere.
//   - Vault item titles are encrypted alongside content so the server sees
//     only ciphertext + a non-sensitive category label.

const enc = new TextEncoder();
const dec = new TextDecoder();

const SALT_KEY = 'lifeos-crypto-salt';
const ITERATIONS = 600_000;

function bufToB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function b64ToBuf(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function getOrCreateSalt(): Uint8Array {
  let stored = localStorage.getItem(SALT_KEY);
  if (stored) return b64ToBuf(stored);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  localStorage.setItem(SALT_KEY, bufToB64(salt));
  return salt;
}

async function deriveKey(pin: string, salt: Uint8Array, usages: KeyUsage[]): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true, // extractable so we can export for biometric caching
    usages,
  );
}

// PIN verification: encrypt a known plaintext, store salt:iv:ciphertext.
export async function hashPin(pin: string): Promise<string> {
  const salt = getOrCreateSalt();
  const key = await deriveKey(pin, salt, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode('lifeos-vault-verifier'));
  return `${bufToB64(salt)}:${bufToB64(iv)}:${bufToB64(ct)}`;
}

export async function verifyPin(pin: string, verifier: string): Promise<boolean> {
  try {
    const [saltB64, ivB64, ctB64] = verifier.split(':');
    const salt = b64ToBuf(saltB64);
    const iv = b64ToBuf(ivB64);
    const ct = b64ToBuf(ctB64);
    const key = await deriveKey(pin, salt, ['decrypt']);
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return true;
  } catch {
    return false;
  }
}

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string; // base64
}

export async function encryptString(plaintext: string, key: CryptoKey): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  return { ciphertext: bufToB64(ct), iv: bufToB64(iv) };
}

export async function decryptString(payload: EncryptedPayload, key: CryptoKey): Promise<string> {
  const iv = b64ToBuf(payload.iv);
  const ct = b64ToBuf(payload.ciphertext);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return dec.decode(pt);
}

export async function deriveVaultKey(pin: string): Promise<CryptoKey> {
  const salt = getOrCreateSalt();
  return deriveKey(pin, salt, ['encrypt', 'decrypt']);
}

// Biometric caching: export the vault key as JWK (not the PIN) to sessionStorage.
// This is cleared when the tab closes. The JWK alone cannot reconstruct the PIN.
export async function exportVaultKey(key: CryptoKey): Promise<string> {
  const jwk = await crypto.subtle.exportKey('jwk', key);
  return JSON.stringify(jwk);
}

export async function importVaultKey(jwkStr: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkStr) as JsonWebKey;
  return crypto.subtle.importKey('jwk', jwk, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

export async function encryptFile(file: File, key: CryptoKey): Promise<EncryptedPayload> {
  const buf = await file.arrayBuffer();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, buf);
  return { ciphertext: bufToB64(ct), iv: bufToB64(iv) };
}

export async function decryptToFile(payload: EncryptedPayload, key: CryptoKey, mimeType: string): Promise<Blob> {
  const iv = b64ToBuf(payload.iv);
  const ct = b64ToBuf(payload.ciphertext);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new Blob([pt], { type: mimeType });
}
