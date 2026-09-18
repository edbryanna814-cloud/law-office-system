"use client";

import { useState } from "react";
import { I, Ico } from "@/components/ui/icons";
import { Stat } from "@/components/ui/shared";
import { AddTxModal } from "@/components/finance/AddTxModal";
import type { CaseData, EmployeeData, TransactionData } from "@/types";

export function FinanceTab({
  list,
  onAdd,
  onDelete,
  cases,
  staff,
}: {
  list: TransactionData[];
  onAdd: (t: TransactionData) => void;
  onDelete: (id: string) => void;
  cases: CaseData[];
  staff: EmployeeData[];
}) {
  const [adding, setAdding] = useState<TransactionData | "new" | false>(false);
  const income = list.filter((t) => t.dir === "in").reduce((a, b) => a + b.amt, 0);
  const spent = list.filter((t) => t.dir === "out").reduce((a, b) => a + b.amt, 0);
  const pct = Math.min(100, Math.round((spent / Math.max(income, 1)) * 100));
  const fmt = (n?: number) => (n ?? 0).toLocaleString("ar-EG");
  const totalCases = cases.length;

  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: "1.5fr 1fr" }}>
        <div className="card">
          <h3>حركة العهدة المالية</h3>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>البيان</th>
                  <th>النوع</th>
                  <th>المبلغ</th>
                  <th>التاريخ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.map((t) => (
                  <tr key={t.id}>
                    <td>{t.d}</td>
                    <td>
                      <span className={"pill " + (t.dir === "in" ? "teal" : "red")}>{t.t}</span>
                    </td>
                    <td style={{ fontWeight: 600, color: t.dir === "in" ? "var(--teal)" : "#FF8296" }}>
                      {t.dir === "in" ? "+" : "−"} {fmt(t.amt)} ج
                    </td>
                    <td className="muted">{t.date}</td>
                    <td>
                      <span className="row" style={{ gap: 4 }}>
                        <button className="icon-btn" onClick={() => setAdding(t)} aria-label="تعديل" style={{ color: "#63A8FF" }}>
                          <Ico d={I.gear} size={14} />
                        </button>
                        <button className="icon-btn" onClick={() => onDelete(t.id)} aria-label="حذف" style={{ color: "#FF8296" }}>
                          <Ico d={I.x} size={14} />
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
                {!list.length && (
                  <tr>
                    <td colSpan={5} className="muted" style={{ textAlign: "center", padding: 24 }}>
                      مفيش عمليات بعد. سجّل أول عملية.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <Stat hi label="إجمالي المحصّل" value={fmt(income) + " ج"} foot="التحصيلات" />
            <Stat label="الرصيد المتبقي" value={fmt(income - spent) + " ج"} foot="متاح" tone="teal" />
          </div>
          <div className="card">
            <h3>ملخص المصروفات</h3>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
              <b style={{ fontSize: 24 }}>{fmt(spent)} ج</b>
              <span className="pill gold">{pct}٪ من المحصّل</span>
            </div>
            <div style={{ height: 9, borderRadius: 99, background: "#1A2337", overflow: "hidden" }}>
              <div
                style={{
                  width: pct + "%",
                  height: "100%",
                  borderRadius: 99,
                  background: "linear-gradient(90deg,#2DD4BF,#2E8BFF)",
                  boxShadow: "0 0 14px rgba(46,139,255,.8)",
                }}
              />
            </div>
            <div className="row" style={{ justifyContent: "space-between", marginTop: 14, fontSize: 12.5 }}>
              <span className="muted">القضايا المقيّدة</span>
              <b>{fmt(totalCases)}</b>
            </div>
            <button className="btn block" style={{ marginTop: 16 }} onClick={() => setAdding("new")}>
              تسجيل عملية جديدة
            </button>
          </div>
        </div>
      </div>
      {adding !== false && <AddTxModal staff={staff} edit={adding === "new" ? undefined : adding} onClose={() => setAdding(false)} onAdd={onAdd} />}
    </>
  );
}