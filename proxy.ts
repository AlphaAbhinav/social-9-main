// Keep the CSP inside the framework request pipeline. A root middleware.ts
// is also auto-packaged as standalone Routing Middleware by Vercel.
export function proxy(request: Request) {
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const apiOrigin = new URL(
    process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000",
  ).origin;
  const developmentConnections = process.env.NODE_ENV === "development"
    ? " http://127.0.0.1:8000 http://localhost:8000 ws: wss:"
    : "";
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://checkout.razorpay.com${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' ${apiOrigin} https://*.razorpay.com${developmentConnections}`,
    "frame-src https://*.razorpay.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", policy);
  const response = new Response(null);
  response.headers.set("x-middleware-next", "1");
  const forwarded: string[] = [];
  headers.forEach((value, name) => {
    forwarded.push(name);
    response.headers.set(`x-middleware-request-${name}`, value);
  });
  response.headers.set("x-middleware-override-headers", forwarded.join(","));
  response.headers.set("Content-Security-Policy", policy);
  // A nonce belongs to one response and must never be reused by a shared cache.
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/((?!_next/|.*\\.[^/]+$).*)"],
};
