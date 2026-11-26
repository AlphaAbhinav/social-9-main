import { API_URL } from './api';

const KEY = 'social9_ecosystem_flow';

export async function startEcosystemLogin(): Promise<void> {
  const bytes = crypto.getRandomValues(new Uint8Array(48));
  const verifier = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const hashed = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  const challenge = btoa(String.fromCharCode(...hashed)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  sessionStorage.setItem(KEY, JSON.stringify({ verifier, expires: Date.now() + 10 * 60_000 }));
  window.location.assign(`${API_URL}/auth/ecosystem/login?handoff_challenge=${challenge}`);
}

export function readEcosystemVerifier(): string {
  const flow = JSON.parse(sessionStorage.getItem(KEY) || 'null');
  if (!flow || typeof flow.verifier !== 'string' || flow.expires < Date.now()) throw new Error('Start shared sign-in again in this browser.');
  return flow.verifier;
}

export function clearEcosystemFlow(): void { sessionStorage.removeItem(KEY); }
