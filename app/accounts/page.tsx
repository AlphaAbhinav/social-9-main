"use client";

import { useCallback, useEffect, useState } from "react";

import { ConfirmationDialog } from "../components/confirmation-dialog";
import { DashboardPageFrame } from "../components/dashboard-page-frame";
import { AccountAvatar } from "../components/account-avatar";
import { SocialIcon } from "../components/social-icon";
import { isComingSoonProvider, platformName } from "../lib/provider-availability";
import { ApiError, apiRequest } from "../lib/api";
import { clearSession, getAccessToken } from "../lib/session";

type Provider = "instagram" | "linkedin" | "facebook" | "threads" | "youtube" | "twitter" | "pinterest";

type SocialAccount = {
  id: number;
  brand_id: number;
  provider: Provider;
  environment?: "production" | "sandbox";
  account_name: string;
  profile_picture_url?: string | null;
  username: string | null;
  status: string;
};

type ConnectResponse = {
  provider: Provider;
  authorization_url: string;
};

type ProviderStatus = {
  provider: Provider;
  mode: "preview" | "live";
  configured: boolean;
};

const providers: Array<{
  id: Provider;
  label: string;
  description: string;
}> = [
  { id: "threads", label: "Threads", description: "Publish text, one image or one video to your Threads profile." },
  { id: "youtube", label: "YouTube", description: "Schedule videos with a title, audience declaration and visibility controls. Upload limit: 25 MB." },
  { id: "twitter", label: "X (Twitter)", description: "Publish and schedule text posts. Requires funded X API access; media uploads are planned." },
  { id: "pinterest", label: "Pinterest", description: "Create image Pins on your own boards with a title and destination link." },
  {
    id: "instagram",
    label: "Instagram",
    description: "Prepare publishing, scheduling and performance tracking for your business account.",
  },
  { id: "facebook", label: "Facebook Pages", description: "Connect your managed Pages to publish and schedule text, photo, video and Reel posts." },
  {
    id: "linkedin",
    label: "LinkedIn",
    description: "Prepare professional posts and manage your LinkedIn presence from Social9.",
  },
];

