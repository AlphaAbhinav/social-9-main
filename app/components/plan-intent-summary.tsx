"use client";
import { useEffect, useState } from "react";
import { readPlanIntent, type PlanIntent } from "../lib/plan-intent";
import { apiRequest } from "../lib/api";
type Plan = { tier: string; duration: string; total_price_inr: number; commitment: string; name: string };
export function PlanIntentSummary() {
  const [intent, setIntent] = useState<PlanIntent | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      const selected = readPlanIntent();
      setIntent(selected);
      if (!selected) return;
      void apiRequest<{ plans: Plan[] }>("/billing/public-plans")
        .then(data => {
          if (active) setPlan(data.plans.find(p => p.tier === selected.tier && p.duration === selected.duration) ?? null);
        })
        .catch(() => undefined);
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, []);
  if (!intent) return null;
  return <aside className="plan-intent-summary" aria-label="Selected plan"><strong>{plan?.name ?? intent.tier} - {({ monthly: "1 month", annual: "1 year", three_year: "3 years" } as Record<string, string>)[intent.duration]}</strong><p>{plan ? `INR ${plan.total_price_inr.toLocaleString("en-IN")} paid upfront. ` : "Final price will be confirmed in billing. "}Create your account and verify your email, then review this plan in billing. Payment is a separate step.</p></aside>;
}
