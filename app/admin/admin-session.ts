"use client";

const ADMIN_TOKEN_KEY = "social9_admin_access_token";
export const ADMIN_SESSION_EVENT = "social9-admin-session-change";

export function getAdminAccessToken(): string | null {
  return window.sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

export function saveAdminSession(token: string): void {
  window.sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  window.dispatchEvent(new Event(ADMIN_SESSION_EVENT));
}

export function clearAdminSession(): void {
  window.sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  window.dispatchEvent(new Event(ADMIN_SESSION_EVENT));
}
