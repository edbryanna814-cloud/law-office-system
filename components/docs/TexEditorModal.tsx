"use client";

import { useEffect, useState } from "react";
import { I, Ico } from "@/components/ui/icons";
import { Modal } from "@/components/ui/shared";
import type { DocumentData } from "@/types";

export function TexEditorModal({
  doc,
  onSave,
  onClose,
}: {
  doc: DocumentData;
  onSave: (id: string, tex: string) => void;
  onClose: () => void;
}) {
  const [v, setV] = useState(doc.tex ?? "");
  const [saved, setSaved] = useState(false);
  const [lines, setLines] = useState(1);

  useEffect(() => {
    setV(doc.tex ?? "");
  }, [doc.id, doc.tex]);

  useEffect(() => {
    setLines(v.split("\n").length);
  }, [v]);

  return (
    <Modal onClose={onClose} wide>
      <div className="row" style={{ marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 17 }}>محرر LaTeX</h3>
          <div className="muted" style={{ fontSize: 12, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {doc.n}
          </div>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="إغلاق" style={{ marginInlineStart: 10 }}>
          <Ico d={I.x} />
        </button>
      </div>

      <textarea
        dir="ltr"
        spellCheck={false}
        value={v}
        onChange={(e) => {
          setV(e.target.value);
          setSaved(false);
        }}
        style={{
          width: "100%",
          minHeight: 320,
          fontFamily: "Consolas, Monaco, 'Courier New', monospace",
          fontSize: 13,
          lineHeight: 1.6,
          backgroundColor: "#0B1020",
          color: "#C9D6F0",
          border: "1px solid rgba(125,155,205,.18)",
          borderRadius: 12,
          padding: 14,
          outline: "none",
          resize: "vertical",
          direction: "ltr",
          textAlign: "left",
          whiteSpace: "pre",
        }}
      />

      <div className="row" style={{ gap: 10, marginTop: 14 }}>
        <span className="muted" style={{ fontSize: 12 }}>
          {lines} سطر
        </span>
        <button
          className="btn"
          style={{ marginInlineStart: "auto" }}
          onClick={() => {
            onSave(doc.id, v);
            setSaved(true);
          }}
        >
          حفظ التعديلات
        </button>
        <button className="btn ghost" onClick={onClose}>
          إغلاق
        </button>
      </div>
      {saved && (
        <div className="pill teal" style={{ marginTop: 10 }}>
          تم الحفظ
        </div>
      )}
    </Modal>
  );
}