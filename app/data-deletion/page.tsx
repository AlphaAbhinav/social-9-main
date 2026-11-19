"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { LegalPage } from "../components/legal-page";
import { apiRequest } from "../lib/api";

type DeletionStatus = {
  status: "completed";
  completed_at: string;
  confirmation_code: string;
};

const subscribeToLocation = () => () => undefined;
const getConfirmationCode = () => new URLSearchParams(window.location.search).get("code") ?? "";
const getServerConfirmationCode = () => "";

export default function DataDeletionPage() {
  const code = useSyncExternalStore(
    subscribeToLocation,
    getConfirmationCode,
    getServerConfirmationCode,
  );
  const [status, setStatus] = useState<DeletionStatus | null>(null);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (!code) return;
    void apiRequest<DeletionStatus>(
      `/meta/instagram/data-deletion/status?code=${encodeURIComponent(code)}`,
    ).then(setStatus).catch(() => setInvalid(true));
  }, [code]);

  return <LegalPage eyebrow="Your data" title="Data deletion" intro="Disconnect a social account, request removal of retained data or your full Social9 account, and check an Instagram deletion request completed through Meta.">
    {code ? <section className="deletion-status" aria-live="polite">
      <h2>Deletion request status</h2>
      {!status && !invalid ? <p>Checking your confirmation code...</p> : null}
      {status ? <><strong>Completed</strong><p>Social9 removed the Instagram connection data associated with this request on {new Date(status.completed_at).toLocaleString()}.</p><small>Confirmation code: {status.confirmation_code}</small></> : null}
      {invalid ? <p>We could not verify this confirmation code. Contact support if you believe the request should exist.</p> : null}
    </section> : null}
    <section><h2>Disconnect a social account</h2><p>Sign in to Social9, select the correct brand, open Accounts, choose the connection, and select Disconnect. This applies to Instagram, Facebook Pages, LinkedIn, Threads, YouTube, X (Twitter), and Pinterest. Disconnect each connection separately if the same platform is connected more than once.</p><p>Disconnection removes the selected Social9 connection record and its stored authorization tokens. It does not delete your entire workspace, drafts, uploaded media, reports, or posts already published on the platform. Cancel scheduled posts you no longer want before delivery begins, and review them again if you reconnect an account.</p></section>
    <section><h2>Remove Social9 through Instagram</h2><p>You can also remove Social9 from the connected apps area of your Instagram account. When Social9 receives and verifies an Instagram deauthorization or data-deletion callback from Meta, it removes the related Instagram connection data. A completed confirmation above applies to that connection data, rather than your full Social9 account.</p></section>
    <section><h2>Revoke access on the platform</h2><p>You can also remove Social9 through the platform&apos;s connected-app or permission settings. Menu names may change.</p><ul><li>Instagram and Threads: review authorized apps or website permissions in account settings.</li><li>Facebook: review Business integrations in Facebook settings.</li><li>LinkedIn: review permitted services in account settings.</li><li>YouTube: remove Social9 in <a href="https://security.google.com/settings/security/permissions">Google account permissions</a>.</li><li>X (Twitter): review Connected apps under Security and account access.</li><li>Pinterest: review Apps or connected-app permissions in settings.</li></ul><p>Revoking permission on a platform prevents further authorized API access but does not itself confirm that every retained Social9 record has been erased. Disconnect in Social9 too, or send the data-deletion request below if you cannot sign in.</p></section>
    <section><h2>Request platform data or full account deletion</h2><p>Email <a href="mailto:visionarycue.informatics@gmail.com?subject=Social9%20data%20deletion%20request">visionarycue.informatics@gmail.com</a> from your registered Social9 email address. Include the subject “Social9 data deletion request.” Specify whether you want all account data deleted or only data associated with a particular platform, account, or brand. Include the platform and account handle when relevant. We will verify your identity and authority, explain any additional information needed, and process the request in accordance with applicable law. Never send passwords or access tokens.</p></section>
    <section><h2>What deletion covers</h2><p>A verified full account-deletion request covers your Social9 account and associated personal workspace information, content, media, connection tokens, and retained platform data, subject to legal retention requirements and your authority over shared workspaces. We will explain any records that must be retained, such as payment, dispute, or security records. Restricted backup copies may remain until their normal replacement cycle.</p><p>Keep copies of content and reports you need before requesting deletion. A deletion request does not issue a refund or remove content already published on another platform; manage those posts directly with that platform. Team content may also be subject to the workspace owner&apos;s rights and retention obligations. Contact us about shared-workspace records so we can determine the appropriate scope.</p></section>
  </LegalPage>;
}
