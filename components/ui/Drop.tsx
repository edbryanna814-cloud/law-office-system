"use client";

import { useEffect, useRef, useState } from "react";

export function Drop({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [open]);
  const sel = options.find((o) => o.value === value);

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        className="input"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "start" }}
      >
        <span style={{ color: sel ? "var(--txt)" : "#5D6A80" }}>{sel?.label ?? placeholder ?? ""}</span>
        <span style={{ color: "#8A97AE", fontSize: 10 }}>▼</span>
      </button>
      {open && !disabled && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            insetInlineStart: 0,
            right: 0,
            minWidth: "100%",
            background: "#121A2B",
            border: "1px solid var(--line-strong)",
            borderRadius: 12,
            zIndex: 60,
            maxHeight: 240,
            overflow: "auto",
            boxShadow: "0 18px 40px -18px #000",
            padding: 4,
          }}
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "start",
                padding: "10px 12px",
                borderRadius: 9,
                fontSize: 13.5,
                color: "var(--txt)",
                background: o.value === value ? "rgba(46,139,255,.16)" : "transparent",
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}