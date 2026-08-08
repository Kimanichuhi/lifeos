// Client-side AES-GCM encryption using a key derived from the user's account password.
//
// Security model:
//   - The password is never stored; it is only held in memory for the
//     duration of the session (see lib/auth.ts).
//   - A per-installation random salt is stored in localStorage and used for
//     vault key derivation. This means the same password on a different
//     device produces a different key (defends against rainbow tables and
//     cross-device correlation) — the vault is scoped to this installation.
//   - PBKDF2 uses 600,000 iterations (OWASP 2023 recommends ≥600k for SHA-256).
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
  const stored = localStorage.getItem(SALT_KEY);
  if (stored) return b64ToBuf(stored);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  localStorage.setItem(SALT_KEY, bufToB64(salt));
  return salt;
}

async function deriveKey(password: string, salt: Uint8Array, usages: KeyUsage[]): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    usages,
  );
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

export async function deriveVaultKey(password: string): Promise<CryptoKey> {
  const salt = getOrCreateSalt();
  return deriveKey(password, salt, ['encrypt', 'decrypt']);
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

// Storage-backed variant: returns the ciphertext as a raw Blob (no base64
// inflation) so it can be uploaded directly to Supabase Storage. The IV is
// small and still returned as base64 to store alongside the row.
export async function encryptFileToBlob(file: File, key: CryptoKey): Promise<{ blob: Blob; iv: string }> {
  const buf = await file.arrayBuffer();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, buf);
  return { blob: new Blob([ct]), iv: bufToB64(iv) };
}

export async function decryptBlobToFile(ciphertext: Blob, ivB64: string, key: CryptoKey, mimeType: string): Promise<Blob> {
  const iv = b64ToBuf(ivB64);
  const ct = await ciphertext.arrayBuffer();
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new Blob([pt], { type: mimeType });
}

async function encryptBlob(plain: Blob, key: CryptoKey): Promise<{ blob: Blob; iv: string }> {
  const buf = await plain.arrayBuffer();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, buf);
  return { blob: new Blob([ct]), iv: bufToB64(iv) };
}

async function decryptBlob(ciphertext: Blob, ivB64: string, key: CryptoKey): Promise<Blob> {
  const iv = b64ToBuf(ivB64);
  const ct = await ciphertext.arrayBuffer();
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new Blob([pt]);
}

// The vault key is derived from the account password (see deriveVaultKey).
// Changing the password therefore changes the key — every existing vault
// item, which is still ciphertext under the *old* key, would otherwise
// become permanently undecryptable the moment the password change succeeds.
// This re-encrypts every vault_items row (and any file it points at in the
// vault-files Storage bucket) from oldKey to newKey, called by
// auth.ts#changePassword after the Supabase password update succeeds but
// before the old key is discarded.
export interface VaultReencryptResult {
  total: number;
  failed: { id: string; title: string }[];
}

export async function reencryptVaultOnKeyChange(
  oldKey: CryptoKey,
  newKey: CryptoKey,
): Promise<VaultReencryptResult> {
  // Dynamic imports here (not at module top) are deliberate: crypto.ts is
  // pure Web Crypto with no Supabase dependency and is tested under Node
  // (see crypto.test.ts), where a static import of ./supabase would throw
  // at module load time (VITE_SUPABASE_URL is unset outside the app).
  const { supabase } = await import('./supabase');
  const { uploadVaultFile, downloadVaultFile } = await import('./vaultStorage');

  const { data, error } = await supabase.from('vault_items').select('*');
  if (error) throw error;
  const items = data ?? [];
  const failed: { id: string; title: string }[] = [];

  for (const item of items) {
    try {
      const patch: Record<string, unknown> = {};

      if (item.encrypted_title && item.title_iv) {
        const title = await decryptString({ ciphertext: item.encrypted_title, iv: item.title_iv }, oldKey);
        const reencTitle = await encryptString(title, newKey);
        patch.encrypted_title = reencTitle.ciphertext;
        patch.title_iv = reencTitle.iv;
      }

      if (item.encrypted_data) {
        const plain = await decryptString({ ciphertext: item.encrypted_data, iv: item.iv }, oldKey);
        const reenc = await encryptString(plain, newKey);
        patch.encrypted_data = reenc.ciphertext;
        patch.iv = reenc.iv;
      } else if (item.storage_path) {
        const { data: fileData, error: dlErr } = await downloadVaultFile(item.storage_path);
        if (dlErr || !fileData) throw dlErr ?? new Error('download failed');
        const plainBlob = await decryptBlob(fileData, item.iv, oldKey);
        const { blob: reencBlob, iv: reencIv } = await encryptBlob(plainBlob, newKey);
        const { error: upErr } = await uploadVaultFile(item.storage_path, reencBlob, true);
        if (upErr) throw upErr;
        patch.iv = reencIv;
      }

      const { error: updErr } = await supabase.from('vault_items').update(patch).eq('id', item.id);
      if (updErr) throw updErr;
    } catch {
      failed.push({ id: item.id, title: item.encrypted_title ? '(encrypted)' : 'Untitled' });
    }
  }

  return { total: items.length, failed };
}
