import { invalidateDashboardCache } from "./dashboard-cache";

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

export const API_URL = configuredApiUrl ?? "http://127.0.0.1:8000";

export type Social9User = {
  id: number;
  name: string;
  email: string;
  is_verified: boolean;
};

export type Social9Brand = {
  id: number;
  name: string;
  created_at: string;
};

const ACTIVE_BRAND_KEY = "social9_active_brand_id";

export function getActiveBrandId(): number | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(ACTIVE_BRAND_KEY);
  const parsed = value ? Number(value) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function setActiveBrandId(brandId: number): void {
  const changed = getActiveBrandId() !== brandId;
  window.localStorage.setItem(ACTIVE_BRAND_KEY, String(brandId));
  if (changed) invalidateDashboardCache();
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type ErrorBody = {
  detail?: string | Array<{ msg?: string }>;
};

const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const RETRY_DELAYS_MS = [1_000, 2_500, 5_000];

function waitForRetry(delay: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error("Request aborted"));
      return;
    }

    const timeout = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, delay);
    const abort = () => {
      clearTimeout(timeout);
      reject(new Error("Request aborted"));
    };
    signal.addEventListener("abort", abort, { once: true });
  });
}

function errorMessage(body: ErrorBody, fallback: string): string {
  if (typeof body.detail === "string") {
    return body.detail;
  }
  if (Array.isArray(body.detail)) {
    return body.detail.map((item) => item.msg).filter(Boolean).join(". ") || fallback;
  }
  return fallback;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const aiGeneration = path === "/ai/assist" || path === "/content-plan/ai";
  const timeout = setTimeout(() => controller.abort(), aiGeneration ? 210_000 : 75_000);
  const suppliedSignal = init.signal;
  const abortFromCaller = () => controller.abort();
  if (suppliedSignal?.aborted) controller.abort();
  else suppliedSignal?.addEventListener("abort", abortFromCaller, { once: true });

  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  const activeBrandId = getActiveBrandId();
  if (activeBrandId && !headers.has("X-Brand-ID")) {
    headers.set("X-Brand-ID", String(activeBrandId));
  }
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  let response: Response | undefined;
  const method = (init.method ?? "GET").toUpperCase();
  const canRetry = method === "GET" || method === "HEAD";
  if (!canRetry) invalidateDashboardCache();
  try {
    const attempts = canRetry ? RETRY_DELAYS_MS.length + 1 : 1;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        response = await fetch(`${API_URL}${path}`, {
          ...init,
          headers,
          signal: controller.signal,
        });
      } catch (requestError) {
        if (controller.signal.aborted || attempt === attempts - 1) {
          throw requestError;
        }
        await waitForRetry(RETRY_DELAYS_MS[attempt], controller.signal);
        continue;
      }

      if (
        !RETRYABLE_STATUSES.has(response.status) ||
        attempt === attempts - 1
      ) {
        break;
      }
      await waitForRetry(RETRY_DELAYS_MS[attempt], controller.signal);
    }
  } catch {
    if (controller.signal.aborted && !suppliedSignal?.aborted) {
      throw new ApiError("The Social9 server took too long to respond. Please try again.", 0);
    }
    throw new ApiError(
      "The Social9 server is unavailable. Please try again in a moment.",
      0,
    );
  } finally {
    if (!canRetry) invalidateDashboardCache();
    clearTimeout(timeout);
    suppliedSignal?.removeEventListener("abort", abortFromCaller);
  }

  if (!response) {
    throw new ApiError(
      "The Social9 server is unavailable. Please try again in a moment.",
      0,
    );
  }

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json().catch(() => ({})) as T & ErrorBody
    : {} as T & ErrorBody;

  if (!response.ok) {
    throw new ApiError(errorMessage(body, "Something went wrong."), response.status);
  }
  if (!contentType.includes("application/json")) {
    throw new ApiError(
      "The Social9 server is starting up. Please wait a moment and try again.",
      response.status,
    );
  }
  return body;
}
