"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "../components/link";

import { AuthShell } from "../components/auth-shell";
import { apiRequest } from "../lib/api";

type ActionResponse = { message: string; token?: string | null };

export default function VerifyEmailPage() {
  const started = useRef(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "working" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function verifyToken(token: string) {
    setStatus("working");
    try {
      const data = await apiRequest<ActionResponse>("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      setMessage(data.message);
      setStatus("success");
    } catch (verificationError) {
      setMessage(verificationError instanceof Error ? verificationError.message : "Verification failed.");
      setStatus("error");
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) {
      const timer = window.setTimeout(() => void verifyToken(token), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("working");
    try {
      const data = await apiRequest<ActionResponse>("/auth/verification/request", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      if (data.token) {
        await verifyToken(data.token);
      } else {
        setMessage(data.message);
        setStatus("success");
      }
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : "Unable to prepare verification.");
      setStatus("error");
    }
  }

  return (
    <AuthShell>
      <div className="form-heading">
        <span className="eyebrow">Account security</span>
        <h2>Verify your email</h2>
        <p>Verification keeps your workspace and connected accounts protected.</p>
      </div>

      {status === "working" ? <div className="notice-card" role="status"><strong>Verifying...</strong><p>Please wait a moment.</p></div> : null}
      {status === "success" ? <div className="notice-card success-notice" role="status"><strong>Email verification complete</strong><p>{message}</p><Link className="primary-link" href="/login">Continue to sign in</Link></div> : null}
      {status === "error" ? <p className="error-message" role="alert">{message}</p> : null}

      {(status === "idle" || status === "error") ? (
        <form onSubmit={resend}>
          <label className="field-label" htmlFor="verification-email">Email address</label>
          <div className="input-wrap">
            <span className="input-icon" aria-hidden="true">@</span>
            <input id="verification-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@yourbusiness.com" required />
          </div>
          <button className="primary-button form-action" type="submit" disabled={!email}>Prepare verification</button>
        </form>
      ) : null}
      <p className="signup-copy"><Link href="/login">Back to sign in</Link></p>
    </AuthShell>
  );
}
