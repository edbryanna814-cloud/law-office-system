"use client";

import { useState } from "react";
import { I, Ico } from "@/components/ui/icons";
import { Modal } from "@/components/ui/shared";
import type { EmployeeData } from "@/types";

const ROLES = ["محامي مرافعات", "محامي أول", "باحث قانوني", "مسؤول أرشيف", "موظف إداري"];

export function AddEmployeeModal({
  onClose,
  onSave,
  edit,
}: {
  onClose: () => void;
  onSave: (e: EmployeeData) => void;
  edit?: EmployeeData;
}) {
  const [f, setF] = useState({
    n: edit?.n ?? "",
    r: edit?.r ?? ROLES[0],
    phone: edit?.phone ?? "",
    mail: edit?.mail ?? "",
  });
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const ok = Boolean(f.n && f.r && f.phone && f.mail);

  const save = () => {
    if (!ok) return;
    onSave({
      n: f.n,
      r: f.r,
      id: edit?.id ?? "EMP-" + String(Math.floor(1000 + Math.random() * 9000)),
      cases: edit?.cases ?? 0,
      phone: f.phone,
      mail: f.mail,
    });
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <div className="row" style={{ marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 19 }}>{edit ? "تعديل الموظف" : "إضافة موظف جديد"}</h3>
        <button className="icon-btn" style={{ marginInlineStart: "auto" }} onClick={onClose} aria-label="إغلاق">
          <Ico d={I.x} />
        </button>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>الاسم</label>
          <input className="input" placeholder="الاسم الثلاثي" value={f.n} onChange={(e) => set("n", e.target.value)} />
        </div>
        <div className="field">
          <label>الوظيفة</label>
          <select className="input" value={f.r} onChange={(e) => set("r", e.target.value)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>رقم الهاتف</label>
          <input className="input" dir="ltr" placeholder="0100 000 0000" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>البريد الإلكتروني</label>
          <input className="input" dir="ltr" placeholder="name@office.eg" value={f.mail} onChange={(e) => set("mail", e.target.value)} />
        </div>
      </div>
      <div className="row" style={{ gap: 10, marginTop: 18 }}>
        <button className="btn" style={{ flex: 1 }} disabled={!ok} onClick={save} title={ok ? "" : "اكمل البيانات المطلوبة"}>
          {edit ? "حفظ التعديلات" : "حفظ الموظف"}
        </button>
        <button className="btn ghost" onClick={onClose}>
          إلغاء
        </button>
      </div>
      {!ok && (
        <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          محتاج الاسم والوظيفة والهاتف والبريد قبل الحفظ. الكود بييتولّد تلقائيًا.
        </div>
      )}
    </Modal>
  );
}