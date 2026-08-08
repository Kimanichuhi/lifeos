import { create } from './tinyStore';
import { supabase } from './supabase';
import { deriveVaultKey, reencryptVaultOnKeyChange, type VaultReencryptResult } from './crypto';
import { logger } from './logger';

const NOTIF_PREF_KEY = 'lifeos-notif-prefs';

// This is a single-owner app — only this account may ever sign in.
const OWNER_EMAIL = 'kimanichuhi254@gmail.com';

export type AuthStatus = 'signed-out' | 'unlocked';

export interface NotificationPrefs {
  enabled: boolean;
  dailyBrief: boolean;
  eveningReflection: boolean;
  motivation: boolean;
  bibleVerse: boolean;
  taskReminders: boolean;
  briefHour: number;
  briefMinute: number;
  eveningHour: number;
  eveningMinute: number;
}

const DEFAULT_NOTIF: NotificationPrefs = {
  enabled: false,
  dailyBrief: true,
  eveningReflection: true,
  motivation: true,
  bibleVerse: true,
  taskReminders: true,
  briefHour: 7,
  briefMinute: 0,
  eveningHour: 21,
  eveningMinute: 0,
};

interface AuthState {
  status: AuthStatus;
  email: string | null;
  vaultKey: CryptoKey | null;
  busy: boolean;
  error: string | null;
  notifications: NotificationPrefs;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<VaultReencryptResult | false>;
  setNotifications: (prefs: Partial<NotificationPrefs>) => void;
  clearError: () => void;
}

function loadNotifPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(NOTIF_PREF_KEY);
    if (raw) return { ...DEFAULT_NOTIF, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_NOTIF;
}

function saveNotifPrefs(p: NotificationPrefs) {
  localStorage.setItem(NOTIF_PREF_KEY, JSON.stringify(p));
}

export const useAuth = create<AuthState>((set, get) => ({
  status: 'signed-out',
  email: null,
  vaultKey: null,
  busy: false,
  error: null,
  notifications: loadNotifPrefs(),

  signIn: async (email: string, password: string) => {
    set({ busy: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ busy: false, error: error.message });
      return false;
    }
    const signedInEmail = data.user?.email ?? email;
    if (signedInEmail.toLowerCase() !== OWNER_EMAIL) {
      await supabase.auth.signOut();
      set({ busy: false, error: 'This app is restricted to a single account.' });
      return false;
    }
    const vaultKey = await deriveVaultKey(password);
    set({ status: 'unlocked', email: signedInEmail, vaultKey, busy: false, error: null });
    return true;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ status: 'signed-out', email: null, vaultKey: null, error: null });
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const email = get().email;
    const oldVaultKey = get().vaultKey;
    if (!email) return false;
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (verifyError) {
      set({ error: 'Current password is incorrect.' });
      return false;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      set({ error: error.message });
      return false;
    }
    const newVaultKey = await deriveVaultKey(newPassword);

    // The vault key is derived from the password: existing vault items are
    // ciphertext under the old key and must be re-encrypted now, before the
    // old key is gone, or they become permanently unreadable.
    let result: VaultReencryptResult = { total: 0, failed: [] };
    if (oldVaultKey) {
      try {
        result = await reencryptVaultOnKeyChange(oldVaultKey, newVaultKey);
      } catch (err) {
        logger.error('Vault re-encryption failed after password change', err);
      }
    }

    set({ vaultKey: newVaultKey, error: null });
    return result;
  },

  setNotifications: (prefs: Partial<NotificationPrefs>) => {
    const next = { ...get().notifications, ...prefs };
    saveNotifPrefs(next);
    set({ notifications: next });
  },

  clearError: () => set({ error: null }),
}));
