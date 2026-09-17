"use client";

import { useState } from "react";
import { I, Ico } from "@/components/ui/icons";
import type { CaseData } from "@/types";

const tone = (s: string) =>
  s === "نشطة" ? "teal" : s === "مؤجلة" ? "gold" : s === "مغلقة" ? "blue" : "red";

export function CasesTab({
  list,
  onOpen,
  onAdd,
  onEdit,
  onArchive,
  onDelete,
}: {
  list: CaseData[];
  onOpen: (c: CaseData) => void;
  onAdd: () => void;
  onEdit: (c: CaseData) => void;
  onArchive: (c: CaseData) => void;
  onDelete: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [f, setF] = useState("الكل");
  const tabs = ["الكل", "نشطة", "مؤجلة", "مغلقة", "المؤرشفة"];
  const filtered = list.filter(
    (c) =>
      (f === "المؤرشفة" ? !!c.archived : c.archived ? false : f === "الكل" || c.status === f) &&
      (c.title + c.client + c.id).includes(q)
  );

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 16, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>سجل القضايا</h3>
        <div className="tabs" style={{ marginInlineStart: 16 }}>
          {tabs.map((x) => (
            <button key={x} className={f === x ? "on" : ""} onClick={() => setF(x)}>
              {x}
            </button>
          ))}
        </div>
        <div className="search" style={{ marginInlineStart: "auto" }}>
          <Ico d={I.search} size={16} />
          <input placeholder="ابحث برقم القضية أو الموكل" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="btn" onClick={onAdd}>
          <span className="row" style={{ gap: 7 }}>
            <Ico d={I.plus} size={16} />
            قضية جديدة
          </span>
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>رقم القضية</th>
              <th>الموضوع</th>
              <th>الموكل</th>
              <th>المحكمة</th>
              <th>النوع</th>
              <th>الحالة</th>
              <th>الجلسة القادمة</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} style={{ cursor: "default" }}>
                <td style={{ fontWeight: 600 }} onClick={() => onOpen(c)}>
                  {c.id}
                </td>
                <td onClick={() => onOpen(c)}>{c.title}</td>
                <td className="muted">{c.client}</td>
                <td className="muted">{c.court}</td>
                <td>
                  <span className="pill blue">{c.type}</span>
                </td>
                <td>
                  <span className={"pill " + tone(c.status)}>{c.archived ? "مؤرشفة" : c.status}</span>
                </td>
                <td className="muted">{c.next}</td>
                <td>
                  <span className="row" style={{ gap: 4 }}>
                    <button className="icon-btn" onClick={() => onEdit(c)} aria-label="تعديل" style={{ width: 28, height: 28 }}>
                      <Ico d={I.gear} size={14} />
                    </button>
                    <button
                      className="icon-btn"
                      onClick={() => onArchive(c)}
                      aria-label={c.archived ? "استرجاع" : "أرشفة"}
                      style={{ width: 28, height: 28, color: "var(--gold)" }}
                    >
                      <Ico d={I.file} size={14} />
                    </button>
                    <button
                      className="icon-btn"
                      onClick={() => onDelete(c.id)}
                      aria-label="حذف"
                      style={{ width: 28, height: 28, color: "#FF8296" }}
                    >
                      <Ico d={I.x} size={14} />
                    </button>
                  </span>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={8} className="muted" style={{ textAlign: "center", padding: 34 }}>
                  مفيش قضايا مطابقة. جرّب كلمة تانية أو أضف قضية جديدة.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}