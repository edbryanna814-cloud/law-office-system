import type { ReactNode } from "react";

export function Switch({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button className={"switch" + (on ? " on" : "")} onClick={onChange} aria-pressed={on}>
      <i />
    </button>
  );
}

export function Stat({
  label,
  value,
  foot,
  hi,
  tone = "blue",
}: {
  label: string;
  value: string;
  foot?: string;
  hi?: boolean;
  tone?: "blue" | "teal" | "red" | "gold";
}) {
  return (
    <div className={"stat" + (hi ? " hi" : "")}>
      <div className="row">
        <span className="lbl">{label}</span>
        {foot && (
          <span className={"pill " + tone} style={{ marginInlineStart: "auto" }}>
            {foot}
          </span>
        )}
      </div>
      <div className="val">{value}</div>
    </div>
  );
}

export function Modal({ children, onClose, wide }: { children: ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={"modal sheet" + (wide ? " wide" : "")} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  );
}