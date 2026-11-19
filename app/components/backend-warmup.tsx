"use client";

import { useEffect } from "react";

import { API_URL } from "../lib/api";

export function BackendWarmup() {
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/health`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    }).catch(() => undefined);
    return () => controller.abort();
  }, []);

  return null;
}
