"use client";

import { useState } from "react";
import { I, Ico } from "@/components/ui/icons";
import { Modal } from "@/components/ui/shared";
import type { TransactionData } from "@/types";

const fmtDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("ar-EG", { day: "numeric", month: "long" });

export function AddTxModal({ onClose, onAdd, edit }: { onClose: () => void; onAdd: (t: TransactionData) => void; edit?: TransactionData }) {
  const [f, setF] = useState({ d: edit?.d ?? "", amt: edit?.amt ? String(edit.amt) : "", dir: (edit?.dir ?? "in") as TransactionData["dir"] });
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const ok = Boolean(f.d && f.amt && Number(f.amt) > 0);

  const save = () => {
    if (!ok) return;
    onAdd({
      id: edit?.id ?? "TX-" + String(Math.floor(1000 + Math.random() * 9000)),
      d: f.d,
      t: f.dir === "in" ? "تحصيل" : "مصروف",
      amt: Number(f.amt),
      date: new Date().toISOString().slice(0, 10),
      dir: f.dir,
    });
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <div className="row" style={{ marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 19 }}>{edit ? "تعديل العملية" : "تسجيل عملية جديدة"}</h3>
        <button className="icon-btn" style={{ marginInlineStart: "auto" }} onClick={onClose} aria-label="إغلاق">
          <Ico d={I.x} />
        </button>
      </div>
      <div className="field" style={{ marginBottom: 14 }}>
        <label>البيان</label>
        <input className="input" placeholder="مثال: أتعاب قضية 2024/118" value={f.d} onChange={(e) => set("d", e.target.value)} />
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="field">
          <label>النوع</label>
          <select className="input" value={f.dir} onChange={(e) => set("dir", e.target.value)}>
            <option value="in">تحصيل +</option>
            <option value="out">مصروف −</option>
          </select>
        </div>
        <div className="field">
          <label>المبلغ (ج.م)</label>
          <input className="input" inputMode="numeric" placeholder="0" value={f.amt} onChange={(e) => set("amt", e.target.value)} />
        </div>
      </div>
      <div className="row" style={{ gap: 10, marginTop: 18 }}>
        <button className="btn" style={{ flex: 1 }} disabled={!ok} onClick={save}>
          {edit ? "حفظ التعديلات" : "حفظ العملية"}
        </button>
        <button className="btn ghost" onClick={onClose}>
          إلغاء
        </button>
      </div>
      {!ok && (
        <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          محتاج البيان والمبلغ قبل الحفظ.
        </div>
      )}
    </Modal>
  );
}