"use client";

import { useState } from "react";
import Link from "./link";
import { track } from "../lib/track";
import "./home-pricing.css";

const durations = [
  { label: "1 month", days: 30, rate: 3, saving: 0, commitment: "30 days" },
  { label: "1 year", days: 365, rate: 2, saving: 33, commitment: "1 year" },
  { label: "3 years", days: 1095, rate: 1, saving: 66, commitment: "3 years" },
];
const tiers = [
  { name: "Starter", daily: 27, tag: "Start growing", description: "A home for your growing brand portfolio.", intro: "Your everyday essentials, plus", features: ["Manage up to 2 brands", "AI captions & extended content planning", "Publishing, scheduling & provider insights", "5 competitor profiles per brand"] },
  { name: "Advanced", daily: 54, tag: "Most popular", description: "More insight. More room to grow.", intro: "Everything in Starter, plus", features: ["Room for 10 brands", "Growth projections & forecasts", "Publishing reports with CSV exports", "25 competitor profiles per brand"] },
  { name: "Agency", daily: 81, tag: "Built for teams", description: "A shared workspace for your whole team.", intro: "Everything in Advanced, plus", features: ["Scale to 25 brands", "Team workspace & member roles", "Versioned drafts & content approvals", "100 competitor profiles per brand"] },
];
const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;

function PlanIcon({ kind }: { kind: number }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind === 0 ? <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><path d="M17.5 3v7M14 6.5h7M3 17.5h7" /></> : kind === 1 ? <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" /> : <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12c5 3 13 3 18 0M12 12v4" /></>}</svg>;
}

export function HomePricing() {
  const [selected, setSelected] = useState(0);
  const duration = durations[selected];
  return <section className="neon-plans home-pricing" id="plans" aria-labelledby="home-pricing-heading"><div className="neon-plans-inner">
    <div className="neon-section-label"><i /> PLANS & PRICING</div>
    <div className="home-pricing-heading"><div><h2 id="home-pricing-heading">Make room <em>for more.</em></h2><p>The right tools for your next stage. One payment, no auto-renewal.</p></div><span className="home-payment-note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m12 3 8 3v6c0 4-8 9-8 9s-8-5-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></svg>Secure checkout by Razorpay</span></div>
    <div className="home-pricing-toolbar"><div><h3>Find your fit</h3><p>Same features. A better daily rate when you stay longer.</p></div><div className="home-duration-picker" role="group" aria-label="Plan duration">{durations.map((item, index) => <button type="button" aria-label={item.label} aria-pressed={selected === index} onClick={() => { setSelected(index); track("pricing_duration_select", { duration: ["monthly", "annual", "three_year"][index] }); }} key={item.label}>{item.label}{item.saving > 0 && <small>Save {item.saving}%</small>}</button>)}</div></div>
    <div className="home-plan-grid">{tiers.map((tier, index) => {
      const daily = tier.daily * duration.rate / 3;
      const total = daily * duration.days;
      return <article className={`home-plan-card ${index === 1 ? "is-featured" : ""}`} key={tier.name} aria-label={`${tier.name} plan`}>
        <div className="home-plan-top"><span className="home-plan-icon"><PlanIcon kind={index} /></span><span className="home-plan-tag">{tier.tag}</span></div>
        <h3>{tier.name}</h3><p className="home-plan-description">{tier.description}</p>
        <div className="home-plan-price"><strong>{money(total)}</strong><span> / {duration.commitment}</span></div>
        <p className="home-plan-equivalent">Just {money(daily)} / day equivalent · paid upfront</p>
        <p className="home-plan-saving">{duration.saving > 0 ? `Save ${money(tier.daily * duration.days - total)} vs the monthly plan’s daily rate` : ""}</p>
        <Link className="home-plan-cta" href={`/signup?plan=${tier.name.toLowerCase()}&duration=${["monthly", "annual", "three_year"][selected]}`}>Choose {tier.name}<span aria-hidden="true">→</span></Link>
        <div className="home-plan-features"><h4>{tier.intro}</h4><ul>{tier.features.map(feature => <li key={feature}><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m4 10 4 4 8-8" /></svg><span>{feature}</span></li>)}</ul></div>
        <footer><span>{duration.days.toLocaleString("en-IN")} days of access</span><span>No automatic renewal</span></footer>
      </article>;
    })}</div>
    <div className="home-pricing-free"><span className="home-free-label">FREE, ALWAYS AVAILABLE</span><div><h3>Not ready to upgrade?</h3><p>Start with one brand, basic publishing and a free 30-day content plan.</p></div><Link href="/signup">Start free <span aria-hidden="true">→</span></Link></div>
    <div className="home-pricing-footer"><p>Prices in INR. Pay once for the full access period. Daily rates are equivalents, not installments. Paid access starts after successful payment.</p><Link href="/refunds">Refund policy ↗</Link></div>
  </div></section>;
}
