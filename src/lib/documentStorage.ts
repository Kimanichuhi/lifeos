import { supabase } from './supabase';

const BUCKET = 'documents';

export function newDocumentPath(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  const ext = dot >= 0 ? fileName.slice(dot) : '';
  return `${crypto.randomUUID()}${ext}`;
}

export async function uploadDocumentFile(path: string, file: File) {
  return supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || 'application/octet-stream',
  });
}

export async function downloadDocumentFile(path: string) {
  return supabase.storage.from(BUCKET).download(path);
}

export async function deleteDocumentFile(path: string) {
  return supabase.storage.from(BUCKET).remove([path]);
}

// Used for the WhatsApp share pipeline: a time-limited link the recipient's
// browser can fetch directly, without needing to be signed into this app.
export async function getDocumentSignedUrl(path: string, expiresInSeconds = 3600) {
  return supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
}
