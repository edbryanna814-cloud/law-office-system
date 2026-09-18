"use client";

import { useState } from "react";
import { I, Ico } from "@/components/ui/icons";
import { Modal } from "@/components/ui/shared";
import type { CaseData } from "@/types";

const COURTS = ["محكمة شمال القاهرة", "محكمة الجيزة", "محكمة العمل", "محكمة مصر الجديدة", "محكمة النقض", "محكمة الاستئناف"];

export function AddCaseModal({
  onClose,
  onSave,
  edit,
  startArchived,
}: {
  onClose: () => void;
  onSave: (c: CaseData) => void;
  edit?: CaseData;
  startArchived?: boolean;
}) {
  const [f, setF] = useState({
    id: edit?.id ?? "",
    title: edit?.title ?? "",
    client: edit?.client ?? "",
    court: edit?.court ?? "محكمة شمال القاهرة",
    type: edit?.type ?? "مدني",
    date: "",
    next: edit?.next && edit.next !== "—" ? edit.next : "",
    value: edit?.value && edit.value !== "0" ? String(Number(edit.value.replace(/,/g, ""))) : "",
    desc: "",
  });
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const ok = Boolean(f.id && f.title && f.client);

  const save = () => {
    if (!ok) return;
    onSave({
      id: f.id,
      title: f.title,
      client: f.client,
      court: f.court,
      type: f.type as CaseData["type"],
      status: edit?.status ?? (startArchived ? "مغلقة" : "نشطة"),
      archived: startArchived ?? edit?.archived,
      next: f.next || f.date || "—",
      value: f.value ? Number(f.value).toLocaleString("en-US") : "0",
    });
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <div className="row" style={{ marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 19 }}>{edit ? "تعديل القضية" : "إضافة قضية جديدة"}</h3>
        <button className="icon-btn" style={{ marginInlineStart: "auto" }} onClick={onClose} aria-label="إغلاق">
          <Ico d={I.x} />
        </button>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="field">
          <label>رقم القضية</label>
          <input className="input" placeholder="مثال: 2026/145" value={f.id} onChange={(e) => set("id", e.target.value)} />
        </div>
        <div className="field">
          <label>اسم الموكل</label>
          <input className="input" placeholder="الاسم كما في التوكيل" value={f.client} onChange={(e) => set("client", e.target.value)} />
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>موضوع القضية</label>
          <input className="input" placeholder="وصف مختصر للنزاع" value={f.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div className="field">
          <label>المحكمة</label>
          <select
            className="input"
            value={COURTS.includes(f.court) ? f.court : "__other"}
            onChange={(e) => set("court", e.target.value === "__other" ? "" : e.target.value)}
          >
            {COURTS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value="__other">محكمة أخرى (اكتبها)...</option>
          </select>
          {!COURTS.includes(f.court) && (
            <input className="input" style={{ marginTop: 8 }} placeholder="اكتب اسم المحكمة الجديدة" value={f.court} onChange={(e) => set("court", e.target.value)} />
          )}
        </div>
        <div className="field">
          <label>نوع القضية</label>
          <select className="input" value={f.type} onChange={(e) => set("type", e.target.value)}>
            <option>مدني</option>
            <option>تجاري</option>
            <option>عمالي</option>
            <option>جنائي</option>
            <option>عقاري</option>
          </select>
        </div>
        <div className="field">
          <label>الجلسة القادمة</label>
          <input className="input" type="date" value={f.date} onChange={(e) => set("date", e.target.value)} />
        </div>
        <div className="field">
          <label>قيمة المطالبة (ج.م)</label>
          <input className="input" inputMode="numeric" placeholder="0" value={f.value} onChange={(e) => set("value", e.target.value)} />
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>ملاحظات</label>
          <textarea className="input" rows={3} value={f.desc} onChange={(e) => set("desc", e.target.value)} placeholder="أي تفاصيل مهمة عن الدعوى" />
        </div>
      </div>
      <div className="row" style={{ gap: 10, marginTop: 18 }}>
        <button className="btn" style={{ flex: 1 }} disabled={!ok} onClick={save} title={ok ? "" : "اكتب رقم القضية والموضوع واسم الموكل"}>
          {edit ? "حفظ التعديلات" : "حفظ القضية"}
        </button>
        <button className="btn ghost" onClick={onClose}>
          إلغاء
        </button>
      </div>
      {!ok && (
        <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          محتاج رقم القضية والموضوع واسم الموكل قبل الحفظ.
        </div>
      )}
    </Modal>
  );
}