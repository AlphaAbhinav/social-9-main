"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "../components/link";

import { PlanIntentSummary } from "../components/plan-intent-summary";
import { AuthShell } from "../components/auth-shell";
import { apiRequest } from "../lib/api";
import type { Social9User } from "../lib/api";
import { planDestination } from "../lib/plan-intent";
import { getAccessToken, saveSession } from "../lib/session";

type LoginResponse = {
  access_token: string;
  token_type: string;
  user: Social9User;
};

const showDemoAccess = process.env.NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS === "true";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (getAccessToken()) {
      window.location.replace(planDestination());
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const data = await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      saveSession(data.access_token, data.user, rememberMe);
      window.location.assign(planDestination());
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : "We couldn't sign you in.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <PlanIntentSummary />
      <div className="form-heading">
        <span className="eyebrow">Welcome back</span>
        <h2>Sign in to Social9</h2>
        <p>Pick up where you left off and keep your content moving.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <label className="field-label" htmlFor="email">Email address</label>
        <div className="input-wrap">
          <span className="input-icon" aria-hidden="true">@</span>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@yourbusiness.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="password-label-row">
          <label className="field-label" htmlFor="password">Password</label>
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
        <div className="input-wrap">
          <span className="input-icon input-icon-lock" aria-hidden="true">#</span>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
          <button
            className="password-toggle"
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
          />
          <span>Keep me signed in on this device</span>
        </label>

        {error ? <p className="error-message" role="alert">{error}</p> : null}

        <button
          className="primary-button"
          type="submit"
          disabled={isSubmitting || !email || password.length < 8}
        >
          {isSubmitting ? "Signing you in..." : "Sign in"}
        </button>
      </form>

      {showDemoAccess ? (
        <div className="demo-note">
          <span className="demo-icon" aria-hidden="true">i</span>
          <p>
            <strong>Local prototype access</strong>
            demo@social9.in - Social9Demo!
          </p>
        </div>
      ) : null}

      <p className="signup-copy">
        New to Social9? <Link href="/signup">Create an account</Link>
      </p>
    </AuthShell>
  );
}
