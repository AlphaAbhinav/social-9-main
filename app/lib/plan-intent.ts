export type PlanIntent = { tier: string; duration: string };
const key = "social9-plan-intent";
export function readPlanIntent(): PlanIntent | null {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const stored = JSON.parse(localStorage.getItem(key) ?? "null");
    const intent = params.has("plan") ? { tier: params.get("plan"), duration: params.get("duration") } : stored;
    if (!intent || !["starter", "advanced", "agency"].includes(intent.tier) || !["monthly", "annual", "three_year"].includes(intent.duration)) return null;
    localStorage.setItem(key, JSON.stringify(intent));
    return intent;
  } catch { return null; }
}
export function planDestination() {
  const intent = readPlanIntent();
  return intent ? `/billing?plan=${intent.tier}&duration=${intent.duration}` : "/dashboard";
}
