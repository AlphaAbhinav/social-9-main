"use client";

import { useEffect, useState } from "react";
import { readPlanIntent, type PlanIntent } from "../lib/plan-intent";
import Link from "../components/link";
import { DashboardPageFrame } from "../components/dashboard-page-frame";
import { useBilling } from "../features/billing/use-billing";
import { CouponCheckout } from "../features/billing/coupon-checkout";
import "./billing.css";
import { track } from "../lib/track";

function BillingIcon({ name }: { name: "check" | "arrow" | "shield" | "starter" | "advanced" | "agency" }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === "check" ? <path d="m5 12 4 4L19 6" /> : name === "arrow" ? <path d="M5 12h14M13 6l6 6-6 6" /> : name === "shield" ? <><path d="m12 3 8 3v6c0 4-8 9-8 9s-8-5-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></> : name === "starter" ? <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /><path d="M16.5 4v7M13 7.5h7M4 16.5h7" /></> : name === "advanced" ? <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" /> : <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12c5 3 13 3 18 0M12 12v4" /></>}
  </svg>;
}

const planCopy: Record<string, { description: string; featureIntro: string }> = {
  starter: { description: "A home for your growing brand portfolio.", featureIntro: "Your everyday essentials, plus" },
  advanced: { description: "More insight. More room to grow.", featureIntro: "Everything in Starter, plus" },
  agency: { description: "A shared workspace for your whole team.", featureIntro: "Everything in Advanced, plus" },
};

const canonicalPlanCode = (code: string) => code.replace(/_v\d+$/, "");

