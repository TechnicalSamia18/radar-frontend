"use client";
// Label + control + error message, wired together with ids so screen readers
// announce the label and the error with the control.
import { useId, type ReactNode } from "react";

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: (id: string, describedBy?: string) => ReactNode }) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div>
      <label htmlFor={id} className="text-sm text-stormy">{label}</label>
      <div className="mt-1">{children(id, error || hint ? msgId : undefined)}</div>
      {error ? (
        <p id={msgId} className="mt-1 text-sm text-danger">{error}</p>
      ) : hint ? (
        <p id={msgId} className="mt-1 text-xs text-stormy">{hint}</p>
      ) : null}
    </div>
  );
}
