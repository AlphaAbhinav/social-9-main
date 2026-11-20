"use client";

import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { ApiError, apiRequest, type Social9Brand } from "../../lib/api";
import { clearSession, getAccessToken } from "../../lib/session";
import { track } from "../../lib/track";
import { loadRazorpayCheckout, checkoutErrorMessage, type RazorpaySuccess } from "./checkout";

type PlanFeatures = {
  brand_limit: number | null;
  competitor_limit: number;
  team_member_limit: number;
  team_workspace: boolean;
  content_approvals: boolean;
  publishing_reports: boolean;
  growth_projection: boolean;
  ai_assistant: boolean;
  extended_content_plan: boolean;
  content_plan_days: number | null;
};

type Subscription = {
  plan: string;
  billing_term: string | null;
  status: string;
  provider: string | null;
  is_paid: boolean;
  complimentary_access: boolean;
  mock_mode: boolean;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  features: PlanFeatures;
};

type RazorpayConfig = {
  enabled: boolean;
  key_id: string | null;
  currency: string;
  price_inr: number | null;
  plans: BillingPlan[];
  test_mode: boolean;
};

type BillingPlan = {
  features: PlanFeatures;
  tier: string;
  duration: string;
  commitment: string;
  brand_limit: number;
  growth_projection: boolean;
  code: string;
  name: string;
  days: number;
  daily_price_inr: number;
  total_price_inr: number;
  monthly_equivalent_inr: number;
  savings_inr: number;
  savings_percent: number;
  badge: string | null;
};

type RazorpaySession = {
  key_id: string;
  order_id: string;
  currency: string;
  price_inr: number;
  plan_code: string;
  name: string;
  description: string;
  customer_name: string;
  customer_email: string;
  test_mode: boolean;
};

type PurchaseInfo = { plan: string; duration?: string; coupon?: string; value: number; item: { id: string; name: string; price: number } };

