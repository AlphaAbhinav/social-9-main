import type { Social9User } from "./api";
import { invalidateDashboardCache } from "./dashboard-cache";

const TOKEN_KEY = "social9_access_token";
const USER_KEY = "social9_user";

export function saveSession(
  token: string,
  user: Social9User,
  remember: boolean,
): void {
  clearSession();
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(TOKEN_KEY, token);
  storage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("social9-session-change"));
}

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

export function getSessionUser(): Social9User | null {
  if (typeof window === "undefined") return null;

  const storedUser = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser) as Social9User;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  localStorage.removeItem("social9_active_brand_id");
  invalidateDashboardCache();
  window.dispatchEvent(new Event("social9-session-change"));
}
