"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ApiError, apiRequest } from "../../lib/api";
import { clearSession, getAccessToken } from "../../lib/session";

type Plan = { code: string; name: string; commitment: string; total_price_inr: number };
type Quote = { coupon_code: string | null; original_amount_minor: number; discount_minor: number; amount_minor: number };
const money = (value: number) => (value / 100).toLocaleString("en-IN", { style: "currency", currency: "INR" });

export function CouponCheckout({ plan, busy, checkoutOpen, error, close, pay }: {
  plan: Plan; busy: boolean; checkoutOpen: boolean; error: string; close: () => void;
  pay: (planCode: string, coupon: string, amount: number) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [code, setCode] = useState("");
  const [quote, setQuote] = useState<Quote>({ coupon_code: null, original_amount_minor: plan.total_price_inr * 100, discount_minor: 0, amount_minor: plan.total_price_inr * 100 });
  const [checking, setChecking] = useState(false);
  const [failure, setFailure] = useState("");
  useLayoutEffect(() => {
    const orderDialog = dialog.current;
    if (!orderDialog) return;
    if (checkoutOpen) orderDialog.close();
    else if (!orderDialog.open) orderDialog.showModal();
  }, [checkoutOpen]);

  async function apply() {
    setChecking(true); setFailure("");
    try {
      const next = await apiRequest<Quote>("/billing/coupons/quote", { method: "POST", headers: { Authorization: `Bearer ${getAccessToken()}` }, body: JSON.stringify({ plan_code: plan.code, coupon_code: code.trim() }) });
      setQuote(next); setCode(next.coupon_code ?? "");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) { clearSession(); window.location.replace("/login"); return; }
      setFailure(error instanceof Error ? error.message : "Unable to apply coupon.");
    } finally { setChecking(false); }
  }

  return <dialog ref={dialog} className="billing-checkout-dialog" onCancel={event => { if (busy || checking) event.preventDefault(); else close(); }} aria-labelledby="checkout-heading">
    <div className="billing-checkout-head"><span className="billing-eyebrow">YOUR ORDER</span><button aria-label="Close checkout" disabled={busy || checking} onClick={close}>×</button></div>
    <h2 id="checkout-heading">{plan.name} · {plan.commitment}</h2><p>One payment. No automatic renewal.</p>
    <form onSubmit={event => { event.preventDefault(); void apply(); }}><label htmlFor="coupon-code">Have a coupon?</label><div className="billing-coupon-input"><input id="coupon-code" autoComplete="off" maxLength={40} value={code} placeholder="Enter code" disabled={busy || checking} onChange={event => setCode(event.target.value.toUpperCase())} /><button disabled={busy || checking || !code.trim()}>{checking ? "Checking…" : "Apply"}</button></div></form>
    {quote.coupon_code && <p className="billing-coupon-applied" role="status">{quote.coupon_code} applied <button disabled={busy || checking} onClick={() => { setCode(""); setFailure(""); setQuote({ coupon_code: null, original_amount_minor: plan.total_price_inr * 100, discount_minor: 0, amount_minor: plan.total_price_inr * 100 }); }}>Remove</button></p>}
    {(failure || error) && <p className="billing-feedback billing-feedback-error" role="alert">{failure || error}</p>}
    <dl className="billing-order-totals"><div><dt>Plan price</dt><dd>{money(quote.original_amount_minor)}</dd></div>{quote.discount_minor > 0 && <div><dt>Coupon savings</dt><dd>−{money(quote.discount_minor)}</dd></div>}<div className="billing-order-total"><dt>Total payable</dt><dd>{money(quote.amount_minor)}</dd></div></dl>
    <button className="billing-pay-button" disabled={busy || checking} onClick={() => void pay(plan.code, quote.coupon_code ?? "", quote.amount_minor)}>{busy ? "Processing…" : quote.amount_minor === 0 ? "Activate plan for free" : `Pay ${money(quote.amount_minor)}`}</button>
    <p className="billing-checkout-note">{quote.amount_minor === 0 ? "Your coupon activates this plan without payment." : "Your access starts after Razorpay confirms successful payment."}</p>
  </dialog>;
}
