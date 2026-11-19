// Set this to the Play Store listing when the Android app launches.
export function androidAppUrl(): string | null {
  const value = process.env.NEXT_PUBLIC_ANDROID_APP_URL?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "play.google.com" && url.pathname === "/store/apps/details" && Boolean(url.searchParams.get("id")?.trim())
      ? url.href
      : null;
  } catch {
    return null;
  }
}
