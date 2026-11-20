"use client";

import { useSyncExternalStore } from "react";
import { track } from "../lib/track";

type Theme = "dark" | "light";

const STORAGE_KEY = "social9-theme";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function subscribeToTheme(onStoreChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === STORAGE_KEY) onStoreChange();
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener("social9-theme-change", onStoreChange);
  queueMicrotask(onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("social9-theme-change", onStoreChange);
  };
}

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useSyncExternalStore(subscribeToTheme, currentTheme, () => "dark");

  function toggleTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
    window.dispatchEvent(new Event("social9-theme-change"));
    track("theme_changed", { label: nextTheme });
  }

  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      className={compact ? "theme-toggle compact" : "theme-toggle"}
      type="button"
      aria-label={`Switch to ${nextTheme} theme`}
      aria-pressed={theme === "light"}
      title={`Switch to ${nextTheme} theme`}
      onClick={toggleTheme}
    >
      <span className="theme-toggle-icon" aria-hidden="true">{theme === "dark" ? "☾" : "☀"}</span>
      {!compact && <span>Theme</span>}
    </button>
  );
}
