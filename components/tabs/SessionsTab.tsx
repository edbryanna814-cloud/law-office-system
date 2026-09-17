"use client";

import { useEffect, useState } from "react";
import { I, Ico, Scales } from "@/components/ui/icons";
import { fmtSessionDate, fmtSessionTime } from "@/lib/format";
import type { SessionData } from "@/types";

export function SessionsTab({
  list,
  onAdd,
  onEdit,
  onDelete,
}: {
  list: SessionData[];
  onAdd: () => void;
  onEdit: (s: SessionData) => void;
  onDelete: (id: string) => void;
}) {
  const [sel, setSel] = useState(0);
  const [reminded, setReminded] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("sessions_reminded") ?? "{}");
    } catch {
      return {};
    }
  });

  const toggleReminded = (id: string) => {
    setReminded((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem("sessions_reminded", JSON.stringify(next));
      return next;
    });
  };

  const [nErr, setNErr] = useState("");

  const enableReminder = async (s: SessionData) => {
    setNErr("");
    if (typeof Notification === "undefined") {
      setNErr("المتصفح لا يدعم الإشعارات.");
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setNErr("اتمنح إذن الإشعارات من إعدادات المتصفح علشان التذكير يشتغل.");
        return;
      }
      toggleReminded(s.id);
      new Notification("تم ضبط تذكير الجلسة", { body: `سنذكرك قبل «${s.t}» بمرات — تأكد إن البرنامج شغال.` });
    } catch {
      setNErr("ما قدرش يطلب إذن الإشعارات.");
    }
  };

  useEffect(() => {
    if (sel >= list.length) setSel(Math.max(0, list.length - 1));
  }, [list.length, sel]);

  const current = list[Math.min(sel, Math.max(0, list.length - 1))];

  const exportAgenda = () => {
    const rows = ["الجلسة,القضية,الدائرة,الموعد,المحامي"]
      .concat(list.map((s) => [s.t, s.c, s.room, `${s.d} ${s.h}`, s.lawyer].join(",")))
      .join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + rows], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "agenda.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const calUrl = (s: SessionData) => {
    const start = new Date(`${s.d}T${s.h}:00`);
    if (Number.isNaN(start.getTime())) return "";
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `جلسة: ${s.t} (قضية ${s.c})`,
      dates: `${fmt(start)}/${fmt(end)}`,
      details: `الدائرة: ${s.room}\nالمحامي: ${s.lawyer}`,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        <div className="card">
          <h3>الجلسات القادمة</h3>
          {list.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setSel(i)}
              className="listrow"
              style={{ width: "100%", textAlign: "start", boxShadow: i === sel ? "var(--glow)" : undefined }}
            >
              <span className={"sq pill " + s.tone}>
                <Ico d={I.gavel} size={16} />
              </span>
              <span style={{ flex: 1 }}>
                <b style={{ fontSize: 14, fontWeight: 600 }}>{s.t}</b>
                <span className="muted" style={{ display: "block", fontSize: 11.5, marginTop: 3 }}>
                  قضية {s.c} · {s.room} · {s.lawyer}
                </span>
              </span>
              <span style={{ textAlign: "center" }}>
                <b style={{ fontSize: 13 }}>{fmtSessionDate(s.d)}</b>
                <span className="muted" style={{ display: "block", fontSize: 11.5, marginTop: 3 }}>
                  {fmtSessionTime(s.h)}
                </span>
              </span>
            </button>
          ))}
          <div className="row" style={{ gap: 10, marginTop: 14 }}>
            <button className="btn" onClick={onAdd}>
              إضافة جلسة
            </button>
            <button className="btn ghost" onClick={exportAgenda}>
              تصدير الأجندة
            </button>
          </div>
        </div>

        <div className="card">
          <h3>تفاصيل التنبيه</h3>
          {list.length ? (
            <>
              <div style={{ textAlign: "center", padding: "10px 0 18px", color: "#63A8FF" }}>
                <Scales size={92} />
              </div>
              {[
                ["الجلسة", current.t],
                ["رقم القضية", current.c],
                ["الدائرة", current.room],
                ["الموعد", fmtSessionDate(current.d) + " — " + fmtSessionTime(current.h)],
                ["المحامي المكلف", current.lawyer],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="row"
                  style={{ justifyContent: "space-between", padding: "11px 2px", borderTop: "1px solid var(--line)", fontSize: 13 }}
                >
                  <span className="muted">{k}</span>
                  <b style={{ fontWeight: 600 }}>{v}</b>
                </div>
              ))}
              <button className="btn block" style={{ marginTop: 16 }} onClick={() => enableReminder(current)}>
                {reminded[current.id] ? "✓ تم ضبط التذكير" : "تذكيري قبلها بيوم"}
              </button>
              {nErr && (
                <p className="muted" style={{ fontSize: 11.5, marginTop: 8, color: "#FFB38A", lineHeight: 1.6 }}>
                  {nErr}
                </p>
              )}
              <a
                className="btn block"
                style={{
                  marginTop: 10,
                  justifyItems: "center",
                  background: "rgba(46,139,255,.12)",
                  border: "1px solid #2E8BFF",
                  color: "#63A8FF",
                }}
                href={calUrl(current) || "#"}
                target="_blank"
                rel="noreferrer"
              >
                أضف لـ Google Calendar
              </a>
              <div className="row" style={{ gap: 8, marginTop: 10 }}>
                <button className="btn ghost" style={{ flex: 1 }} onClick={() => onEdit(current)}>
                  تعديل
                </button>
                <button className="btn ghost" style={{ flex: 1, color: "#FF8296" }} onClick={() => onDelete(current.id)}>
                  حذف
                </button>
              </div>
            </>
          ) : (
            <div className="muted" style={{ textAlign: "center", padding: 30 }}>
              مفيش جلسات بعد. أضف جلسة جديدة.
            </div>
          )}
        </div>
      </div>
    </>
  );
}