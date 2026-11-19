export const platformNames: Record<string, string> = { instagram: "Instagram", facebook: "Facebook Pages", linkedin: "LinkedIn", threads: "Threads", youtube: "YouTube", twitter: "X", pinterest: "Pinterest" };
export function platformName(provider: string): string { return platformNames[provider] ?? "Unavailable network"; }

// Live OAuth connection readiness comes from provider-status.
export const comingSoonProviders = [] as const;

export function isComingSoonProvider(provider: string): boolean {
  return comingSoonProviders.some((network) => network === provider);
}
