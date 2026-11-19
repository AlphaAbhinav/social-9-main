"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "../components/link";

import { PlanIntentSummary } from "../components/plan-intent-summary";
import { AuthShell } from "../components/auth-shell";
import { apiRequest } from "../lib/api";
import type { Social9User } from "../lib/api";
import { getAccessToken } from "../lib/session";
import { planDestination } from "../lib/plan-intent";

type SignupResponse = {
  message: string;
  user: Social9User;
  verification_token?: string | null;
};

export default function SignupPage() {
  useEffect(() => {
    if (getAccessToken()) window.location.replace(planDestination());
  }, []);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [verificationRequired, setVerificationRequired] = useState(true);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setIsSubmitting(true);
    try {
      const data = await apiRequest<SignupResponse>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      if (data.verification_token) {
        window.location.assign(
          `/verify-email?token=${encodeURIComponent(data.verification_token)}`,
        );
        return;
      }
      setVerificationRequired(!data.user.is_verified);
      setMessage(data.message);
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : "Unable to create account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <PlanIntentSummary />
      <div className="form-heading compact-heading">
        <span className="eyebrow">Free content planning</span>
        <h2>Create your account</h2>
        <p>Create a free account to access your 30-day content plan.</p>
      </div>

      {message ? (
        <div className="notice-card" role="status">
          <strong>{verificationRequired ? "Check your email" : "Account created"}</strong>
          <p>{message}</p>
          <Link className="primary-link" href="/login">Return to sign in</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <label className="field-label" htmlFor="name">Full name</label>
          <div className="input-wrap">
            <span className="input-icon" aria-hidden="true">A</span>
            <input id="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" minLength={2} required />
          </div>

          <label className="field-label field-spaced" htmlFor="signup-email">Email address</label>
          <div className="input-wrap">
            <span className="input-icon" aria-hidden="true">@</span>
            <input id="signup-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@yourbusiness.com" required />
          </div>

          <label className="field-label field-spaced" htmlFor="signup-password">Password</label>
          <div className="input-wrap">
            <span className="input-icon" aria-hidden="true">#</span>
            <input id="signup-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" minLength={8} required />
          </div>

          <label className="field-label field-spaced" htmlFor="confirm-password">Confirm password</label>
          <div className="input-wrap">
            <span className="input-icon" aria-hidden="true">#</span>
            <input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat your password" minLength={8} required />
          </div>

          {error ? <p className="error-message form-error" role="alert">{error}</p> : null}
          <button className="primary-button form-action" type="submit" disabled={isSubmitting || name.length < 2 || !email || password.length < 8 || confirmPassword.length < 8}>
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>
      )}

      <p className="signup-copy">By creating an account, you agree to our <Link href="/terms">terms of service</Link> and <Link href="/privacy">privacy policy</Link>.</p>
      <p className="signup-copy">Already have an account? <Link href="/login">Sign in</Link></p>
    </AuthShell>
  );
}
