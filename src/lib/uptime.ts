// Client-side reachability checks. Browsers can't read the HTTP status of a
// cross-origin response without CORS, so `mode: 'no-cors'` gives us an
// opaque response — enough to tell "reachable" from "network error timed
// out / DNS failed / connection refused" and to measure round-trip time,
// but NOT a real status-code uptime monitor. Good enough for a personal
// at-a-glance widget; not a replacement for a real monitoring service.

const TARGETS_KEY = 'lifeos-uptime-targets';

export interface UptimeTarget {
  name: string;
  url: string;
}

export interface UptimeResult extends UptimeTarget {
  reachable: boolean;
  latencyMs: number | null;
}

export function getUptimeTargets(): UptimeTarget[] {
  try {
    const raw = localStorage.getItem(TARGETS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to defaults
  }
  const defaults: UptimeTarget[] = [];
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (supabaseUrl) defaults.push({ name: 'Supabase', url: `${supabaseUrl}/rest/v1/` });
  defaults.push({ name: 'This app', url: window.location.origin });
  return defaults;
}

export function setUptimeTargets(targets: UptimeTarget[]) {
  localStorage.setItem(TARGETS_KEY, JSON.stringify(targets));
}

async function pingOne(target: UptimeTarget, timeoutMs = 6000): Promise<UptimeResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    await fetch(target.url, { mode: 'no-cors', cache: 'no-store', signal: controller.signal });
    return { ...target, reachable: true, latencyMs: Math.round(performance.now() - started) };
  } catch {
    return { ...target, reachable: false, latencyMs: null };
  } finally {
    clearTimeout(timer);
  }
}

export async function checkUptime(targets: UptimeTarget[]): Promise<UptimeResult[]> {
  return Promise.all(targets.map((t) => pingOne(t)));
}
