import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";

const testPort = 33119;
let serverProcess;

test.before(async () => {
  serverProcess = spawn(process.execPath, ["./.output/server/index.mjs"], {
    cwd: new URL("..", import.meta.url),
    env: { ...process.env, PORT: String(testPort), HOST: "127.0.0.1" },
    stdio: "ignore",
  });
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${testPort}/`);
      if (response.ok) return;
    } catch {
      // The preview may still be starting; retry until the deadline below.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("The production preview did not start in time.");
});

test.after(() => {
  serverProcess?.kill();
});

async function render(path = "/") {
  return fetch(`http://127.0.0.1:${testPort}${path}`, {
    headers: { accept: "text/html" },
  });
}

test("compiled browser client calls the configured backend for authentication and dashboard routes", async (t) => {
  const expectedApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "");
  assert.ok(expectedApiUrl, "The API URL must be configured at build and test time");
  const html = await (await render("/signup")).text();
  const apiAsset = html.match(/href="([^"<>]*\/api-[^"<>]+\.js)"/)?.[1];
  assert.ok(apiAsset, "The signup page must load the compiled API client");
  const bundle = await (await fetch(new URL(apiAsset, `http://127.0.0.1:${testPort}`))).text();
  assert.doesNotMatch(bundle, /\/service/);
  const browserApi = await import(new URL(`../.output/public${apiAsset}`, import.meta.url));
  assert.ok(Object.values(browserApi).includes(expectedApiUrl));
  const apiRequest = Object.values(browserApi).find(value =>
    typeof value === "function" && value.constructor.name === "AsyncFunction",
  );
  assert.equal(typeof apiRequest, "function");

  const previousWindow = globalThis.window;
  globalThis.window = {
    location: { hostname: "www.social9.io" },
    localStorage: { getItem: () => null },
    sessionStorage: { length: 0 },
    dispatchEvent() {},
  };
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    calls.push({ url, init });
    return Response.json({ ok: true });
  });
  try {
    const readPaths = ["/auth/me", "/health", "/posts?limit=6", "/analytics/summary?days=30", "/billing/subscription", "/social-accounts"];
    for (const hostname of ["social9.io", "www.social9.io"]) {
      window.location.hostname = hostname;
      for (const path of ["/auth/signup", "/auth/login", "/auth/verify-email", "/auth/verification/request", "/auth/password/forgot", "/auth/password/reset", ...readPaths]) {
        const method = readPaths.includes(path) ? "GET" : "POST";
        const body = method === "POST" ? "{}" : undefined;
        await apiRequest(path, { method, body, credentials: "include", headers: { Authorization: "Bearer test-token" } });
        const call = calls.at(-1);
        assert.equal(call.url, `${expectedApiUrl}${path}`);
        assert.equal(call.init.method, method);
        assert.equal(call.init.body, body);
        assert.equal(call.init.credentials, "include");
        assert.equal(call.init.headers.get("Authorization"), "Bearer test-token");
      }
    }
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("renders the post composer before any Pinterest account or boards are loaded", async () => {
  const response = await render("/create-post");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Create your next post/);
  assert.match(html, /<textarea[^>]*id="post-caption"/);
  const platforms = html.match(/<fieldset class="platform-fieldset">([\s\S]*?)<\/fieldset>/)?.[1];
  assert.ok(platforms, "Platform choices should render");
  assert.doesNotMatch(platforms, /<input[^>]*\bchecked(?:=|\s|\/?>)/, "A new post should have no preselected platform");
  assert.doesNotMatch(html, /This page couldn|Cannot read properties of null/);
});

test("uses a unique CSP nonce for inline scripts on each document response", async () => {
  const first = await render();
  const second = await render();
  const policy = first.headers.get("content-security-policy") ?? "";
  const nonce = policy.match(/'nonce-([^']+)'/)?.[1];
  assert.ok(nonce, "A request-specific nonce is required");
  assert.doesNotMatch(policy.split(";").find(directive => directive.trim().startsWith("script-src")), /unsafe-inline/);
  assert.match(policy, /https:\/\/checkout\.razorpay\.com/);
  assert.notEqual(second.headers.get("content-security-policy"), policy);
  assert.match(first.headers.get("cache-control") ?? "", /no-store/);
  const html = await first.text();
  const inlineScripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
    .filter(([, attributes, content]) => !/\bsrc=/.test(attributes) && content.trim());
  assert.ok(inlineScripts.length > 0);
  for (const [, attributes] of inlineScripts) assert.ok(attributes.includes(`nonce="${nonce}"`));
});