function providerModeLabel(status: ProviderStatus | undefined): string {
  if (!status) return "status unavailable";
  if (status.mode === "preview") return "preview";
  return status.configured ? "live" : "setup required";
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingProvider, setWorkingProvider] = useState<Provider | null>(null);
  const [workingTrialBoard, setWorkingTrialBoard] = useState(false);
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatus[]>([]);
  const [pendingDisconnect, setPendingDisconnect] = useState<SocialAccount | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleUnauthorized = useCallback(() => {
    clearSession();
    window.location.replace("/login");
  }, []);

  useEffect(() => {
    const parameters = new URLSearchParams(window.location.search);
    const connectedProvider = parameters.get("connected");
    const oauthError = parameters.get("error");
    const token = getAccessToken();
    if (!token) {
      handleUnauthorized();
      return;
    }
    void apiRequest<ProviderStatus[]>("/social-accounts/provider-status", {
      headers: { Authorization: `Bearer ${token}` },
    }).then(setProviderStatuses).catch(() => undefined);
    apiRequest<SocialAccount[]>("/social-accounts", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((loadedAccounts) => {
        setAccounts(loadedAccounts);
        if (connectedProvider) {
          setMessage(`${platformName(connectedProvider)} connected successfully.`);
        } else if (oauthError?.endsWith("_access_denied")) {
          const provider = oauthError.split("_")[0];
          setError(`${platformName(provider)} connection was cancelled.`);
        } else if (oauthError === "instagram_auth_failed") {
          setError("Instagram could not be connected. Please check the Meta app configuration and try again.");
        } else if (oauthError === "facebook_auth_failed") {
          setError("Facebook could not finish authorization. Start a new connection. If this continues, contact support to check the Facebook login configuration.");
        } else if (oauthError === "facebook_no_pages") {
          setError("Facebook did not share any Pages with Social9. Connect again using the Facebook profile that manages your Page, and edit the permissions to include the Page for this workspace. Pages approved on a previous connection may be the only ones shared until you update that selection.");
        } else if (oauthError === "facebook_no_publishing_access") {
          setError("Facebook shared Pages, but none had permission to create content. Check your Page access in Facebook, then reconnect and approve the Page you want to publish to.");
        } else if (oauthError === "facebook_permissions_missing") {
          setError("Facebook did not grant the Page permissions Social9 needs. Reconnect and approve Page access. If the permissions are unavailable, contact support to check Meta app approval.");
        } else if (oauthError === "linkedin_pages_failed") {
          setError("LinkedIn Pages could not be loaded. Check that the app has approved Community Management access, r_organization_admin and w_organization_social permissions, and that your LinkedIn profile has an approved Page role. Your personal profile connection remains available separately.");
        } else if (oauthError === "linkedin_auth_failed") {
          setError("LinkedIn could not be connected. Please check the LinkedIn app configuration and try again.");
        }
        if (oauthError?.endsWith("_auth_failed") && ["threads", "youtube", "twitter", "pinterest"].some(provider => oauthError.startsWith(provider))) {
          setError("The account could not be connected. Check developer credentials, approved permissions and API access, then try again.");
        }
        if (connectedProvider || oauthError) {
          window.history.replaceState({}, "", "/accounts");
        }
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof ApiError && requestError.status === 401) {
          handleUnauthorized();
          return;
        }
        setError(requestError instanceof Error ? requestError.message : "Unable to load accounts.");
      })
      .finally(() => setLoading(false));
  }, [handleUnauthorized]);

  async function connect(provider: Provider, sandbox = false, includePages = false) {
    if (isComingSoonProvider(provider)) return;
    const token = getAccessToken();
    if (!token) return handleUnauthorized();
    setWorkingProvider(provider);
    setError("");
    try {
      const response = await apiRequest<ConnectResponse>(
        `/social-accounts/${provider}/connect${sandbox ? "?sandbox=true" : includePages ? "?include_pages=true" : ""}`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } },
      );
      window.location.assign(response.authorization_url);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : `Unable to connect ${provider}.`);
      setWorkingProvider(null);
    }
  }

  async function createTrialBoard(accountId: number) {
    const token = getAccessToken();
    if (!token) return handleUnauthorized();
    setWorkingTrialBoard(true);
    setError("");
    try {
      await apiRequest(`/social-accounts/pinterest/${accountId}/trial-board`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      setMessage("Pinterest Sandbox demo board is ready. Select the Sandbox account and this board in Create post.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create Pinterest Sandbox board.");
    } finally {
      setWorkingTrialBoard(false);
    }
  }

  function requestDisconnect(account: SocialAccount) {
    setMessage("");
    setError("");
    setPendingDisconnect(account);
  }

  async function disconnect() {
    const account = pendingDisconnect;
    if (!account) return;
    const token = getAccessToken();
    if (!token) return handleUnauthorized();
    setWorkingProvider(account.provider);
    setError("");
    try {
      await apiRequest(`/social-accounts/${account.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setAccounts((current) => current.filter((item) => item.id !== account.id));
      setMessage(`${account.account_name} disconnected.`);
      setPendingDisconnect(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to disconnect account.");
    } finally {
      setWorkingProvider(null);
    }
  }

  const facebookStatus = providerStatuses.find((item) => item.provider === "facebook");
  const facebookIsLive = facebookStatus?.mode === "live" && facebookStatus.configured;
  const instagramStatus = providerStatuses.find((item) => item.provider === "instagram");
  const instagramIsLive = instagramStatus?.mode === "live" && instagramStatus.configured;
  const linkedinStatus = providerStatuses.find((item) => item.provider === "linkedin");
  const linkedinIsLive = linkedinStatus?.mode === "live" && linkedinStatus.configured;

  return (
    <DashboardPageFrame active="accounts" className="accounts-content dashboard-studio">
        <header className="dashboard-header">
          <div>
            <span className="eyebrow">Connected accounts</span>
            <h1>Connect your social accounts.</h1>
            <p>Connect the social profiles Social9 will use for publishing and analytics.</p>
          </div>
          <div className="provider-mode-badges" aria-label="Provider authorization modes">
            <span className={facebookIsLive ? "local-mode-badge live" : "local-mode-badge"}>Facebook {providerModeLabel(facebookStatus)}</span>
            <span className={instagramIsLive ? "local-mode-badge live" : "local-mode-badge"}>Instagram {providerModeLabel(instagramStatus)}</span>
            <span className={linkedinIsLive ? "local-mode-badge live" : "local-mode-badge"}>LinkedIn {providerModeLabel(linkedinStatus)}</span>
            {(["threads", "youtube", "twitter", "pinterest"] as const).map(provider => {
              const status = providerStatuses.find(item => item.provider === provider);
              return <span key={provider} className={status?.configured ? "local-mode-badge live" : "local-mode-badge"}>{platformName(provider)} {providerModeLabel(status)}</span>;
            })}
          </div>
        </header>

        {message ? <p className="success-message" role="status">{message}</p> : null}
        {error ? <p className="error-message accounts-error" role="alert">{error}</p> : null}

        <section className="provider-grid" aria-label="Available social networks">
          {providers.filter(provider => !isComingSoonProvider(provider.id)).map((provider) => {
            const comingSoon = isComingSoonProvider(provider.id);
            const providerAccounts = accounts.filter((item) => item.provider === provider.id);
            const account = providerAccounts[0];
            return (
              <article className="provider-card" key={provider.id}>
                <div className="provider-copy">
                  <div className="provider-heading">
                    <div className="account-network-title"><SocialIcon className="provider-icon" provider={provider.id} label={`${provider.label} logo`} /><h2>{provider.label}</h2></div>
                    <span className={account && !comingSoon ? "connection-state connected" : "connection-state"}>
                      {comingSoon ? "Coming soon" : account ? `${providerAccounts.length} connected` : "Not connected"}
                    </span>
                  </div>
                  <p>{comingSoon ? `${provider.label} connections and publishing will be available once public access is ready.` : provider.description}</p>
                  {!comingSoon ? <small>{providerModeLabel(providerStatuses.find(status => status.provider === provider.id))}</small> : null}
                  {account ? (
                    <div className="connected-profile">
                      <AccountAvatar provider={account.provider} name={account.account_name} url={account.profile_picture_url} />
                      <div><strong>{account.account_name}</strong><small>{account.status === "read_only" ? "Read-only access; publishing unavailable" : account.username ? `@${account.username}` : "Connected profile"}</small></div>
                      <button className="disconnect-account-button" type="button" disabled={workingProvider === provider.id} onClick={() => requestDisconnect(account)}>
                        <span aria-hidden="true">×</span>{workingProvider === provider.id ? "Disconnecting..." : "Disconnect"}
                      </button>
                    </div>
                  ) : (
                    <button className="connect-button" type="button" disabled={comingSoon || loading || workingProvider !== null || !providerStatuses.some(status => status.provider === provider.id && (status.configured || status.mode === "preview"))} onClick={() => void connect(provider.id)}>
                      {comingSoon ? "Coming soon" : workingProvider === provider.id ? "Connecting..." : `Connect ${provider.label}`}
                    </button>
                  )}
                  {provider.id === "linkedin" ? <><button className="connect-button" type="button" disabled={loading || workingProvider !== null} onClick={() => void connect("linkedin", false, true)}>Connect LinkedIn Pages</button><small>Page connections require approved LinkedIn Community Management access.</small></> : null}
                  {provider.id === "pinterest" && !providerAccounts.some(item => item.environment === "sandbox") ? <button className="connect-button" type="button" disabled={loading || workingProvider !== null} onClick={() => void connect("pinterest", true)}>Connect Pinterest Sandbox for Trial demo</button> : null}
                  {provider.id === "pinterest" && providerAccounts.find(item => item.environment === "sandbox") ? <button className="connect-button" type="button" disabled={workingTrialBoard} onClick={() => void createTrialBoard(providerAccounts.find(item => item.environment === "sandbox")!.id)}>{workingTrialBoard ? "Preparing demo board..." : "Create or find Sandbox demo board"}</button> : null}
                  {providerAccounts.length > 1 ? <details className="account-more-profiles"><summary>View {providerAccounts.length - 1} more {providerAccounts.length === 2 ? "account" : "accounts"}</summary>
                  {providerAccounts.slice(1).map((extraAccount) => (
                    <div className="connected-profile" key={extraAccount.id}>
                      <AccountAvatar provider={extraAccount.provider} name={extraAccount.account_name} url={extraAccount.profile_picture_url} />
                      <div><strong>{extraAccount.account_name}</strong><small>{extraAccount.status === "read_only" ? "Read-only access; publishing unavailable" : extraAccount.username ? `@${extraAccount.username}` : "Connected profile"}</small></div>
                      <button className="disconnect-account-button" type="button" disabled={workingProvider === provider.id} onClick={() => requestDisconnect(extraAccount)}>
                        <span aria-hidden="true">×</span>{workingProvider === provider.id ? "Disconnecting..." : "Disconnect"}
                      </button>
                    </div>
                  ))}
                  </details> : null}
                  {account && !comingSoon ? <button className="connect-button connect-another-button" type="button" disabled={comingSoon || loading || workingProvider !== null || !providerStatuses.some(status => status.provider === provider.id && (status.configured || status.mode === "preview"))} onClick={() => void connect(provider.id)}>
                    {workingProvider === provider.id ? "Connecting..." : `Connect another ${provider.label}`}
                  </button> : null}
                </div>
              </article>
            );
          })}
        </section>

        <section className="accounts-upcoming" aria-labelledby="upcoming-networks-title">
          <div className="accounts-upcoming-heading"><h2 id="upcoming-networks-title">More networks</h2><span className="connection-state">Coming soon</span></div>
          <div className="accounts-upcoming-list">
            {providers.filter(provider => isComingSoonProvider(provider.id)).map(provider => (
              <div className="accounts-upcoming-network" key={provider.id}>
                <SocialIcon provider={provider.id} label={`${provider.label} logo`} /><span>{provider.label}</span>
              </div>
            ))}
          </div>
          <p>Connections and publishing will be available once public access is ready.</p>
        </section>

        <details className="oauth-note studio-disclosure">
          <summary>Connection requirements & publishing guidance <span aria-hidden="true">+</span></summary>
          <p>Live connections use the official authorization screen for each network. Preview connections simulate publishing and do not post to your social profiles. A live provider badge confirms configuration; a successful test post confirms delivery.</p>
          <p>Threads supports text, one image or one video per post. YouTube supports one MP4 or MOV video up to 25 MB, with a title, visibility and audience declaration. X supports text posts up to 280 characters; its weighted character limit also applies. Pinterest supports one JPG or PNG image Pin on an owned public board, with an optional destination link. Connect an account for each network, then choose it in the composer.</p>
          <p>Instagram requires JPG images and supports up to 10 images per post. LinkedIn supports text and image posts on a personal profile. Facebook Pages supports text, photos, MP4/MOV videos and Reels up to 25 MB. Facebook Stories are not supported yet. After Facebook authorization, choose which Pages to connect to this workspace. Pages connected to other workspaces stay there. Choose a connected Page in the composer before publishing. Reconnect an account if its authorization expires or is revoked.</p>
        </details>

        {pendingDisconnect ? <ConfirmationDialog
          busy={workingProvider !== null}
          confirmLabel="Yes, disconnect"
          description="Social9 will remove its saved authorization for this account. Existing posts will remain, but new posts cannot be published until you connect it again."
          eyebrow="Disconnect account"
          onCancel={() => setPendingDisconnect(null)}
          onConfirm={() => void disconnect()}
          title={`Disconnect ${pendingDisconnect.account_name}?`}
        /> : null}
    </DashboardPageFrame>
  );
}
