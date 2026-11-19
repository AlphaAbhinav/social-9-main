"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { apiRequest } from "../../lib/api";
import { Social9Mark } from "../../components/social9-mark";
import Link from "../../components/link";
import { ThemeToggle } from "../../components/theme-toggle";
import { saveAdminSession } from "../admin-session";
import "../admin.css";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true); setError("");
    try {
      const result = await apiRequest<{ access_token: string }>("/admin/login", {
        method: "POST", body: JSON.stringify({ email, password, totp_code: totpCode || null }),
      });
      saveAdminSession(result.access_token);
      window.location.replace("/admin");
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : "Unable to sign in. Please try again.");
      setSubmitting(false);
    }
  }
  return <main className="s9-admin admin-login-page">
    <div className="admin-login-theme"><ThemeToggle compact /></div>
    <section className="admin-login-card">
      <Link className="admin-logo" href="/"><Social9Mark /><span>social<span>9</span><small>ADMIN PORTAL</small></span></Link>
      <p className="admin-eyebrow">PLATFORM ADMINISTRATION</p>
      <h1>Admin sign in</h1>
      <p className="admin-login-intro">Sign in with your administrator email and password.</p>
      <form onSubmit={signIn}>
        <label htmlFor="admin-email">Admin email</label>
        <input id="admin-email" name="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={submitting} />
        <label htmlFor="admin-password">Password</label>
        <div className="admin-password-field">
          <input id="admin-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} disabled={submitting} />
          <button className="admin-password-toggle" type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-controls="admin-password" aria-pressed={showPassword} disabled={submitting} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? "Hide" : "Show"}</button>
        </div>
        <label htmlFor="admin-totp">Authenticator code (if enabled)</label>
        <input id="admin-totp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={totpCode} onChange={event => setTotpCode(event.target.value.replace(/\D/g, "").slice(0, 6))} disabled={submitting} />
        {error && <p className="admin-login-error" role="alert">{error}</p>}
        <button className="admin-export" type="submit" disabled={submitting}>{submitting ? "Signing in…" : "Sign in to admin"}</button>
      </form>
      <Link className="admin-login-back" href="/">Back to Social9</Link>
    </section>
  </main>;
}