test("keeps the admin interface hidden until access is verified", async () => {
  const response = await render("/admin");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Verifying access/);
  assert.doesNotMatch(html, /Platform overview|Admin navigation|Publishing pipeline|Total users/);
  assert.match(html, /name="robots" content="noindex, nofollow"/);
  assert.doesNotMatch(html, /hashed_password|access_token_encrypted|provider_customer_id/);
});

test("provides a separate unindexed admin sign-in page", async () => {
  const response = await render("/admin/login");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Admin sign in/);
  assert.match(html, /id="admin-email"/);
  assert.match(html, /id="admin-password"/);
  assert.match(html, /id="admin-totp"/);
  assert.match(html, /name="robots" content="noindex, nofollow"/);
  assert.doesNotMatch(html, /Admin navigation|Platform overview/);
});

test("keeps operations controls hidden until administrator access is checked", async () => {
  const response = await render("/admin/operations");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Verifying access/);
  assert.match(html, /name="robots" content="noindex, nofollow"/);
  assert.doesNotMatch(html, /Suspend account|Refund requests|payment_reference|Refund amount/);
});

test("keeps coupon controls private and unindexed until admin access is checked", async () => {
  const response = await render("/admin/coupons");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /name="robots" content="noindex, nofollow"/);
  assert.doesNotMatch(html, /Create coupon|Campaign name|payment_reference|customer@example.com/);
});

test("server-renders the public Social9 homepage", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Social9 \| Instagram, Facebook &amp; LinkedIn Scheduling Tool<\/title>/i);
  assert.match(html, /rel="icon"[^>]+social9-mark-v2-32\.png/i);
  assert.match(html, /Skip to content/);
  assert.doesNotMatch(html, /Explore the product walkthrough|Example workspace - all figures below are sample data/);
  assert.match(html, /signup\?plan=advanced(?:&amp;|&)duration=monthly/);
  assert.ok(html.indexOf('id="calendar-preview"') < html.indexOf('id="discover"'));
  assert.ok(html.indexOf('id="discover"') < html.indexOf('id="plans"'));
  assert.match(html, /Schedule[\s\S]*Publish[\s\S]*Repeat/);
  assert.match(html, /Switch to light theme/);
  assert.match(html, /Social media management tools/);
  assert.match(html, /About Social9/);
  assert.match(html, /VisionaryCue Informatics/);
  assert.match(html, /Privacy policy/);
  assert.match(html, /id="discover"/);
  assert.match(html, /Good posts/);
  assert.match(html, /Your posts/);
  assert.match(html, /feed\/coffee\.jpg/);
  assert.match(html, /<video[^>]*src="\/feed\/flower\.mp4"[^>]*controls/);
  assert.match(html, /One idea\. Seventeen tabs\./);
  assert.match(html, /rel="canonical" href="https:\/\/www\.social9\.io"/);
  const schema = JSON.parse(html.match(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/s)[1]);
  assert.equal(schema["@graph"][2]["@type"], "SoftwareApplication");
  assert.ok(schema["@graph"][2].featureList.includes("Facebook Pages scheduling"));
  assert.match(html, /Publish to your Facebook community/);
  assert.match(html, /Manage three social platforms/);
  assert.match(html, /home-plan-card is-featured/);
  assert.match(html, /Manage up to 2 brands/);
  assert.match(html, /Room for 10 brands/);
  assert.match(html, /Scale to 25 brands/);
  assert.match(html, /aria-label="Plan duration"/);
  const dashboard = await (await render("/dashboard-preview")).text();
  assert.match(dashboard, /Facebook Pages/);
  assert.match(dashboard, /social-brand-icon-facebook/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|react-loading-skeleton/);
});

test("provides a public walkthrough with real, explicitly labeled demo screens", async () => {
  const response = await render("/product-tour");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /captured from the real Social9 interface/);
  assert.match(html, /not customer results/);
  assert.match(html, /name="robots" content="index, follow"/);
  assert.match(html, /product-tour\/calendar\.webp/);
  for (const screen of ["calendar", "composer", "library"]) {
    const asset = await render(`/product-tour/${screen}.webp`);
    assert.equal(asset.status, 200);
    assert.match(asset.headers.get("content-type"), /image\/webp/);
    assert.ok((await asset.arrayBuffer()).byteLength > 1000);
  }
});

