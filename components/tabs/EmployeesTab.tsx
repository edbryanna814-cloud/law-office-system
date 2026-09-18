"use client";

import { useState } from "react";
import { I, Ico } from "@/components/ui/icons";
import type { EmployeeData } from "@/types";

const waLink = (phone: string) => {
  const d = (phone || "").replace(/\D/g, "");
  if (!d) return "";
  const num = d.startsWith("20") ? d : "20" + d.replace(/^0+/, "");
  return "https://wa.me/" + num;
};

export function EmployeesTab({
  list,
  onOpen,
  onAdd,
  onEdit,
  onDelete,
}: {
  list: EmployeeData[];
  onOpen: (e: EmployeeData) => void;
  onAdd: () => void;
  onEdit: (e: EmployeeData) => void;
  onDelete: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = list.filter((s) => ((s.n ?? "") + (s.r ?? "") + (s.id ?? "")).includes(q));

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 16, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>فريق المكتب</h3>
        <div className="search" style={{ marginInlineStart: "auto" }}>
          <Ico d={I.search} size={16} />
          <input placeholder="ابحث بالاسم أو الكود" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="btn" onClick={onAdd}>
          إضافة موظف
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: "100%" }}>الاسم</th>
              <th>الوظيفة</th>
              <th>الكود</th>
              <th>القضايا المسندة</th>
              <th>الهاتف</th>
              <th>البريد</th>
              <th>تواصل</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td onClick={() => onOpen(s)}>
                  <span className="row" style={{ gap: 10 }}>
                    <span className="avatar" style={{ width: 30, height: 30, fontSize: 11 }}>
                      {s.n?.[0] ?? "?"}
                    </span>
                    <b style={{ fontWeight: 600 }}>{s.n ?? "-"}</b>
                  </span>
                </td>
                <td className="muted" style={{ whiteSpace: "nowrap" }}>{s.r}</td>
                <td style={{ whiteSpace: "nowrap" }}>{s.id}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <span className="pill blue">{s.cases}</span>
                </td>
                <td className="muted" dir="rtl" style={{ textAlign: "end", whiteSpace: "nowrap" }}>
                  {s.phone}
                </td>
                <td className="muted" dir="rtl" style={{ textAlign: "end", whiteSpace: "nowrap" }}>
                  {s.mail}
                </td>
                <td>
                  <span className="row" style={{ gap: 4 }}>
                    {s.phone && (
                      <a
                        className="icon-btn"
                        href={"tel:" + s.phone.replace(/[^\d+]/g, "")}
                        aria-label="اتصال"
                        style={{ width: 28, height: 28, color: "#2DD4BF" }}
                      >
                        <Ico d={I.phone} size={14} />
                      </a>
                    )}
                    {waLink(s.phone) && (
                      <a
                        className="icon-btn"
                        href={waLink(s.phone)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="واتساب"
                        style={{ width: 28, height: 28, color: "#63A8FF" }}
                      >
                        <Ico d={I.chat} size={14} />
                      </a>
                    )}
                  </span>
                </td>
                <td>
                  <span className="row" style={{ gap: 4 }}>
                    <button className="icon-btn" onClick={() => onEdit(s)} aria-label="تعديل" style={{ width: 28, height: 28 }}>
                      <Ico d={I.gear} size={14} />
                    </button>
                    <button className="icon-btn" onClick={() => onDelete(s.id)} aria-label="حذف" style={{ width: 28, height: 28, color: "#FF8296" }}>
                      <Ico d={I.x} size={14} />
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}