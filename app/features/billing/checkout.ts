import { ApiError } from "../../lib/api";

export type RazorpaySuccess = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayCheckout = {
  open: () => void;
  on: (event: "payment.failed", handler: (response: { error?: { description?: string; reason?: string; code?: string } }) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckout;
  }
}

export function loadRazorpayCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Unable to load secure checkout.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Unable to load secure checkout.")), { once: true });
    document.head.appendChild(script);
  });
}

export function checkoutErrorMessage(
  error: unknown,
  testMode: boolean | undefined,
  keyId: string | null | undefined,
): string {
  if (error instanceof ApiError && error.status === 502 && error.message.trim().toLowerCase() === "unauthorized") {
    const mode = testMode ? "test" : "live";
    const keySuffix = keyId?.slice(-4);
    return `Razorpay rejected the configured ${mode} API credentials${keySuffix ? ` (Render is using a key ID ending in ${keySuffix})` : ""}. Verify that RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Render are a matching ${mode} pair, then save the environment changes and redeploy the Render service.`;
  }
  return error instanceof Error ? error.message : "Unable to open secure checkout.";
}
