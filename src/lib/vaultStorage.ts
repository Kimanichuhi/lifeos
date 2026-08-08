import { supabase } from './supabase';

const BUCKET = 'vault-files';

export function newVaultFilePath(): string {
  return `${crypto.randomUUID()}.bin`;
}

export async function uploadVaultFile(path: string, ciphertext: Blob, upsert = false) {
  return supabase.storage.from(BUCKET).upload(path, ciphertext, {
    contentType: 'application/octet-stream',
    upsert,
  });
}

export async function downloadVaultFile(path: string) {
  return supabase.storage.from(BUCKET).download(path);
}

export async function deleteVaultFile(path: string) {
  return supabase.storage.from(BUCKET).remove([path]);
}
