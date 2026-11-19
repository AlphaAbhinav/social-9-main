const PREFIX = "social9_dashboard_cache:";
export const DASHBOARD_CACHE_TTL = 60_000;
export const DASHBOARD_CACHE_EVENT = "social9:dashboard-invalidated";
let generation = 0;

export function cacheGeneration(): number { return generation; }

export function readDashboardCache<T>(userId: number, brandId: number | null): T | null {
  if (typeof window === "undefined") return null;
  const key = `${PREFIX}${userId}:${brandId ?? "default"}`;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    const age = Date.now() - entry.savedAt;
    if (!Number.isFinite(age) || age < 0 || age >= DASHBOARD_CACHE_TTL) {
      window.sessionStorage.removeItem(key);
      return null;
    }
    return entry.data as T;
  } catch { return null; }
}

export function writeDashboardCache<T>(userId: number, brandId: number | null, data: T, expectedGeneration: number): void {
  if (typeof window === "undefined" || generation !== expectedGeneration) return;
  try {
    window.sessionStorage.setItem(`${PREFIX}${userId}:${brandId ?? "default"}`, JSON.stringify({ savedAt: Date.now(), data }));
  } catch { /* Storage restrictions must not prevent loading the dashboard. */ }
}

export function invalidateDashboardCache(): void {
  generation += 1;
  if (typeof window === "undefined") return;
  try {
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith(PREFIX)) window.sessionStorage.removeItem(key);
    }
  } catch { /* A blocked cache is equivalent to a cache miss. */ }
  window.dispatchEvent(new Event(DASHBOARD_CACHE_EVENT));
}
