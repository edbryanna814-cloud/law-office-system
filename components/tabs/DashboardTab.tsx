"use client";

import { I, Ico } from "@/components/ui/icons";
import { Stat } from "@/components/ui/shared";
import { fmtSessionDate, fmtSessionTime } from "@/lib/format";
import type { CaseData, SessionData, TransactionData } from "@/types";

const fmt = (n: number) => n.toLocaleString("ar-EG");
const MONTHS = ["1", "2", "3", "4", "5", "6", "7", "8"]
  .map((m, i) => {
    const dt = new Date();
    dt.setMonth(dt.getMonth() - (7 - i));
    return { key: dt.toISOString().slice(0, 7), label: dt.toLocaleDateString("ar-EG", { month: "short" }) };
  });

export function DashboardTab({
  cases,
  sessions,
  transactions,
  goSessions,
  onOpenCase,
}: {
  cases: CaseData[];
  sessions: SessionData[];
  transactions: TransactionData[];
  goSessions: () => void;
  onOpenCase: (c: CaseData) => void;
}) {
  const active = cases.filter((c) => !c.archived);
  const closed = cases.filter((c) => c.archived || c.status === "مغلقة");
  const total = cases.length;
  const today = new Date().toISOString().slice(0, 10);
  const nextCount = sessions.filter((s) => s.d && s.d >= today).length;
  const income = transactions.filter((t) => t.dir === "in").reduce((a, b) => a + b.amt, 0);
  const spent = transactions.filter((t) => t.dir === "out").reduce((a, b) => a + b.amt, 0);
  const balance = income - spent;

  const byType = ["مدني", "تجاري", "عمالي", "جنائي", "عقاري"]
    .map((t) => ({ l: t, v: active.filter((c) => c.type === t).length }))
    .filter((d) => d.v > 0);
  const typeTotal = byType.reduce((a, b) => a + b.v, 0) || 1;

  const colors = ["#2E8BFF", "#2DD4BF", "#E3B34A", "#FF8296", "#8A97AE"];
  const bars = MONTHS.map((m) => ({ ...m, h: Math.max(6, sessions.filter((s) => (s.d ?? "").slice(0, 7) === m.key).length * 25) }));
  const maxH = Math.max(...bars.map((b) => b.h), 1);
  let acc = 0;

  const upcoming = [...sessions].filter((s) => s.d).sort((a, b) => a.d.localeCompare(b.d)).slice(0, 4);

  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
        <Stat hi label="إجمالي القضايا" value={fmt(total)} foot={"+سجلّ " + active.filter((c) => c.status === "نشطة").length + " نشطة"} />
        <Stat label="قضايا نشطة" value={fmt(active.filter((c) => c.status === "نشطة").length)} foot={nextCount + " جلسات قادمة"} tone="teal" />
        <Stat hi label="قضايا مغلقة" value={fmt(closed.length)} foot="المؤرشفة والمغلقة" />
        <Stat label="رصيد العهدة" value={fmt(balance) + " ج"} foot={"محصّل " + fmt(income)} tone="gold" />
      </div>

      <div className="grid dash-charts">
        <div className="card">
          <h3>الجلسات شهريًا (آخر ٨ أشهر)</h3>
          <svg viewBox="0 0 340 150" style={{ width: "100%", height: 170 }}>
            {[0, 1, 2, 3].map((i) => (
              <line key={i} x1="8" x2="332" y1={20 + i * 32} y2={20 + i * 32} stroke="rgba(125,155,205,.12)" />
            ))}
            {bars.map((b, i) => {
              const h = Math.round((b.h / maxH) * 100);
              const x = 20 + i * 39;
              return <rect key={i} x={x} y={128 - h} width="16" height={h} rx="5" fill={i % 2 ? "rgba(46,139,255,.35)" : "url(#g1)"} />;
            })}
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#63A8FF" />
                <stop offset="1" stopColor="#1E6FDB" />
              </linearGradient>
            </defs>
            <polyline fill="none" stroke="#2DD4BF" strokeWidth="2.2" points={bars.map((b, i) => `${28 + i * 39},${128 - (b.h / maxH) * 100 - 10}`).join(" ")} />
            {bars.map((b, i) => (
              <text key={i} x={28 + i * 39} y="145" fill="#8A97AE" fontSize="7.5" textAnchor="middle">
                {b.label}
              </text>
            ))}
          </svg>
        </div>

        <div className="card">
          <h3>توزيع أنواع القضايا النشطة</h3>
          <div className="row" style={{ gap: 18, flexWrap: "wrap" }}>
            <svg viewBox="0 0 100 100" width="118" height="118">
              <circle cx="50" cy="50" r="36" fill="none" stroke="#1A2337" strokeWidth="14" />
              {byType.map((d, i) => {
                const len = 2 * Math.PI * 36,
                  seg = (len * d.v) / typeTotal;
                const el = (
                  <circle
                    key={d.l}
                    cx="50"
                    cy="50"
                    r="36"
                    fill="none"
                    stroke={colors[i % colors.length]}
                    strokeWidth="14"
                    strokeDasharray={`${seg} ${len - seg}`}
                    strokeDashoffset={-acc}
                    transform="rotate(-90 50 50)"
                  />
                );
                acc += seg;
                return el;
              })}
              <text x="50" y="54" textAnchor="middle" fill="#E7EDF9" fontSize="13" fontWeight="700">
                {fmt(active.length)}
              </text>
            </svg>
            <div style={{ flex: 1 }}>
              {byType.map((d, i) => (
                <div key={d.l} className="row" style={{ justifyContent: "space-between", marginBottom: 11, fontSize: 13 }}>
                  <span className="row" style={{ gap: 8 }}>
                    <i style={{ width: 9, height: 9, borderRadius: 3, background: colors[i % colors.length], display: "block" }} />
                    {d.l}
                  </span>
                  <span className="muted">{d.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <h3>أقرب الجلسات</h3>
          {upcoming.map((s) => (
            <button key={s.id} className="listrow" style={{ width: "100%", textAlign: "start" }} onClick={goSessions}>
              <span className={"sq pill " + s.tone}>
                <Ico d={I.calendar} size={16} />
              </span>
              <span style={{ flex: 1 }}>
                <b style={{ fontSize: 13.5, fontWeight: 600 }}>{s.t}</b>
                <span className="muted" style={{ display: "block", fontSize: 11.5, marginTop: 3 }}>
                  قضية {s.c} · {s.room}
                </span>
              </span>
              <span className="muted" style={{ fontSize: 12 }}>
                {fmtSessionDate(s.d)}
              </span>
            </button>
          ))}
          {!sessions.length && (
            <div className="muted" style={{ textAlign: "center", padding: 20, fontSize: 12.5 }}>
              مفيش جلسات مسجلة بعد.
            </div>
          )}
        </div>
      </div>
    </>
  );
}