export function useBilling() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [brandCount, setBrandCount] = useState(0);
  const [razorpayConfig, setRazorpayConfig] = useState<RazorpayConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Razorpay test-mode payments are not real revenue, so they are kept out of GA4 and Meta.
  function trackPayment(event: string, params: Parameters<typeof track>[1], testMode = razorpayConfig?.test_mode ?? true) {
    if (!testMode) track(event, params);
  }

  const unauthorized = useCallback(() => {
    clearSession();
    window.location.replace("/login");
  }, []);

  const loadSubscription = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return unauthorized();
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [nextSubscription, nextConfig, brands] = await Promise.all([
        apiRequest<Subscription>("/billing/subscription", { headers }),
        apiRequest<RazorpayConfig>("/billing/razorpay/config", { headers }),
        apiRequest<Social9Brand[]>("/brands", { headers }),
      ]);
      setSubscription(nextSubscription);
      setRazorpayConfig(nextConfig);
      setBrandCount(brands.length);
      if (!nextSubscription.is_paid) track("view_pricing", { label: "billing" });
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) return unauthorized();
      setError(requestError instanceof Error ? requestError.message : "Unable to load subscription.");
    } finally {
      setLoading(false);
    }
  }, [unauthorized]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadSubscription(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadSubscription]);

  async function updateMockSubscription(action: "subscribe" | "cancel", planCode = "agency_monthly_v2") {
    const token = getAccessToken();
    if (!token) return unauthorized();
    setWorking(true);
    setError("");
    setMessage("");
    try {
      const updated = await apiRequest<Subscription>(`/billing/mock/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: action === "subscribe" ? JSON.stringify({ plan_code: planCode }) : undefined,
      });
      setSubscription(updated);
      setMessage(action === "subscribe" ? "Pro preview enabled for this local account." : "Subscription canceled in local preview.");
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) return unauthorized();
      setError(requestError instanceof Error ? requestError.message : "Unable to update subscription.");
    } finally {
      setWorking(false);
    }
  }

  async function verifyRazorpayPayment(response: RazorpaySuccess, token: string, purchase: PurchaseInfo, testMode: boolean) {
    try {
      const updated = await apiRequest<Subscription>("/billing/razorpay/verify", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(response),
      });
      setSubscription(updated);
      trackPayment("purchase", { ...purchase, transaction_id: response.razorpay_payment_id, currency: "INR" }, testMode);
      setMessage(updated.is_paid ? "Premium is active. Your paid features are unlocked." : "Payment verified. Paid access activation is pending confirmation.");
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) return unauthorized();
      trackPayment("payment_verification_failed", { plan: purchase.plan }, testMode);
      setError(requestError instanceof Error ? requestError.message : "Unable to verify the payment.");
    } finally {
      setWorking(false);
    }
  }

  async function startRazorpayCheckout(planCode = "agency_monthly_v2", couponCode = "", expectedAmountMinor?: number) {
    const token = getAccessToken();
    if (!token) return unauthorized();
    setWorking(true);
    setError("");
    setMessage("");
    const plan = razorpayConfig?.plans.find((item) => item.code === planCode);
    const value = expectedAmountMinor !== undefined ? expectedAmountMinor / 100 : plan?.total_price_inr ?? 0;
    const purchase: PurchaseInfo = { plan: planCode, duration: plan?.duration, coupon: couponCode || undefined, value, item: { id: planCode, name: plan?.name ?? planCode, price: value } };
    try {
      if (expectedAmountMinor === 0 && couponCode) {
        const updated = await apiRequest<Subscription>("/billing/coupons/redeem", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ plan_code: planCode, coupon_code: couponCode, expected_amount_minor: 0 }),
        });
        setSubscription(updated);
        trackPayment("plan_activated_with_coupon", { plan: planCode, coupon: couponCode });
        setMessage("Your coupon has activated the selected plan. No payment is required.");
        setWorking(false);
        return;
      }
      const [session] = await Promise.all([
        apiRequest<RazorpaySession>("/billing/razorpay/checkout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ plan_code: planCode, coupon_code: couponCode || null, expected_amount_minor: expectedAmountMinor }),
        }),
        loadRazorpayCheckout(),
      ]);
      if (!window.Razorpay) throw new Error("Secure checkout did not load. Please try again.");
      const checkout = new window.Razorpay({
        key: session.key_id,
        order_id: session.order_id,
        name: session.name,
        description: session.description,
        prefill: { name: session.customer_name, email: session.customer_email },
        theme: { color: "#8e44ad" },
        handler: (response: RazorpaySuccess) => {
          setCheckoutOpen(false);
          void verifyRazorpayPayment(response, token, purchase, session.test_mode);
        },
        modal: { ondismiss: () => { trackPayment("checkout_cancelled", { plan: planCode }, session.test_mode); setCheckoutOpen(false); setWorking(false); } },
      });
      checkout.on("payment.failed", (response) => {
        trackPayment("payment_failed", { plan: planCode, reason: response.error?.reason ?? response.error?.code ?? "unknown" }, session.test_mode);
        setError(response.error?.description ?? "Payment failed. No charge was completed.");
      });
      // Native modal dialogs must leave the top layer before Razorpay opens.
      flushSync(() => setCheckoutOpen(true));
      checkout.open();
      trackPayment("add_payment_info", purchase, session.test_mode);
    } catch (requestError) {
      setCheckoutOpen(false);
      if (requestError instanceof ApiError && requestError.status === 401) return unauthorized();
      trackPayment("checkout_error", { plan: planCode });
      setError(checkoutErrorMessage(
        requestError,
        razorpayConfig?.test_mode,
        razorpayConfig?.key_id,
      ));
      setWorking(false);
    }
  }

  return {
    subscription,
    brandCount,
    razorpayConfig,
    loading,
    working,
    checkoutOpen,
    error,
    message,
    updateMockSubscription,
    startRazorpayCheckout
  };
}
