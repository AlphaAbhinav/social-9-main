"use client";

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { AuthShell } from '../../../components/auth-shell';
import Link from '../../../components/link';
import { apiRequest } from '../../../lib/api';
import type { Social9User } from '../../../lib/api';
import { clearEcosystemFlow, readEcosystemVerifier } from '../../../lib/ecosystem';
import { saveSession } from '../../../lib/session';
import { planDestination } from '../../../lib/plan-intent';

type Exchange = { link_required?: boolean; shared_email?: string; message?: string; access_token?: string; user?: Social9User };

export default function CompleteSharedSignIn() {
  const started = useRef(false);
  const flow = useRef({ code: '', verifier: '' });
  const [link, setLink] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);

  async function finish(credentials?: { email: string; password: string }) {
    setBusy(true);
    setError('');
    try {
      const data = await apiRequest<Exchange>('/auth/ecosystem/exchange', { method: 'POST', body: JSON.stringify({ ...flow.current, ...credentials }) });
      if (data.link_required) { setLink(true); setEmail(data.shared_email || ''); return; }
      if (!data.access_token || !data.user) throw new Error('The sign-in response was incomplete.');
      saveSession(data.access_token, data.user, false);
      clearEcosystemFlow();
      window.location.replace(planDestination());
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to finish shared sign-in.'); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    try {
      const code = new URLSearchParams(window.location.search).get('code');
      if (!code) throw new Error('This sign-in response is incomplete.');
      flow.current = { code, verifier: readEcosystemVerifier() };
      window.history.replaceState({}, '', window.location.pathname);
      void finish();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Start shared sign-in again.'); setBusy(false); }
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void finish({ email, password }); }

  return <AuthShell><div className="form-heading"><h2>{link ? 'Link your existing Social9 account' : 'Completing shared sign-in'}</h2><p>{link ? 'Verify your existing Social9 account once. Its content, connected social accounts and plan stay with it.' : 'Your shared account will open your Social9 workspace.'}</p></div>{error && <p role="alert">{error}</p>}{link && <form onSubmit={submit}><label className="field-label" htmlFor="link-email">Existing Social9 email</label><div className="input-wrap"><input id="link-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required /></div><label className="field-label" htmlFor="link-password">Existing Social9 password</label><div className="input-wrap"><input id="link-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required /></div><button type="submit" className="primary-button" disabled={busy}>{busy ? 'Verifying…' : 'Verify and link account'}</button></form>}{!link && busy && <p role="status">Verifying your sign-in…</p>}<Link href="/auth/ecosystem/start">Restart shared sign-in</Link></AuthShell>;
}
