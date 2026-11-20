"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "../components/link";

import { AuthShell } from "../components/auth-shell";
import { apiRequest } from "../lib/api";
import { track } from "../lib/track";

type ActionResponse = { message: string };

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setToken(new URLSearchParams(window.location.search).get("token") ?? "");
      setEmail(window.sessionStorage.getItem("social9-reset-email") ?? "");
      setCode(window.sessionStorage.getItem("social9-reset-code") ?? "");
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!token && (!email || !code)) {
      setError("Enter the email address and reset code from the previous step.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const proof = token ? { token } : { email, code };
      const data = await apiRequest<ActionResponse>("/auth/password/reset", {
        method: "POST",
        body: JSON.stringify({ ...proof, new_password: password }),
      });
      window.sessionStorage.removeItem("social9-reset-email");
      window.sessionStorage.removeItem("social9-reset-code");
      setMessage(data.message);
      setComplete(true);
      track("password_reset_completed");
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Unable to reset your password.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <div className="form-heading">
        <span className="eyebrow">Account recovery</span>
        <h2>Choose a new password</h2>
        <p>Use at least eight characters and keep it unique to Social9.</p>
      </div>

      {complete ? (
        <div className="notice-card success-notice" role="status">
          <strong>Password updated</strong>
          <p>{message}</p>
          <Link className="primary-link" href="/login">Continue to sign in</Link>
        </div>
      ) : !ready ? (
        <div className="notice-card" role="status">
          <strong>Preparing password reset...</strong>
          <p>Please wait a moment.</p>
        </div>
      ) : (
        <form onSubmit={resetPassword}>
          {!token ? (
            <>
              <label className="field-label" htmlFor="reset-email">Email address</label>
              <div className="input-wrap"><span className="input-icon" aria-hidden="true">@</span><input id="reset-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
              <label className="field-label field-spaced" htmlFor="reset-code">Reset code</label>
              <div className="input-wrap"><span className="input-icon" aria-hidden="true">#</span><input id="reset-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 8))} maxLength={8} placeholder="8-digit code" required /></div>
            </>
          ) : null}
          <label className={`field-label${token ? "" : " field-spaced"}`} htmlFor="new-password">New password</label>
          <div className="input-wrap"><span className="input-icon input-icon-lock" aria-hidden="true">#</span><input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} placeholder="At least 8 characters" required /></div>
          <label className="field-label field-spaced" htmlFor="confirm-new-password">Confirm new password</label>
          <div className="input-wrap"><span className="input-icon input-icon-lock" aria-hidden="true">#</span><input id="confirm-new-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} placeholder="Repeat your password" required /></div>
          {error ? <p className="error-message form-error" role="alert">{error}</p> : null}
          <button className="primary-button form-action" type="submit" disabled={isSubmitting || (!token && (!email || code.length !== 8)) || password.length < 8 || confirmPassword.length < 8}>{isSubmitting ? "Updating password..." : "Update password"}</button>
        </form>
      )}

      {!complete ? <p className="signup-copy"><Link href="/forgot-password">Request another code</Link> · <Link href="/login">Back to sign in</Link></p> : null}
    </AuthShell>
  );
}
