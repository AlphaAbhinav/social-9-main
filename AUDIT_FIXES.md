# Social9 audit fixes — 19 October 2026

Source: [Social9 Website Audit](https://docs.google.com/document/d/1C01E40NM-BJP-O2gEn6IAB1l-NC4GXzQZNaupq7al8Y/edit).

The initial audit implementation was pushed as frontend `1e16513` and backend `aabfe98`. Both services are now live. The frontend's first Vercel deployment failed because its standalone Edge middleware could not resolve `next/server`; follow-up `908f427` uses the framework's `proxy.ts` convention and deployed successfully. Existing unrelated design files were preserved.

| Audit | Implementation |
| --- | --- |
| 01 | Visible 44px Menu/Close control, scrollable navigation bounded by the viewport, Escape/outside dismissal and all ten destinations. |
| 02 | Shared surface/text colors for affected cards, menus, banners and empty states; dark light-mode wordmark. |
| 03 | Validated plan/duration persists through signup/login into billing. Signup/login summary uses the public server catalog; checkout calculates its own price. Signed-in signup visits continue to billing. |
| 04 | Logo resized into 32/64/128/180px PNG variants. Header uses an 11,880-byte 128px image without priority preload; favicon and touch icon use separate files. Versioned files have immutable caching. |
| 05 | Workspace CSS imports moved into workspace components; homepage CSS moved into its route. Follow-up removed 272 unreferenced legacy selectors and 348 declarations superseded by identical selectors in the same CSS conditions. Dynamic class prefixes, state selectors and keyframes were preserved. Source CSS decreased by another 37,106 bytes. |
| 06 | Follow-up on 21 October: calendar and Discover precede pricing. Discover starts with six cards in a responsive editorial carousel, with aligned cards, a next-card preview, position indicator and working scroll controls. |
| 07 | Shared platform-name mapping, including YouTube, X, Pinterest and an explicit unknown-network fallback. |
| 08 | No attempts returns null/dash and No publishing data yet. Success excludes preview publications. |
| 09 | Composer distinguishes loading, no connection, missing destination/content and a prepared draft; provider permissions remain checked during publishing. |
| 10 | Unavailable analytics integrations show Coming soon without a connection dead end or provider fetch. |
| 11 | Calendar details scroll into view and receive heading focus. Selected ideas expose pressed state; dismissal restores trigger focus. |
| 12 | All thirty starter prompts have matching format/CTA mappings. Day 14 is a worksheet/reference guide. |
| 13 | Initial No posts yet links to composer/templates; filtered empty results offer Clear filters. |
| 14 | Brand allowance loads before entry; exhausted allowance disables entry and links to billing. Existing server limit remains enforced. |
| 15 | Workspace selector has a loading label, theme control has stable visible text, calendar retains loaded data and ignores stale month responses. |
| 16 | Mobile Sign in stays visible; public header navigation is compact. |
| 17 | Preview metrics explicitly labeled sample data; public guidance explains professional-account/Page access and provider permissions. `/product-tour` provides three real product screenshots with an interactive walkthrough, clearly labeled as a demo workspace. It makes no testimonial or customer-results claims. |
| 18 | Focus-visible skip link bypasses the header; important Discover copy is at least 14px. |
| 19 | Instagram scheduling, LinkedIn scheduling and free calendar pages, linked from the footer and sitemap with indexable metadata. |
| 20 | Per-response CSP nonce replaces script unsafe-inline. Framework scripts, theme script and structured data share the nonce; Razorpay script origin remains allowed. Nonce-bearing HTML is private/no-store. The framework proxy runs inside Vinext, avoiding a second separately bundled Vercel middleware pass. |
| 21 | Homepage actions read the same-origin session and show Open workspace for authenticated users, including after refresh. |

## Validation

- TypeScript and ESLint passed.
- Production and Vercel builds passed.
- 173 backend auth/pricing tests passed, followed by 5 targeted checks including the added catalog, content-idea and empty-analytics assertions.
- 14 frontend tests passed, including unique CSP nonce coverage and every inline script carrying the response nonce.
- Browser QA uses an isolated browser, local production pages and fixture APIs. It does not change production data or start a payment.
- Browser checks passed at 320, 375, 390, 400 and 430px in both themes: menu access, all destinations and dismissal, empty publishing health, correct platform names, plan continuity, calendar focus, empty library, brand allowance, composer state, feature pages and CSP-compatible script loading. No page errors were recorded.
- Screenshots, CSS measurements and detailed browser results are in the parent workspace output directory.
- Follow-up: the production build, TypeScript, ESLint and all 16 frontend tests passed, including the framework proxy's dependency-free entry point, request nonce forwarding and the served walkthrough screenshots. The real calendar, composer and light-mode library were inspected after CSS cleanup.
- Vercel deployment `3eWNgKFxBTkBpBt86ArpSgNiyHSd` completed successfully. Production homepage, walkthrough and feature pages returned HTTP 200 with nonce-matched inline scripts and private/no-store HTML. The sitemap includes the walkthrough. Signed-in homepage navigation and the ten-destination mobile menu were checked on production at 400px; the temporary viewport and theme were restored afterward.

## Performance measurements

Local production homepage loads 309,065 bytes of CSS across six files, compared with 332,950 bytes in the supplied audit (about 7.2% lower). Local gzip estimation totals 62,011 bytes; the local server serves these files without Content-Encoding, so this is not a measured production transfer size. Browser coverage is one mobile sample, not a complete inventory of unused CSS across themes, breakpoints and routes. No Core Web Vitals claim is made.

After the follow-up cleanup, the same homepage loads 278,588 bytes of CSS (about 16.3% below the original audit and 9.9% below the first fix). Local gzip estimation totals 56,397 bytes. The new walkthrough loads its screenshots only for the selected step; all three compressed screenshots total 202,536 bytes.

## Release and remaining checks

The backend now provides /billing/public-plans and /ready responds ready. No database migration or new secret is required. Keep the dynamic nonce policy in the framework proxy: a second static CSP without its nonce would block inline scripts. Verify response/header behavior after rollout.

Payment verification was deferred at the user's request. No charge, checkout or billing configuration change was performed in the follow-up. Real email verification and a full accessibility audit remain separate checks. A genuine customer testimonial still requires authorized source material; the actual-product walkthrough addresses the audit's alternative proof recommendation. Nonce-bearing HTML bypasses shared caching, which should be considered when measuring production performance.

## Authorized publishing verification

The user authorized one clearly labeled publishing test to `@vcuestore`. A Social9 brand image and test caption were scheduled through the production composer for 19 October 2026 at 19:23 IST. The content library confirmed the saved caption, media and timestamp after navigation, then transitioned through Publishing to Published / Instagram: Delivered. The matching account and caption were verified directly on Instagram: [published test post](https://www.instagram.com/p/DeraR1cm-n4/).

This verifies one scheduled Instagram image-post path, including upload, persistence, scheduler pickup, provider delivery and permalink lookup. Other formats and providers are not covered by this test. The labeled test remains published. Evidence: `output/vcuestore-test-scheduled.png`, `output/vcuestore-test-published.png`, and `output/audit-production-response-checks.json` in the parent workspace.

## Homepage corrections — 21 October 2026

- Restored calendar and Discover before pricing, following the user's requested page order.
- The audit CSS split had left the public calendar dependent on an unloaded workspace stylesheet for its seven-column layout. The homepage now owns that rule. Weekdays and dates align across two full weeks, with horizontal scrolling on small screens.
- Calendar headings, notes, secondary text and grid lines now use the active theme palette. Removed the tilted calendar canvas and notes for stable alignment.
- Reworked Discover as an editorial carousel: larger media and typography, equal-height cards, subtle artwork, a visible next-card preview, aligned actions, a position indicator and progress track. Six initial posts fill the rail; arrows move one card at a time and disable at the boundaries. Reduced-motion preferences are respected.
- Retained filters, saved ideas, full captions, media controls, template links and the private Your posts view. The skip link stays hidden until focused.
- Validation: production build and all 16 frontend tests passed. Browser checks passed at 320, 390, 768, 1440 and 1920px in dark and light themes, including scrolling, card alignment, page bounds, filters, saving, load-more and signed-out personal-post behavior. Evidence: `output/homepage-regression-browser-20261021.json`, `output/inspiration-*.png` and `output/calendar-fixed-*.png` in the parent workspace.
- Per user request, removed the product walkthrough links from the homepage hero and footer, along with the sample-data sentence immediately below the hero buttons. The standalone walkthrough URL remains available directly.
