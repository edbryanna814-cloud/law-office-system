"use client";

import { useState } from "react";
import { I, Ico } from "@/components/ui/icons";
import type { EmployeeData } from "@/types";

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
              <th>الاسم</th>
              <th>الوظيفة</th>
              <th>الكود</th>
              <th>القضايا المسندة</th>
              <th>الهاتف</th>
              <th>البريد</th>
              <th></th>
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
                <td className="muted">{s.r}</td>
                <td>{s.id}</td>
                <td>
                  <span className="pill blue">{s.cases}</span>
                </td>
                <td className="muted" dir="ltr" style={{ textAlign: "start" }}>
                  {s.phone}
                </td>
                <td className="muted" dir="ltr" style={{ textAlign: "start" }}>
                  {s.mail}
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