"use client";

import { useState } from "react";
import { I, Ico } from "@/components/ui/icons";
import { Modal } from "@/components/ui/shared";
import type { TransactionData } from "@/types";

const fmtDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("ar-EG", { day: "numeric", month: "long" });

// ponytail: قايمة تصنيفات ثابتة هنا — لو بقى فيه إدارة تصنيفات كاملة (إضافة/حذف) هنقلها لجدول في الـ DB.
const CATS = [
  { k: "vault", l: "الخزانة" },
  { k: "cust", l: "عهدة موظف" },
  { k: "fees", l: "أتعاب قضية" },
];

export function AddTxModal({
  onClose,
  onAdd,
  edit,
  staff,
}: {
  onClose: () => void;
  onAdd: (t: TransactionData) => void;
  edit?: TransactionData;
  staff: { id: string; n: string }[];
}) {
  const [f, setF] = useState({
    d: edit?.d ?? "",
    amt: edit?.amt ? String(edit.amt) : "",
    dir: (edit?.dir ?? "in") as TransactionData["dir"],
    cat: edit?.cat ?? "vault",
    who: edit?.who ?? "",
  });
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const ok = Boolean(f.d && f.amt && Number(f.amt) > 0 && (f.cat !== "cust" || f.who));

  const save = () => {
    if (!ok) return;
    onAdd({
      id: edit?.id ?? "TX-" + String(Math.floor(1000 + Math.random() * 9000)),
      d: f.d,
      t: f.dir === "in" ? "تحصيل" : "مصروف",
      amt: Number(f.amt),
      date: new Date().toISOString().slice(0, 10),
      dir: f.dir,
      cat: f.cat,
      who: f.cat === "cust" ? f.who : undefined,
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
      <div className="field" style={{ marginBottom: 14 }}>
        <label>التصنيف</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {CATS.map((c) => (
            <label key={c.k} className="listrow" style={{ cursor: "pointer", padding: "8px 12px", fontSize: 13 }}>
              <input type="radio" name="cat" value={c.k} checked={f.cat === c.k} onChange={() => set("cat", c.k)} />
              <span style={{ marginInlineStart: 6 }}>{c.l}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="field" style={{ marginBottom: 14 }}>
        <label>النوع</label>
        <select className="input" value={f.dir} onChange={(e) => set("dir", e.target.value)}>
          <option value="in">تحصيل +</option>
          <option value="out">مصروف −</option>
        </select>
      </div>
      <div className="field" style={{ marginBottom: 14 }}>
        <label>المبلغ (ج.م)</label>
        <input className="input" inputMode="numeric" placeholder="0" value={f.amt} onChange={(e) => set("amt", e.target.value)} />
      </div>
      {f.cat === "cust" && (
        <div className="field">
          <label>الموظف</label>
          <select className="input" value={f.who} onChange={(e) => set("who", e.target.value)}>
            <option value="">اختر الموظف...</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.n} — {s.id}
              </option>
            ))}
          </select>
        </div>
      )}
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
          {(!f.d || !f.amt || Number(f.amt) <= 0) && "محتاج البيان والمبلغ قبل الحفظ. "}
          {f.cat === "cust" && !f.who && "اختر الموظف صاحب العهدة."}
        </div>
      )}
    </Modal>
  );
}