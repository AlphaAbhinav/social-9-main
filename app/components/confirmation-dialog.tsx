"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const subscribeToBrowser = () => () => undefined;
const getBrowserSnapshot = () => true;
const getServerSnapshot = () => false;

type ConfirmationDialogProps = {
  busy?: boolean;
  tone?: "danger" | "primary";
  confirmLabel: string;
  description: string;
  eyebrow?: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
};

export function ConfirmationDialog({
  busy = false,
  tone = "danger",
  confirmLabel,
  description,
  eyebrow = "Please confirm",
  onCancel,
  onConfirm,
  title,
}: ConfirmationDialogProps) {
  const mounted = useSyncExternalStore(
    subscribeToBrowser,
    getBrowserSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (!busy && event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [busy, onCancel]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="confirmation-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (!busy && event.target === event.currentTarget) onCancel();
      }}
    >
      <section className="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="confirmation-title">
        <span className="confirmation-symbol" aria-hidden="true">!</span>
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2 id="confirmation-title">{title}</h2>
          <p>{description}</p>
        </div>
        <div className="confirmation-actions">
          <button className="secondary-button" type="button" disabled={busy} onClick={onCancel}>Cancel</button>
          <button className={tone === "primary" ? "primary-button" : "confirm-danger-button"} type="button" disabled={busy} onClick={onConfirm}>
            {busy ? "Working..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
