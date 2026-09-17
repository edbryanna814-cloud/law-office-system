"use client";

import { useState } from "react";
import { I, Ico } from "@/components/ui/icons";
import { Modal } from "@/components/ui/shared";
import type { CaseData, EmployeeData, SessionData, SessionTone } from "@/types";

const TONES: SessionTone[] = ["blue", "teal", "red", "gold"];

export function AddSessionModal({
  onClose,
  onSave,
  edit,
  cases,
  staff,
}: {
  onClose: () => void;
  onSave: (s: SessionData) => void;
  edit?: SessionData;
  cases: CaseData[];
  staff: EmployeeData[];
}) {
  const [f, setF] = useState({
    t: edit?.t ?? "",
    c: edit?.c ?? cases[0]?.id ?? "",
    room: edit?.room ?? "دائرة ٧",
    d: "",
    h: "",
    tone: (edit?.tone ?? "blue") as SessionTone,
    lawyer: edit?.lawyer ?? staff[0]?.n ?? "",
  });
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const ok = Boolean(f.t && f.c && f.room && f.d && f.h);

  const save = () => {
    if (!ok) return;
    onSave({
      id: edit?.id ?? "SES-" + String(Math.floor(1000 + Math.random() * 9000)),
      t: f.t,
      c: f.c,
      room: f.room,
      d: f.d || edit?.d || "",
      h: f.h || edit?.h || "",
      tone: f.tone,
      lawyer: f.lawyer,
    });
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <div className="row" style={{ marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 19 }}>{edit ? "تعديل الجلسة" : "إضافة جلسة جديدة"}</h3>
        <button className="icon-btn" style={{ marginInlineStart: "auto" }} onClick={onClose} aria-label="إغلاق">
          <Ico d={I.x} />
        </button>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>نوع الجلسة</label>
          <input className="input" placeholder="مثال: مرافعة ختامية" value={f.t} onChange={(e) => set("t", e.target.value)} />
        </div>
        <div className="field">
          <label>رقم القضية</label>
          <select className="input" value={f.c} onChange={(e) => set("c", e.target.value)}>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} — {c.title}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>الدائرة</label>
          <input className="input" placeholder="مثال: دائرة ٧" value={f.room} onChange={(e) => set("room", e.target.value)} />
        </div>
        <div className="field">
          <label>التاريخ</label>
          <input className="input" type="date" value={f.d} onChange={(e) => set("d", e.target.value)} />
        </div>
        <div className="field">
          <label>الوقت</label>
          <input className="input" type="time" value={f.h} onChange={(e) => set("h", e.target.value)} />
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>اللون المميز</label>
          <div className="row" style={{ gap: 8 }}>
            {TONES.map((tone) => (
              <button
                key={tone}
                className={"pill " + tone}
                onClick={() => set("tone", tone)}
                style={{ cursor: "pointer", boxShadow: f.tone === tone ? "var(--glow)" : undefined }}
              >
                {f.tone === tone ? "✓ " : ""}
                {tone}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>المحامي المكلف</label>
          <select className="input" value={f.lawyer} onChange={(e) => set("lawyer", e.target.value)}>
            {staff.map((s) => (
              <option key={s.id} value={s.n}>
                {s.n}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="row" style={{ gap: 10, marginTop: 18 }}>
        <button className="btn" style={{ flex: 1 }} disabled={!ok} onClick={save} title={ok ? "" : "اكمل الحقول المطلوبة"}>
          {edit ? "حفظ التعديلات" : "حفظ الجلسة"}
        </button>
        <button className="btn ghost" onClick={onClose}>
          إلغاء
        </button>
      </div>
      {!ok && (
        <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          محتاج نوع الجلسة ورقم القضية والدائرة والتاريخ والوقت قبل الحفظ.
        </div>
      )}
    </Modal>
  );
}