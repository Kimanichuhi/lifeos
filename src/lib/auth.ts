import { create } from './tinyStore';
import { deriveVaultKey, hashPin, verifyPin, exportVaultKey, importVaultKey } from './crypto';

const PIN_VERIFIER_KEY = 'lifeos-pin-verifier';
const BIOMETRIC_PREF_KEY = 'lifeos-biometric-pref';
const NOTIF_PREF_KEY = 'lifeos-notif-prefs';
const VAULT_KEY_SESSION_KEY = 'lifeos-vault-key-jwk';
const ATTEMPTS_KEY = 'lifeos-pin-attempts';
const LOCKOUT_KEY = 'lifeos-pin-lockout';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

export type AuthStatus = 'uninitialized' | 'locked' | 'unlocked' | 'setup';

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
  vaultKey: CryptoKey | null;
  biometricAvailable: boolean;
  biometricPreferred: boolean;
  error: string | null;
  notifications: NotificationPrefs;
  attempts: number;
  lockedUntil: number | null;
  setupPin: (pin: string) => Promise<void>;
  unlock: (pin: string) => Promise<boolean>;
  unlockWithBiometric: () => Promise<boolean>;
  lock: () => void;
  setBiometricPreferred: (v: boolean) => void;
  setNotifications: (prefs: Partial<NotificationPrefs>) => void;
  clearError: () => void;
  hasPin: () => boolean;
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

function getAttempts(): number {
  return parseInt(localStorage.getItem(ATTEMPTS_KEY) ?? '0', 10);
}

function setAttempts(n: number) {
  localStorage.setItem(ATTEMPTS_KEY, String(n));
}

function getLockout(): number | null {
  const v = localStorage.getItem(LOCKOUT_KEY);
  return v ? parseInt(v, 10) : null;
}

function setLockout(until: number | null) {
  if (until) localStorage.setItem(LOCKOUT_KEY, String(until));
  else localStorage.removeItem(LOCKOUT_KEY);
}

function isLockedOut(): boolean {
  const until = getLockout();
  if (!until) return false;
  if (Date.now() >= until) {
    setLockout(null);
    setAttempts(0);
    return false;
  }
  return true;
}

function lockoutRemaining(): number {
  const until = getLockout();
  return until ? Math.ceil((until - Date.now()) / 1000) : 0;
}

export const useAuth = create<AuthState>((set, get) => ({
  status: localStorage.getItem(PIN_VERIFIER_KEY) ? 'locked' : 'setup',
  vaultKey: null,
  biometricAvailable: typeof window !== 'undefined' && 'credentials' in navigator,
  biometricPreferred: localStorage.getItem(BIOMETRIC_PREF_KEY) === 'true',
  error: null,
  notifications: loadNotifPrefs(),
  attempts: getAttempts(),
  lockedUntil: getLockout(),

  hasPin: () => !!localStorage.getItem(PIN_VERIFIER_KEY),

  setupPin: async (pin: string) => {
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      set({ error: 'PIN must be exactly 6 digits.' });
      return;
    }
    const verifier = await hashPin(pin);
    localStorage.setItem(PIN_VERIFIER_KEY, verifier);
    const key = await deriveVaultKey(pin);
    // Cache the vault key as JWK for biometric (not the PIN itself)
    const jwk = await exportVaultKey(key);
    sessionStorage.setItem(VAULT_KEY_SESSION_KEY, jwk);
    setAttempts(0);
    setLockout(null);
    set({ status: 'unlocked', vaultKey: key, error: null, attempts: 0, lockedUntil: null });
  },

  unlock: async (pin: string) => {
    if (isLockedOut()) {
      const rem = lockoutRemaining();
      set({ error: `Too many attempts. Try again in ${Math.floor(rem / 60)}m ${rem % 60}s.` });
      return false;
    }
    const verifier = localStorage.getItem(PIN_VERIFIER_KEY);
    if (!verifier) {
      set({ status: 'setup' });
      return false;
    }
    const ok = await verifyPin(pin, verifier);
    if (!ok) {
      const attempts = getAttempts() + 1;
      setAttempts(attempts);
      if (attempts >= MAX_ATTEMPTS) {
        setLockout(Date.now() + LOCKOUT_MS);
        set({ error: `Too many attempts. Locked for 5 minutes.`, attempts, lockedUntil: Date.now() + LOCKOUT_MS });
      } else {
        const remaining = MAX_ATTEMPTS - attempts;
        set({ error: `Incorrect PIN. ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining.`, attempts });
      }
      return false;
    }
    const key = await deriveVaultKey(pin);
    // Cache the vault key as JWK for biometric (not the PIN itself)
    const jwk = await exportVaultKey(key);
    sessionStorage.setItem(VAULT_KEY_SESSION_KEY, jwk);
    setAttempts(0);
    setLockout(null);
    set({ status: 'unlocked', vaultKey: key, error: null, attempts: 0, lockedUntil: null });
    return true;
  },

  unlockWithBiometric: async () => {
    try {
      const cred = await (navigator as unknown as { credentials: { get: (opts: unknown) => Promise<unknown> } }).credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          timeout: 60000,
          userVerification: 'required',
        },
        mediation: 'optional',
      });
      if (!cred) return false;
      // Biometric succeeded — restore the cached vault key JWK (not the PIN).
      const jwk = sessionStorage.getItem(VAULT_KEY_SESSION_KEY);
      if (!jwk) return false;
      const key = await importVaultKey(jwk);
      set({ status: 'unlocked', vaultKey: key, error: null });
      return true;
    } catch {
      return false;
    }
  },

  lock: () => {
    // Clear the cached key from memory and sessionStorage.
    sessionStorage.removeItem(VAULT_KEY_SESSION_KEY);
    set({ status: 'locked', vaultKey: null, error: null });
  },

  setBiometricPreferred: (v: boolean) => {
    localStorage.setItem(BIOMETRIC_PREF_KEY, String(v));
    set({ biometricPreferred: v });
  },

  setNotifications: (prefs: Partial<NotificationPrefs>) => {
    const next = { ...get().notifications, ...prefs };
    saveNotifPrefs(next);
    set({ notifications: next });
  },

  clearError: () => set({ error: null }),
}));

// The vault key JWK is cached inside setupPin/unlock for biometric use.
// The raw PIN is never stored anywhere.
