"use client";

import { useState } from "react";
import { I, Ico } from "@/components/ui/icons";
import type { CaseData } from "@/types";

const tone = (s: string) =>
  s === "نشطة" ? "teal" : s === "مؤجلة" ? "gold" : s === "مغلقة" ? "blue" : "red";

export function ArchiveTab({
  list,
  onOpen,
  onRestore,
  onDelete,
  onAdd,
}: {
  list: CaseData[];
  onOpen: (c: CaseData) => void;
  onRestore: (c: CaseData) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  const [q, setQ] = useState("");
  const archived = list.filter((c) => c.archived && (c.title + c.client + c.id).includes(q));

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 16, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>الأرشيف</h3>
        <span className="pill blue" style={{ marginInlineStart: 10 }}>
          {archived.length} قضية هدفها في الأرشيف
        </span>
        <div className="search" style={{ marginInlineStart: "auto" }}>
          <Ico d={I.search} size={16} />
          <input placeholder="ابحث في الأرشيف" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="btn sm" style={{ marginInlineStart: 8 }} onClick={onAdd}>
          + قضية جديدة (مؤرشفة)
        </button>
      </div>
      {archived.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48 }}>
          <div style={{ color: "rgba(125,155,205,.5)", display: "grid", placeItems: "center", marginBottom: 12 }}>
            <Ico d={I.file} size={40} />
          </div>
          <div className="muted" style={{ fontSize: 14 }}>
            الأرشيف فاضي. أرشفة قضية من صفحة «القضايا» بهتظهر هنا.
          </div>
        </div>
      ) : (
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {archived.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600, cursor: "pointer" }} onClick={() => onOpen(c)}>
                    {c.id}
                  </td>
                  <td style={{ cursor: "pointer" }} onClick={() => onOpen(c)}>
                    {c.title}
                  </td>
                  <td className="muted">{c.client}</td>
                  <td className="muted">{c.court}</td>
                  <td>
                    <span className="pill blue">{c.type}</span>
                  </td>
                  <td>
                    <span className={"pill " + tone(c.status)}>{c.archived ? "مؤرشفة" : c.status}</span>
                  </td>
                  <td>
                    <span className="row" style={{ gap: 4 }}>
                      <button className="icon-btn" onClick={() => onRestore(c)} aria-label="استرجاع" style={{ width: 28, height: 28 }}>
                        <Ico d={I.back} size={14} />
                      </button>
                      <button
                        className="icon-btn"
                        onClick={() => onDelete(c.id)}
                        aria-label="حذف نهائي"
                        style={{ width: 28, height: 28, color: "#FF8296" }}
                      >
                        <Ico d={I.x} size={14} />
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}