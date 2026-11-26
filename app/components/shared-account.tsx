"use client";

import Link from './link';

export function SharedAccountSignIn() {
  if (process.env.NEXT_PUBLIC_ECOSYSTEM_SSO_ENABLED !== 'true') return null;
  return <div className="notice-card"><strong>Your VisionaryCue account works here.</strong><p>Use the same shared account as vCueHub and connected vCueStore access.</p><Link className="primary-link" href="/auth/ecosystem/start">Continue with VisionaryCue</Link></div>;
}
