import { useEffect } from 'react';
import { create } from './tinyStore';

export type AccentName = 'blue' | 'emerald' | 'violet' | 'amber' | 'rose' | 'cyan';
export type ThemeMode = 'light' | 'dark' | 'system';

interface AccentScale {
  [key: number]: string;
}

const ACCENTS: Record<AccentName, AccentScale> = {
  blue: {
    50: '238 242 255', 100: '224 233 255', 200: '199 215 255', 300: '165 188 255',
    400: '124 152 255', 500: '90 108 236', 600: '66 80 200', 700: '55 67 170',
    800: '47 57 140', 900: '42 50 116',
  },
  emerald: {
    50: '236 253 245', 100: '209 250 229', 200: '167 243 208', 300: '110 231 183',
    400: '52 211 153', 500: '16 185 129', 600: '5 150 105', 700: '4 120 87',
    800: '6 95 70', 900: '6 78 59',
  },
  violet: {
    50: '245 243 255', 100: '237 233 254', 200: '221 214 254', 300: '196 181 253',
    400: '167 139 250', 500: '139 92 246', 600: '124 58 237', 700: '109 40 217',
    800: '91 33 182', 900: '76 29 149',
  },
  amber: {
    50: '255 251 235', 100: '254 243 199', 200: '253 230 138', 300: '252 211 77',
    400: '251 191 36', 500: '245 158 11', 600: '217 119 6', 700: '180 83 9',
    800: '146 64 14', 900: '120 53 15',
  },
  rose: {
    50: '255 241 242', 100: '255 228 230', 200: '254 205 211', 300: '253 164 175',
    400: '251 113 133', 500: '244 63 94', 600: '225 29 72', 700: '190 18 60',
    800: '159 18 57', 900: '136 19 55',
  },
  cyan: {
    50: '236 254 255', 100: '207 250 254', 200: '165 243 252', 300: '103 232 249',
    400: '34 211 238', 500: '6 182 212', 600: '8 145 178', 700: '14 116 144',
    800: '21 94 117', 900: '22 78 99',
  },
};

interface SettingsState {
  theme: ThemeMode;
  accent: AccentName;
  setTheme: (t: ThemeMode) => void;
  setAccent: (a: AccentName) => void;
  toggleDark: () => void;
}

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
  root.classList.toggle('dark', isDark);
}

function applyAccent(accent: AccentName) {
  const scale = ACCENTS[accent];
  const root = document.documentElement;
  Object.keys(scale).forEach((k) => {
    root.style.setProperty(`--accent-${k}`, scale[Number(k)]);
  });
}

export const useSettings = create<SettingsState>((set, get) => ({
  theme: (localStorage.getItem('lifeos-theme') as ThemeMode) || 'system',
  accent: (localStorage.getItem('lifeos-accent') as AccentName) || 'blue',
  setTheme: (theme) => {
    localStorage.setItem('lifeos-theme', theme);
    applyTheme(theme);
    set({ theme });
  },
  setAccent: (accent) => {
    localStorage.setItem('lifeos-accent', accent);
    applyAccent(accent);
    set({ accent });
  },
  toggleDark: () => {
    const cur = get().theme;
    const next = cur === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },
}));

// Initialize on first import
if (typeof window !== 'undefined') {
  const s = useSettings.getState();
  applyTheme(s.theme);
  applyAccent(s.accent);
  // React to system changes when in system mode
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (useSettings.getState().theme === 'system') applyTheme('system');
  });
}

export function useThemeInit() {
  const theme = useSettings((s) => s.theme);
  const accent = useSettings((s) => s.accent);
  useEffect(() => { applyTheme(theme); }, [theme]);
  useEffect(() => { applyAccent(accent); }, [accent]);
}
