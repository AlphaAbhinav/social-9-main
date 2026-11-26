"use client";

import { useEffect, useRef, useState } from 'react';
import { AuthShell } from '../../../components/auth-shell';
import Link from '../../../components/link';
import { startEcosystemLogin } from '../../../lib/ecosystem';

export default function StartSharedSignIn() {
  const started = useRef(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    startEcosystemLogin().catch(() => setError('Unable to start shared sign-in. Please try again.'));
  }, []);
  return <AuthShell><div className="form-heading"><h2>Opening your shared account</h2><p>{error || 'Continue securely with your VisionaryCue account.'}</p><Link href="/login">Back to Social9 sign in</Link></div></AuthShell>;
}
