"use client";

import { useMemo, useState } from "react";
import { I, Ico } from "@/components/ui/icons";
import type { CaseData, DocumentData, EmployeeData } from "@/types";

type Result = { k: string; t: string; s: string; case?: CaseData; emp?: EmployeeData; doc?: DocumentData };

export function SearchTab({
  cases,
  staff,
  docs,
  onOpen,
  onOpenStaff,
}: {
  cases: CaseData[];
  staff: EmployeeData[];
  docs: DocumentData[];
  onOpen: (c: CaseData) => void;
  onOpenStaff: (e: EmployeeData) => void;
}) {
  const [q, setQ] = useState("");
  const res = useMemo<Result[]>(() => {
    if (!q.trim()) return [];
    const t = q.trim();
    return [
      ...cases.filter((c) => (c.title + c.client + c.id + c.court).includes(t)).map((c) => ({
        k: "قضية",
        t: c.title,
        s: c.id + " · " + c.court,
        case: c,
      })),
      ...staff.filter((s) => (s.n + s.r).includes(t)).map((s) => ({ k: "موظف", t: s.n, s: s.r, emp: s })),
      ...docs.filter((d) => (d.n + " " + (d.tex ?? "")).includes(t)).map((d) => ({ k: "مستند", t: d.n, s: d.s, doc: d })),
    ];
  }, [q, cases, staff, docs]);

  return (
    <div className="grid" style={{ gridTemplateColumns: "1.5fr 1fr" }}>
      <div className="card">
        <h3>ابحث في المكتب كله</h3>
        <div className="search" style={{ padding: "13px 16px" }}>
          <Ico d={I.search} size={18} />
          <input
            autoFocus
            placeholder="اكتب رقم قضية، اسم موكل، أو اسم مستند"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {res.map((r, i) => (
          <button
            key={i}
            className="listrow"
            style={{ width: "100%", textAlign: "start" }}
            onClick={() => (r.case ? onOpen(r.case) : r.emp ? onOpenStaff(r.emp) : null)}
          >

            <span className="sq pill blue">
              {r.k === "قضية" ? <Ico d={I.gavel} size={16} /> : r.k === "موظف" ? <Ico d={I.users} size={16} /> : <Ico d={I.file} size={16} />}
            </span>
            <span style={{ flex: 1 }}>
              <b style={{ fontSize: 13.5, fontWeight: 600 }}>{r.t}</b>
              <span className="muted" style={{ display: "block", fontSize: 11.5, marginTop: 3 }}>
                {r.s}
              </span>
            </span>
            <span className="muted" style={{ fontSize: 12 }}>
              {r.k}
            </span>
          </button>
        ))}
        {q && !res.length && (
          <div className="muted" style={{ textAlign: "center", padding: 30, fontSize: 13.5 }}>
            مفيش نتائج لـ «{q}». جرّب رقم القضية أو جزء من اسم الموكل.
          </div>
        )}
        {!q && (
          <div className="muted" style={{ textAlign: "center", padding: 30, fontSize: 13.5 }}>
            ابدأ الكتابة وهتظهر النتائج من القضايا والفريق والمستندات مرة واحدة.
          </div>
        )}
      </div>
      <div className="card">
        <h3>لمحة سريعة</h3>
        <div className="row" style={{ justifyContent: "space-between", padding: "11px 2px", borderTop: "1px solid var(--line)", fontSize: 13 }}>
          <span className="muted">عدد القضايا</span>
          <b>{cases.length}</b>
        </div>
        <div className="row" style={{ justifyContent: "space-between", padding: "11px 2px", borderTop: "1px solid var(--line)", fontSize: 13 }}>
          <span className="muted">الموظفون</span>
          <b>{staff.length}</b>
        </div>
        <div className="row" style={{ justifyContent: "space-between", padding: "11px 2px", borderTop: "1px solid var(--line)", fontSize: 13 }}>
          <span className="muted">المستندات</span>
          <b>{docs.length}</b>
        </div>
      </div>
    </div>
  );
}