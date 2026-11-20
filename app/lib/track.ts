// Sends one user action to Google Tag Manager (for GA4) and to the Meta Pixel.
// Never pass personal data (email, name, phone, captions) as parameters.

type ItemInfo = { id: string; name: string; price: number };
export type TrackParams = {
  method?: string;
  plan?: string;
  duration?: string;
  provider?: string;
  platforms?: string;
  post_type?: string;
  form?: string;
  reason?: string;
  location?: string;
  label?: string;
  coupon?: string;
  search_term?: string;
  transaction_id?: string;
  value?: number;
  currency?: string;
  item?: ItemInfo;
};

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    fbq?: (...args: unknown[]) => void;
  }
}

// GA4 event name -> Meta standard event. Everything else is sent as a Meta custom event.
const META_STANDARD: Record<string, string> = {
  sign_up: "CompleteRegistration",
  view_pricing: "ViewContent",
  begin_checkout: "InitiateCheckout",
  add_payment_info: "AddPaymentInfo",
  purchase: "Purchase",
  contact: "Contact",
  search: "Search",
  signup_cta_click: "Lead",
};

// GTM keeps dataLayer values between pushes, so every push clears all known keys first.
const KEYS = ["method", "plan", "duration", "provider", "platforms", "post_type", "form", "reason", "location", "label", "coupon", "search_term", "transaction_id", "value", "currency"];

export function track(event: string, params: TrackParams = {}): void {
  if (typeof window === "undefined") return;
  const { item, ...flat } = params;
  const location = flat.location ?? window.location.pathname;
  try {
    const dataLayer = (window.dataLayer = window.dataLayer || []);
    if (item) dataLayer.push({ ecommerce: null });
    dataLayer.push({
      ...Object.fromEntries(KEYS.map((key) => [key, undefined])),
      ...flat,
      location,
      event,
      ...(item ? { ecommerce: { currency: flat.currency ?? "INR", value: flat.value ?? item.price, transaction_id: flat.transaction_id, coupon: flat.coupon, items: [{ item_id: item.id, item_name: item.name, price: item.price, quantity: 1 }] } } : {}),
    });
  } catch {
    // Analytics must never break the product.
  }
  try {
    if (!window.fbq) return;
    const metaParams: Record<string, unknown> = { ...flat, location };
    if (item) Object.assign(metaParams, { value: flat.value ?? item.price, currency: flat.currency ?? "INR", content_ids: [item.id], content_name: item.name, content_type: "product" });
    if (flat.search_term) metaParams.search_string = flat.search_term;
    const standard = META_STANDARD[event];
    if (standard) window.fbq("track", standard, metaParams);
    else window.fbq("trackCustom", event, metaParams);
  } catch {
    // Ignore pixel failures.
  }
}