export default function BillingPage() {
  const [intent, setIntent] = useState<PlanIntent | null>(null);
  const [duration, setDuration] = useState("monthly");
  useEffect(() => { const timer = window.setTimeout(() => { const selected = readPlanIntent(); setIntent(selected); if (selected) setDuration(selected.duration); }, 0); return () => window.clearTimeout(timer); }, []);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const { subscription, brandCount, razorpayConfig, loading, working, checkoutOpen, error, message, updateMockSubscription, startRazorpayCheckout } = useBilling();
  const allPlans = razorpayConfig?.plans ?? [];
  const plans = allPlans.filter((plan) => plan.duration === duration).sort((a, b) => a.daily_price_inr - b.daily_price_inr);
  const complimentary = subscription?.complimentary_access && subscription?.provider === "reviewer";
  const legacyTerms: Record<string, string> = { monthly: "agency_monthly", annual: "advanced_annual", three_year: "starter_three_year" };
  const activeCode = subscription?.billing_term ? canonicalPlanCode(legacyTerms[subscription.billing_term] ?? subscription.billing_term) : null;
  const activePlan = allPlans.find((plan) => canonicalPlanCode(plan.code) === activeCode && plan.tier === subscription?.plan);
  const expiry = subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null;

  return <DashboardPageFrame active="billing" className="billing-content dashboard-studio billing-studio">
    {checkoutPlan && !subscription?.is_paid && allPlans.find(plan => plan.code === checkoutPlan) && <CouponCheckout key={checkoutPlan} plan={allPlans.find(plan => plan.code === checkoutPlan)!} busy={working} checkoutOpen={checkoutOpen} error={error} close={() => setCheckoutPlan(null)} pay={startRazorpayCheckout} />}
    <div className="billing-wrap">
      <header className="dashboard-header billing-heading">
        <div><span className="billing-eyebrow">PLANS & BILLING</span><h1>Make room for more.</h1><p>The right tools for your next stage. One payment, no auto-renewal.</p></div>
        <span className="billing-payment-label"><BillingIcon name="shield" /> Secure checkout by Razorpay</span>
      </header>
      {intent && <aside className="plan-intent-summary" role="status"><strong>Your selected plan: {intent.tier} / {({ monthly: "1 month", annual: "1 year", three_year: "3 years" } as Record<string, string>)[intent.duration]}</strong><p>Review the current price below and choose your plan to continue to checkout.</p><button type="button" onClick={() => { localStorage.removeItem("social9-plan-intent"); window.history.replaceState(null, "", "/billing"); setIntent(null); }}>Clear selection</button></aside>}
      {message && <p className="billing-feedback billing-feedback-success" role="status">{message}</p>}
      {error && <p className="billing-feedback billing-feedback-error" role="alert">{error}</p>}
      {loading ? <div className="billing-loading" role="status"><span />Loading your plans…</div> : !subscription || !razorpayConfig ? <div className="billing-loading">Your plan details could not be loaded. Refresh the page to try again.</div> : <>
        <section className={`billing-access ${subscription?.is_paid ? "is-active" : ""}`} aria-label="Your current access">
          <span className="billing-access-icon"><BillingIcon name={subscription?.is_paid ? "check" : "starter"} /></span>
          <div><span className="billing-small-label">YOUR CURRENT ACCESS</span><strong>{complimentary ? "Complimentary Premium" : subscription?.is_paid ? `${activePlan?.name ?? "Premium"}${subscription?.mock_mode ? " preview" : ""}` : "Free workspace"}</strong></div>
          <p>{complimentary ? "All Premium features are yours. No payment needed." : subscription?.is_paid ? expiry ? `Active until ${expiry}` : "Your paid features are unlocked." : "One brand, publishing, insights and a free 30-day content plan."}</p>
          <span className="billing-access-badge"><i />{subscription?.is_paid ? "Active" : "Included"}</span>
        </section>
        <section className="billing-plan-limits" aria-label="Your plan limits">
          <div><span className="billing-small-label">BRAND ALLOWANCE</span><strong>{brandCount} / {subscription.features.brand_limit ?? "Unlimited"} brands</strong><p>{subscription.features.brand_limit !== null && brandCount >= subscription.features.brand_limit ? "Your brand allowance is full. Choose a larger plan to add another brand." : "Each brand keeps its own connected accounts, content and templates."}</p></div>
          <ul><li>{subscription.features.competitor_limit} competitor profile{subscription.features.competitor_limit === 1 ? "" : "s"} per brand</li><li>{subscription.features.ai_assistant ? "AI caption and content assistance included" : "AI content assistance requires Starter or above"}</li><li>{subscription.features.growth_projection ? "Growth projections included" : "Growth projections require Advanced or Agency"}</li><li>{subscription.features.publishing_reports ? "Publishing reports and CSV exports included" : "Publishing reports require Advanced or Agency"}</li><li>{subscription.features.team_workspace ? `Up to ${subscription.features.team_member_limit} team members per brand, with draft approvals` : "Team members and draft approvals require Agency"}</li></ul>
        </section>
        <div className="billing-section-heading"><div><h2>Find your fit</h2><p>Same features. A better daily rate when you stay longer.</p></div><div className="billing-duration-picker" role="group" aria-label="Access duration">{[["monthly", "1 month"], ["annual", "1 year"], ["three_year", "3 years"]].map(([value, label]) => { const saving = allPlans.find((plan) => plan.duration === value)?.savings_percent ?? 0; return <button type="button" key={value} aria-label={label} aria-pressed={duration === value} disabled={working} onClick={() => { setDuration(value); track("pricing_duration_select", { duration: value, location: "/billing" }); }}>{label}{saving > 0 && <small>Save {saving}%</small>}</button>; })}</div></div>
        <section className="billing-options" aria-label="Compare paid plans">
          {plans.map((plan) => {
            const tier = plan.tier as "starter" | "advanced" | "agency";
            const copy = planCopy[tier] ?? planCopy.starter;
            const current = subscription?.is_paid && activeCode === canonicalPlanCode(plan.code) && subscription.plan === plan.tier;
            const features = [
              `Manage up to ${plan.brand_limit} brands`,
              "Publishing, scheduling & provider insights",
              "Templates matched to each brand and connected channel",
              ...(plan.features.ai_assistant ? ["AI captions & extended content planning"] : []),
              `${plan.features.competitor_limit} competitor profiles per brand`,
              ...(plan.features.growth_projection ? ["Growth projections & forecasts"] : []),
              ...(plan.features.publishing_reports ? ["Publishing reports with CSV exports"] : []),
              ...(plan.features.team_workspace ? [`Up to ${plan.features.team_member_limit} team members per brand`, "Versioned drafts & content approvals"] : []),
            ];
            return <article className={`billing-option ${tier === "advanced" ? "is-featured" : ""} ${intent?.tier === plan.tier && intent?.duration === plan.duration ? "is-selected" : ""}`} key={plan.code} aria-label={`${plan.name} plan`}>
              <div className="billing-card-top"><span className="billing-tier-icon"><BillingIcon name={tier in planCopy ? tier : "starter"} /></span><span className="billing-card-tag">{tier === "advanced" ? "Most popular" : tier === "agency" ? "Built for teams" : "Lowest daily rate"}</span></div>
              <h3>{plan.name}</h3><p className="billing-description">{copy.description}</p>
              <div className="billing-amount">₹{plan.total_price_inr.toLocaleString("en-IN")}<span> / {plan.commitment}</span></div>
              <p className="billing-equivalent">Just ₹{plan.daily_price_inr} / day equivalent · paid upfront</p>
              {plan.savings_percent > 0 && <p className="billing-savings">Save ₹{plan.savings_inr.toLocaleString("en-IN")} vs the monthly plan’s daily rate</p>}
              <div className="billing-plan-action">
                {subscription?.is_paid ? complimentary ? <button type="button" disabled><BillingIcon name="check" />Included in your access</button>
                  : current && subscription.provider === "mock" ? <button type="button" disabled={working} onClick={() => void updateMockSubscription("cancel")}>{working ? "Updating…" : "Cancel current preview"}</button>
                  : <button type="button" disabled>{current ? "Your current plan" : "Available after your plan expires"}{current && <BillingIcon name="check" />}</button>
                  : subscription?.mock_mode ? <button type="button" disabled={working} onClick={() => void updateMockSubscription("subscribe", plan.code)}>{working ? "Enabling…" : `Preview ${plan.name}`}<BillingIcon name="arrow" /></button>
                  : razorpayConfig?.enabled ? <button type="button" disabled={working} onClick={() => { if (!razorpayConfig.test_mode) track("begin_checkout", { plan: plan.code, duration: plan.duration, value: plan.total_price_inr, item: { id: plan.code, name: plan.name, price: plan.total_price_inr } }); setCheckoutPlan(plan.code); }}>{working ? "Opening checkout…" : `Choose ${plan.name}${razorpayConfig.test_mode ? " · Test" : ""}`}<BillingIcon name="arrow" /></button>
                  : <a href="mailto:visionarycue.informatics@gmail.com?subject=Social9%20Premium%20access">Request access<BillingIcon name="arrow" /></a>}
              </div>
              <div className="billing-features"><p>{copy.featureIntro}</p><ul>{features.map((feature) => <li key={feature}><BillingIcon name="check" /><span>{feature}</span></li>)}</ul></div>
              <div className="billing-duration">{plan.days.toLocaleString("en-IN")} days of access<span>No automatic renewal</span></div>
            </article>;
          })}
        </section>
        <section className="billing-free"><span className="billing-free-label">FREE, ALWAYS AVAILABLE</span><div><h3>Not ready to upgrade?</h3><p>Keep creating with one brand, basic publishing, available insights and a 30-day content plan.</p></div><span>₹0<span> / no commitment</span></span></section>
        <section className="billing-details" aria-label="Payment details">
          <div><BillingIcon name="shield" /><p><strong>A single payment. A clear expiry.</strong> Pay once for the full access period. No recurring mandate, installments or automatic charges.</p></div>
          <nav aria-label="Billing policies"><Link href="/refunds">Refund policy ↗</Link><Link href="/terms">Terms of service ↗</Link></nav>
        </section>
        <details className="billing-fine-print"><summary>A few things to know</summary><p>Paid access starts after captured payment is confirmed and ends at the displayed expiry. Refund requests are reviewed individually. Existing Premium purchases retain their access until expiry. Competitor API refresh supports YouTube and X; other networks use manual benchmarks. Provider insights depend on permissions and available data. Forecasts are estimates, not guaranteed results.</p></details>
      </>}
    </div>
  </DashboardPageFrame>;
}
