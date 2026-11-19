"use client";

import { useSyncExternalStore } from "react";

import { getSessionUser } from "../lib/session";

export function PersonalizedGreeting() {
  const firstName = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange);
      return () => window.removeEventListener("storage", onStoreChange);
    },
    () => getSessionUser()?.name.trim().split(/\s+/)[0] || null,
    () => null,
  );

  return <h2>Good morning, {firstName ?? "there"}!</h2>;
}