test("server-renders every authentication and dashboard route", async () => {
  const expected = new Map([
    ["/login", /Sign in to Social9/],
    ["/signup", /Create your account/],
    ["/verify-email", /Verify your email/],
    ["/forgot-password", /Reset your password/],
    ["/reset-password", /Choose a new password/],
    ["/dashboard", /Opening your Social9 workspace/],
    ["/dashboard-preview", /Sample data only/],
    ["/accounts", /Connect your social accounts/],
    ["/oauth/mock?provider=instagram&state=preview-state", /Preview the connection/],
    ["/create-post", /Create your next post/],
    ["/templates", /Your brand\. Your next conversation\./],
    ["/content", /Manage your saved posts/],
    ["/calendar", /Plan and schedule your social posts/],
    ["/actions", /Resolve publishing issues/],
    ["/analytics", /Review your social media analytics/],
    ["/billing", /Make room for more/],
    ["/agency", /Agency workspace/],
    ["/privacy", /Privacy policy/],
    ["/data-deletion", /Data deletion/],
    ["/terms", /Terms of service/],
  ]);

  for (const [path, content] of expected) {
    const response = await render(path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.match(html, content, path);
    assert.match(html, /<title>.+ \| Social9<\/title>/, path);
    if (!["/privacy", "/data-deletion", "/terms"].includes(path)) {
      assert.match(html, /name="robots" content="noindex, follow"/, path);
    }
  }
});

test("serves crawlable SEO discovery files", async () => {
  const robots = await render("/robots.txt");
  assert.equal(robots.status, 200);
  assert.match(await robots.text(), /Sitemap: https:\/\/www\.social9\.io\/sitemap\.xml/);
  const sitemap = await render("/sitemap.xml");
  assert.equal(sitemap.status, 200);
  const xml = await sitemap.text();
  assert.match(xml, /<loc>https:\/\/www\.social9\.io\/<\/loc>/);
  assert.doesNotMatch(xml, /\/dashboard|\/reset-password|\/oauth/);
});

test("renders the branded Social9 not-found page", async () => {
  const response = await render("/this-route-does-not-exist");
  assert.equal(response.status, 404);
  const html = await response.text();
  assert.match(html, /Page not found/);
  assert.match(html, /This page could not be found/);
  assert.match(html, /Return home/);
  assert.match(html, /Open dashboard/);
});

test("keeps the login connected to the FastAPI contract", async () => {
  const [page, login, signup, forgotPassword, resetPassword, dashboard, accounts, composer, content, actions, calendar, analytics, billing, pageFrame, sidebar, confirmation, greeting, layout, api, session, packageJson, vercelConfig] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/login/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/signup/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/forgot-password/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/reset-password/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/accounts/page.tsx", import.meta.url), "utf8"),
    Promise.all([
      readFile(new URL("../app/create-post/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/features/create-post/use-composer.ts", import.meta.url), "utf8"),
    ]).then((sources) => sources.join("\n")),
    readFile(new URL("../app/content/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/actions/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/calendar/page.tsx", import.meta.url), "utf8"),
    Promise.all([
      readFile(new URL("../app/analytics/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/features/analytics/use-analytics.ts", import.meta.url), "utf8"),
    ]).then((sources) => sources.join("\n")),
    Promise.all([
      readFile(new URL("../app/billing/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/features/billing/use-billing.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/features/billing/checkout.ts", import.meta.url), "utf8"),
    ]).then((sources) => sources.join("\n")),
    readFile(new URL("../app/components/dashboard-page-frame.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/dashboard-sidebar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/confirmation-dialog.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/personalized-greeting.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/api.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/session.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../vercel.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /href="\/login"/);
  assert.match(page, /PersonalizedGreeting/);
  assert.match(greeting, /getSessionUser/);
  assert.match(greeting, /Good morning/);
  assert.match(login, /\/auth\/login/);
  assert.match(api, /NEXT_PUBLIC_API_URL/);
  assert.match(composer, /getContentTemplate/);
  assert.doesNotMatch(api, /isSocial9Browser|\/service/);
  assert.equal(JSON.parse(vercelConfig).rewrites, undefined);
  assert.match(session, /social9_access_token/);
  assert.match(signup, /\/auth\/signup/);
  assert.match(forgotPassword, /\/auth\/password\/forgot/);
  assert.match(forgotPassword, /\/reset-password\?token=/);
  assert.match(forgotPassword, /reset_code/);
  assert.match(forgotPassword, /social9-reset-code/);
  assert.match(resetPassword, /\/auth\/password\/reset/);
  assert.match(resetPassword, /one-time-code/);
  assert.match(resetPassword, /social9-reset-code/);
  assert.match(dashboard, /\/auth\/me/);
  assert.match(dashboard, /clearSession/);
  assert.match(dashboard, /location\.replace\("\/login"\)/);
  assert.match(accounts, /\/social-accounts\/\$\{provider\}\/connect/);
  assert.match(accounts, /method: "DELETE"/);
  assert.match(accounts, /Authorization/);
  assert.match(accounts, /Yes, disconnect/);
  assert.doesNotMatch(accounts, /window\.confirm/);
  assert.match(sidebar, /aria-expanded/);
  assert.match(sidebar, /dashboard-navigation/);
  assert.match(confirmation, /aria-modal="true"/);
  assert.doesNotMatch(calendar, /window\.confirm/);
  assert.match(calendar, /ConfirmationDialog/);
  assert.match(composer, /ConfirmationDialog/);
  assert.match(api, /75_000/);
  assert.match(api, /response\.status === 204/);
  assert.match(composer, /apiRequest<SavedPost>\("\/posts"/);
  assert.match(composer, /scheduled_for/);
  assert.match(composer, /method: "DELETE"/);
  assert.match(calendar, /date_from/);
  assert.match(calendar, /\/schedule/);
  assert.match(calendar, /\/draft/);
  assert.match(calendar, /\/content-plan/);
  assert.match(calendar, /content-plan-idea/);
  assert.match(calendar, /Unlock planning beyond 30 days/);
  assert.match(analytics, /\/analytics\/summary\?days=/);
  assert.match(analytics, /\/analytics\/engagement-forecast/);
  assert.match(analytics, /Social9 forecasting AI/);
  assert.match(analytics, /provider_metrics_reason/);
  assert.match(analytics, /provider_metrics/);
  assert.match(analytics, /Performance over time/);
  assert.match(analytics, /Follower growth/);
  assert.match(analytics, /exportInstagramCsv/);
  assert.match(analytics, /instagram\.content/);
  assert.match(analytics, /contentType/);
  assert.match(composer, /\/publish/);
  assert.match(composer, /\/billing\/subscription/);
  assert.match(composer, /Premium AI/);
  assert.match(composer, /See Premium benefits/);
  assert.match(content, /\/duplicate/);
  assert.match(content, /method: "PATCH"/);
  assert.match(content, /search/);
  assert.match(actions, /\/workspace\/actions/);
  for (const workspacePage of [accounts, composer, content, actions, calendar, analytics, billing]) {
    assert.match(workspacePage, /DashboardPageFrame/);
  }
  assert.match(pageFrame, /gsap\.context/);
  assert.match(pageFrame, /MutationObserver/);
  assert.match(pageFrame, /prefers-reduced-motion/);
  assert.match(sidebar, /Content library/);
  assert.match(sidebar, /Action center/);
  assert.match(packageJson, /"gsap"/);
  assert.match(dashboard, /\/analytics\/summary\?days=30/);
  assert.match(dashboard, /Publishing consistency/);
  assert.match(dashboard, /Smart recycling/);
  assert.match(dashboard, /\/posts\/\$\{postId\}\/duplicate/);
  assert.match(content, /library-card-media/);
  assert.match(layout, /\/og\.png/);
  assert.match(page, /Get my free 30-day plan/);
  assert.match(page, /HomePricing/);
  assert.doesNotMatch(page, /potential reach lift|potential engagement lift/);
  assert.match(billing, /AI captions & extended content planning/);
  assert.match(billing, /Growth projections & forecasts/);
  assert.match(billing, /billing\/razorpay\/checkout/);
  assert.match(billing, /billing\/razorpay\/verify/);
  assert.match(billing, /checkout\.razorpay\.com/);
  assert.match(billing, /subscription\?\.complimentary_access/);
  assert.match(billing, /requestError instanceof ApiError && requestError\.status === 401/);
  assert.match(billing, /Razorpay rejected the configured/);
  assert.match(billing, /activeCode === canonicalPlanCode\(plan\.code\)/);
  assert.match(billing, /Available after your plan expires/);
  assert.match(billing, /not guaranteed results/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});


test("loads compact accounts styles through the rendered page stylesheet", async () => {
  const response = await render("/accounts");
  assert.equal(response.status, 200);
  const html = await response.text();
  const links = [...html.matchAll(/<link\b[^>]*>/g)]
    .map(match => match[0])
    .filter(tag => /rel="stylesheet"/.test(tag))
    .map(tag => tag.match(/href="([^"]+)"/)?.[1])
    .filter(Boolean);
  assert.ok(links.length, "Accounts should load a stylesheet");
  const css = (await Promise.all(links.map(async href => {
    const asset = await fetch(new URL(href, `http://127.0.0.1:${testPort}`));
    assert.equal(asset.status, 200);
    return asset.text();
  }))).join("\n");
  assert.match(css, /\.accounts-upcoming-list\s*\{[^}]*display:\s*flex/);
  assert.match(css, /\.accounts-content\s+\.provider-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,/);
});
