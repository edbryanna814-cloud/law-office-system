"use client";

import { I, Ico } from "@/components/ui/icons";
import { fmtSessionDate, fmtSessionTime } from "@/lib/format";
import type { CaseData, EmployeeData, SessionData, TransactionData } from "@/types";

const waLink = (phone: string) => {
  const d = (phone || "").replace(/\D/g, "");
  if (!d) return "";
  const num = d.startsWith("20") ? d : "20" + d.replace(/^0+/, "");
  return "https://wa.me/" + num;
};

export function EmployeeProfileTab({
  p,
  cases,
  sessions,
  txs,
  onBack,
  onOpenCase,
}: {
  p: EmployeeData;
  cases: CaseData[];
  sessions: SessionData[];
  txs: TransactionData[];
  onBack: () => void;
  onOpenCase: (c: CaseData) => void;
}) {
  const mySessions = sessions.filter((s) => s.lawyer === p.n).sort((a, b) => a.d.localeCompare(b.d));
  const myCases = cases.filter((c) => (c.title + c.client).includes(p.n)).slice(0, 3);
  const done = mySessions.length;
  const myTx = txs.filter((t) => t.who === p.id);
  const custIn = myTx.filter((t) => t.dir === "in").reduce((a, b) => a + b.amt, 0);
  const custOut = myTx.filter((t) => t.dir === "out").reduce((a, b) => a + b.amt, 0);
  const custLeft = custIn - custOut;
  const fmt = (n: number) => n.toLocaleString("ar-EG") + " ج";

  return (
    <>
      <button className="btn ghost sm" onClick={onBack} style={{ alignSelf: "flex-start" }}>
        <span className="row" style={{ gap: 6 }}>
          <Ico d={I.back} size={15} />
          رجوع للفريق
        </span>
      </button>
      <div className="grid" style={{ gridTemplateColumns: "1.2fr 1fr" }}>
        <div className="card glow">
          <div className="row" style={{ gap: 16 }}>
            <span className="avatar" style={{ width: 66, height: 66, fontSize: 24 }}>
              {p.n[0]}
            </span>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{p.n}</div>
              <div className="muted" style={{ marginTop: 4 }}>
                {p.r} · {p.id}
              </div>
            </div>
          </div>
          <div style={{ height: 1, background: "linear-gradient(90deg,transparent,rgba(46,139,255,.6),transparent)", margin: "18px 0" }} />
          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            <a className="btn ghost sm" href={"tel:" + p.phone.replace(/[^\d+]/g, "")}>
              <span className="row" style={{ gap: 7 }}>
                <Ico d={I.phone} size={15} />
                اتصال
              </span>
            </a>
            {waLink(p.phone) && (
              <a className="btn ghost sm" href={waLink(p.phone)} target="_blank" rel="noreferrer">
                <span className="row" style={{ gap: 7 }}>
                  <Ico d={I.chat} size={15} />
                  واتساب
                </span>
              </a>
            )}
            <span className="pill teal">{mySessions.length ? "عنده جلسات مكلف بيها" : "متاح"}</span>
          </div>
        </div>
        <div className="card">
          <h3>الأداء</h3>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <div className="muted" style={{ fontSize: 12 }}>
                قضايا مسندة
              </div>
              <b style={{ fontSize: 20 }}>{p.cases}</b>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 12 }}>
                جلسات مكلف بيها
              </div>
              <b style={{ fontSize: 20 }}>{done}</b>
            </div>
          </div>
        <div className="card">
          <h3>العهدة المالية</h3>
          {myTx.length ? (
            <>
              <div className="row" style={{ justifyContent: "space-between", padding: "11px 2px", borderTop: "1px solid var(--line)", fontSize: 13 }}>
                <span className="muted">استلم (خد)</span>
                <b style={{ color: "var(--teal)" }}>{fmt(custIn)}</b>
              </div>
              <div className="row" style={{ justifyContent: "space-between", padding: "11px 2px", borderTop: "1px solid var(--line)", fontSize: 13 }}>
                <span className="muted">أدى / مصروف</span>
                <b style={{ color: "#FF8296" }}>− {fmt(custOut)}</b>
              </div>
              <div className="row" style={{ justifyContent: "space-between", padding: "11px 2px", borderTop: "1px solid var(--line)", fontSize: 13 }}>
                <span className="muted">الباقي عنده</span>
                <b style={{ color: custLeft < 0 ? "#FF8296" : "var(--teal)" }}>{fmt(custLeft)}</b>
              </div>
            </>
          ) : (
            <div className="muted" style={{ fontSize: 12.5, textAlign: "center", padding: 16 }}>
              مفيش عهدة مالية مسجلة على الموظف ده.
            </div>
          )}
        </div>
      </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="card">
          <h3>جلسات مكلف بيها</h3>
          {mySessions.length ? (
            mySessions.map((s) => (
              <div key={s.id} className="listrow">
                <span className="sq pill blue">
                  <Ico d={I.calendar} size={16} />
                </span>
<span style={{ flex: 1, fontSize: 13 }}>
                    {s.t}
                    <span className="muted" style={{ display: "block", fontSize: 11.5, marginTop: 3 }}>
                      قضية {s.c} · {s.room} · {fmtSessionDate(s.d)} {fmtSessionTime(s.h)}
                    </span>
                  </span>
                <span className={"pill " + s.tone}>{s.tone === "red" ? "عاجلة" : s.tone === "teal" ? "انعقدت" : s.tone === "gold" ? "مؤجلة" : "نشطة"}</span>
              </div>
            ))
          ) : (
            <div className="muted" style={{ textAlign: "center", padding: 20, fontSize: 12.5 }}>
              مفيش جلسات مسندة له.
            </div>
          )}
        </div>
        <div className="card">
          <h3>القضايا المسندة</h3>
          {myCases.length ? (
            myCases.map((c) => (
              <button key={c.id} className="listrow" style={{ width: "100%", textAlign: "start" }} onClick={() => onOpenCase(c)}>
                <span className="sq pill blue">
                  <Ico d={I.gavel} size={16} />
                </span>
                <span style={{ flex: 1, fontSize: 13 }}>
                  {c.title}
                  <span className="muted" style={{ display: "block", fontSize: 11.5, marginTop: 3 }}>
                    {c.id}
                  </span>
                </span>
                <span className="pill teal">{c.status}</span>
              </button>
            ))
          ) : (
            <div className="muted" style={{ textAlign: "center", padding: 20, fontSize: 12.5 }}>
              مفيش قضايا مسندة بالاسم ده.
            </div>
          )}
        </div>
      </div>
    </>
  );
}