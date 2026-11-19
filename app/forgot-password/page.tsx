"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "../components/link";

import { AuthShell } from "../components/auth-shell";
import { apiRequest } from "../lib/api";

type ActionResponse = {
  message: string;
  token?: string | null;
  reset_code?: string | null;
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [resetCode, setResetCode] = useState("");

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const data = await apiRequest<ActionResponse>("/auth/password/forgot", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMessage(data.message);
      if (data.token) {
        window.location.assign(`/reset-password?token=${encodeURIComponent(data.token)}`);
        return;
      }
      if (data.reset_code) {
        window.sessionStorage.setItem("social9-reset-email", email.trim().toLowerCase());
        window.sessionStorage.setItem("social9-reset-code", data.reset_code);
        setResetCode(data.reset_code);
      }
      setComplete(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to prepare password reset.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <div className="form-heading">
        <span className="eyebrow">Account recovery</span>
        <h2>Reset your password</h2>
        <p>Prepare a secure reset and return to your Social9 workspace.</p>
      </div>

      {complete ? (
        <div className="notice-card success-notice" role="status">
          <strong>{resetCode ? "Your test reset code" : "Request complete"}</strong>
          <p>{message}</p>
          {resetCode ? (
            <>
              <code className="reset-code" aria-label="Password reset code">{resetCode}</code>
              <Link className="primary-link" href="/reset-password">Continue to reset password</Link>
            </>
          ) : (
            <Link className="primary-link" href="/login">Return to sign in</Link>
          )}
        </div>
      ) : (
        <form onSubmit={requestReset}>
          <label className="field-label" htmlFor="recovery-email">Email address</label>
          <div className="input-wrap"><span className="input-icon" aria-hidden="true">@</span><input id="recovery-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@yourbusiness.com" required /></div>
          {error ? <p className="error-message form-error" role="alert">{error}</p> : null}
          <button className="primary-button form-action" type="submit" disabled={isSubmitting || !email}>{isSubmitting ? "Preparing reset..." : "Continue"}</button>
        </form>
      )}
      {!complete ? <p className="signup-copy"><Link href="/login">Back to sign in</Link></p> : null}
    </AuthShell>
  );
}
