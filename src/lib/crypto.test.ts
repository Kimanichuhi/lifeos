// @vitest-environment node
// jsdom does not implement SubtleCrypto; this module is pure Web Crypto
// logic with no DOM dependency, so it runs under Node's native webcrypto.
import { describe, expect, it, vi } from 'vitest';

vi.stubGlobal('localStorage', (() => {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  };
})());

const { encryptString, decryptString, deriveVaultKey, encryptFile, decryptToFile } = await import('./crypto');

describe('encryptString / decryptString', () => {
  it('round-trips plaintext through the same key', async () => {
    const key = await deriveVaultKey('correct-horse-battery-staple');
    const payload = await encryptString('a secret note', key);
    const plain = await decryptString(payload, key);
    expect(plain).toBe('a secret note');
  });

  it('produces a different ciphertext each time (random IV)', async () => {
    const key = await deriveVaultKey('correct-horse-battery-staple');
    const a = await encryptString('same text', key);
    const b = await encryptString('same text', key);
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.iv).not.toBe(b.iv);
  });

  it('fails to decrypt with the wrong key', async () => {
    const key1 = await deriveVaultKey('password-one');
    const key2 = await deriveVaultKey('password-two');
    const payload = await encryptString('sensitive', key1);
    await expect(decryptString(payload, key2)).rejects.toThrow();
  });
});

describe('encryptFile / decryptToFile', () => {
  it('round-trips file bytes through the same key', async () => {
    const key = await deriveVaultKey('file-password');
    const original = new File([new Uint8Array([1, 2, 3, 4, 5])], 'test.bin', { type: 'application/octet-stream' });
    const encrypted = await encryptFile(original, key);
    const blob = await decryptToFile(encrypted, key, 'application/octet-stream');
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(Array.from(bytes)).toEqual([1, 2, 3, 4, 5]);
  });
});
