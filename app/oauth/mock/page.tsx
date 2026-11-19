"use client";

import Link from "../../components/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Social9Mark } from "../../components/social9-mark";
import { SocialIcon } from "../../components/social-icon";
import { API_URL } from "../../lib/api";

type Provider = "instagram" | "linkedin" | "facebook";

const providerDetails: Record<Provider, {
  name: string;
  owner: string;
  badge: string;
  permissions: string[];
}> = {
  instagram: {
    name: "Instagram",
    owner: "Meta",
    badge: "IG",
    permissions: [
      "View your professional profile",
      "Prepare and schedule content",
      "Read post performance insights",
    ],
  },
  facebook: { name: "Facebook Pages", owner: "Meta", badge: "f", permissions: ["List Pages you manage", "Publish text, photos, videos and Reels to your Pages"] },
  linkedin: {
    name: "LinkedIn",
    owner: "LinkedIn",
    badge: "in",
    permissions: [
      "View your professional profile",
      "Prepare posts for your account",
      "Read content performance insights",
    ],
  },
};

function MockOAuthContent() {
  const searchParameters = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const selectedProvider = searchParameters.get("provider");
  const provider: Provider | null =
    selectedProvider === "instagram" || selectedProvider === "linkedin" || selectedProvider === "facebook"
      ? selectedProvider
      : null;
  const state = searchParameters.get("state") ?? "";

  function finish(action: "approve" | "cancel") {
    if (!provider || !state || submitting) return;
    setSubmitting(true);
    const parameters = new URLSearchParams({ state });
    if (action === "approve") {
      parameters.set("code", `manager-demo-${provider}`);
    } else {
      parameters.set("error", "access_denied");
    }
    window.location.assign(
      `${API_URL}/social-accounts/${provider}/callback?${parameters.toString()}`,
    );
  }

  const details = provider ? providerDetails[provider] : null;
  const invalid = !details || !state;

  return (
    <main className="oauth-preview-shell">
      <div className="oauth-preview-orb oauth-preview-orb-one" />
      <div className="oauth-preview-orb oauth-preview-orb-two" />

      <header className="oauth-preview-header">
        <Link className="oauth-preview-brand" href="/">
          <Social9Mark />
          <span>SOCIAL<b>9</b></span>
        </Link>
        <span className="oauth-preview-mode"><i /> Demonstration mode</span>
      </header>

      <section className="oauth-preview-card" aria-live="polite">
        {invalid ? (
          <div className="oauth-preview-invalid">
            <span className="oauth-preview-warning">!</span>
            <p className="oauth-preview-kicker">Link unavailable</p>
            <h1>This connection request is incomplete.</h1>
            <p>Return to your Social9 accounts page and start the connection again.</p>
            <Link className="oauth-preview-return" href="/accounts">Return to accounts</Link>
          </div>
        ) : (
          <>
            <div className="oauth-preview-provider-row">
              <span className="oauth-preview-app"><Social9Mark /></span>
              <span className="oauth-preview-link" aria-hidden="true"><i /><i /><i /></span>
              <SocialIcon className="oauth-preview-provider" provider={provider ?? "instagram"} />
            </div>

            <p className="oauth-preview-kicker">Preview the connection</p>
            <h1>Connect {details?.name ?? "your account"} to Social9?</h1>
            <p className="oauth-preview-intro">
              Social9 will use the approved access to help you plan, publish, and understand your content.
            </p>

            <div className="oauth-preview-identity">
              <span>{details?.badge ?? ""}</span>
              <div>
                <small>{details?.owner ?? "Provider"} account</small>
                <strong>Social9 Demo Profile</strong>
              </div>
              <b>Preview</b>
            </div>

            <div className="oauth-preview-permissions">
              <small>Social9 is requesting permission to</small>
              <ul>
                {(details?.permissions ?? []).map((permission) => (
                  <li key={permission}><span>&#10003;</span>{permission}</li>
                ))}
              </ul>
            </div>

            <aside className="oauth-preview-disclosure">
              <span>i</span>
              <p><strong>This is a safe product demonstration.</strong>No real {details?.name ?? "provider"} account, password, or provider data is accessed. Live authorization will replace this preview when credentials are enabled.</p>
            </aside>

            <div className="oauth-preview-actions">
              <button type="button" className="oauth-preview-cancel" disabled={submitting} onClick={() => finish("cancel")}>Cancel</button>
              <button type="button" className="oauth-preview-approve" disabled={submitting} onClick={() => finish("approve")}>
                {submitting ? "Connecting..." : `Continue with ${details?.name ?? "provider"}`}
              </button>
            </div>
          </>
        )}
      </section>

      <p className="oauth-preview-footnote">Protected by a single-use authorization request that expires in 10 minutes.</p>
    </main>
  );
}

function MockOAuthLoading() {
  return (
    <main className="oauth-preview-shell">
      <section className="oauth-preview-card oauth-preview-invalid">
        <p className="oauth-preview-kicker">Preview the connection</p>
        <h1>Preparing secure authorization...</h1>
      </section>
    </main>
  );
}

export default function MockOAuthPage() {
  return (
    <Suspense fallback={<MockOAuthLoading />}>
      <MockOAuthContent />
    </Suspense>
  );
}
