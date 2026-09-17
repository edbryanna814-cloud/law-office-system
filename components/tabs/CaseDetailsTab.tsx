"use client";

import { useRef, useState } from "react";
import { I, Ico } from "@/components/ui/icons";
import { fmtSessionDate, fmtSessionTime } from "@/lib/format";
import type { CaseData, DocumentData, SessionData } from "@/types";

export function CaseDetailsTab({
  c,
  docs,
  sessions,
  onUpload,
  onLatex,
  onEditCase,
  onDelete,
  onEditTex,
  onBack,
}: {
  c: CaseData;
  docs: DocumentData[];
  sessions: SessionData[];
  onUpload: (files: FileList | File[], caseId: string) => void;
  onLatex: (name: string, latex: string, caseId: string) => void;
  onEditCase: (c: CaseData) => void;
  onDelete: (id: string) => void;
  onEditTex: (d: DocumentData) => void;
  onBack: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [notes, setNotes] = useState(c.notes ?? "");
  const [saved, setSaved] = useState(false);
  const [texModal, setTexModal] = useState(false);
  const [texName, setTexName] = useState("");
  const [texBody, setTexBody] = useState("");
  const caseDocs = docs.filter((d) => d.c === c.id);
  const caseSessions = sessions.filter((s) => s.c === c.id).sort((a, b) => a.d.localeCompare(b.d));

  const saveNotes = () => {
    onEditCase({ ...c, notes });
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  return (
    <>
      <button className="btn ghost sm" onClick={onBack} style={{ alignSelf: "flex-start" }}>
        <span className="row" style={{ gap: 6 }}>
          <Ico d={I.back} size={15} />
          رجوع للسجل
        </span>
      </button>
      <div className="grid" style={{ gridTemplateColumns: "1.15fr 1fr" }}>
        <div className="card glow">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h3 style={{ margin: 0 }}>{c.title}</h3>
            <span className="pill teal">{c.status}</span>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 18 }}>
            {[
              ["رقم القضية", c.id],
              ["المحكمة", c.court],
              ["الموكل", c.client],
              ["نوع القضية", c.type],
              ["قيمة المطالبة", c.value + " ج.م"],
              ["الجلسة القادمة", c.next],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="muted" style={{ fontSize: 12 }}>
                  {k}
                </div>
                <div style={{ marginTop: 5, fontSize: 14, fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>جلسات القضية</h3>
          {caseSessions.length ? (
            caseSessions.map((s) => (
              <div key={s.id} className="row" style={{ alignItems: "flex-start", gap: 13 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span className="sq" style={{ width: 26, height: 26, flex: "0 0 26px", borderRadius: 9, background: "rgba(45,212,191,.16)", color: "#2DD4BF" }}>
                    <Ico d={I.check} size={14} />
                  </span>
                  {s.id !== caseSessions[caseSessions.length - 1].id && <span style={{ width: 2, height: 26, background: "rgba(125,155,205,.18)" }} />}
                </div>
                <div style={{ paddingBottom: 12 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{s.t}</div>
                  <div className="muted" style={{ fontSize: 11.5, marginTop: 3 }}>
                    {fmtSessionDate(s.d)} {fmtSessionTime(s.h)} · {s.room} · {s.lawyer}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="muted" style={{ fontSize: 12.5, textAlign: "center", padding: 14 }}>
              مفيش جلسات مسجلة على القضية دي.
            </div>
          )}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
        <div className="card">
          <h3>المستندات المرفقة</h3>
          {caseDocs.length === 0 && (
            <div className="muted" style={{ fontSize: 12.5, textAlign: "center", padding: 14 }}>
              مفيش مستندات لسه. ارفع ملف.
            </div>
          )}
          {caseDocs.map((d) => (
            <div key={d.id} className="listrow">
              <span className="sq pill blue">
                <Ico d={I.file} size={16} />
              </span>
              <span style={{ flex: 1, fontSize: 13 }}>
                {d.n}
                <span className="muted" style={{ display: "block", fontSize: 11.5, marginTop: 3 }}>
                  {d.s}
                  {d.tex && <span className="pill gold" style={{ marginInlineStart: 6, fontSize: 10 }}>LaTeX</span>}
                </span>
              </span>
              <span className="row" style={{ gap: 4 }}>
                {d.tex && (
                  <button className="btn ghost sm" onClick={() => onEditTex(d)} title="تعديل LaTeX">
                    <Ico d={I.gear} size={14} />
                  </button>
                )}
                <a className="btn ghost sm" href={`/api/files/${d.id}`} target="_blank" rel="noopener noreferrer" title="تنزيل الملف الأصلي (نسخة احتياطية)">
                  <span className="row" style={{ gap: 5 }}>
                    <Ico d={I.file} size={13} />
                    <span style={{ fontSize: 11 }}>الأصلي</span>
                  </span>
                </a>
                <button className="btn ghost sm" onClick={() => onDelete(d.id)}>
                  <Ico d={I.x} size={14} />
                </button>
              </span>
            </div>
          ))}
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={(e) => {
              if (e.target.files) onUpload(e.target.files, c.id);
              e.target.value = "";
            }}
          />
          <button className="btn block sm" style={{ marginTop: 4 }} onClick={() => inputRef.current?.click()}>
            رفع مستند
          </button>
          <button className="btn ghost block sm" style={{ marginTop: 8 }} onClick={() => setTexModal(true)}>
            رفع LaTeX يدويًا
          </button>
        </div>

        {texModal && (
          <div className="overlay" onClick={() => setTexModal(false)}>
            <div className="modal" style={{ maxWidth: 560, maxHeight: "82vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ marginBottom: 6 }}>رفع LaTeX يدويًا — {c.title}</h3>
              <div className="muted" style={{ fontSize: 12, marginBottom: 16 }}>
                استخدمه لما الـ OCR مقراش الملف — اكتب النص هنا ويتم حفظه كمستند على القضية.
              </div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 5 }}>اسم المستند</label>
              <input className="input" style={{ marginBottom: 12 }} value={texName} onChange={(e) => setTexName(e.target.value)} placeholder="مثال: محضر جلسة" />
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 5 }}>نص المستند (عادي أو LaTeX)</label>
              <textarea
                className="input"
                style={{ minHeight: 220, direction: "rtl", lineHeight: 2, whiteSpace: "pre-wrap" }}
                value={texBody}
                onChange={(e) => setTexBody(e.target.value)}
                placeholder={"اكتب نص المستند هنا...\n\nلو كتبت نصًا عاديًا يتحول لـ LaTeX تلقائيًا."}
              />
              <div className="row" style={{ justifyContent: "space-between", marginTop: 16 }}>
                <button className="btn sm muted" onClick={() => setTexModal(false)}>إلغاء</button>
                <button
                  className="btn sm"
                  disabled={!texBody.trim()}
                  onClick={() => {
                    onLatex(texName.trim(), texBody, c.id);
                    setTexModal(false);
                    setTexName("");
                    setTexBody("");
                  }}
                >
                  حفظ المستند
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="card">
          <h3>ملاحظات القضية</h3>
          <textarea
            className="input"
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="تفاصيل القضية وملاحظات الجلسات..."
          />
          <button className="btn block sm" style={{ marginTop: 12 }} onClick={saveNotes}>
            {saved ? "تم الحفظ ✓" : "حفظ الملاحظة"}
          </button>
        </div>
        <div className="card">
          <h3>معلومات سريعة</h3>
          <div className="row" style={{ justifyContent: "space-between", padding: "11px 2px", borderTop: "1px solid var(--line)", fontSize: 13 }}>
            <span className="muted">إجمالي الجلسات</span>
            <b>{caseSessions.length}</b>
          </div>
          <div className="row" style={{ justifyContent: "space-between", padding: "11px 2px", borderTop: "1px solid var(--line)", fontSize: 13 }}>
            <span className="muted">إجمالي المستندات</span>
            <b>{caseDocs.length}</b>
          </div>
          <div className="row" style={{ justifyContent: "space-between", padding: "11px 2px", borderTop: "1px solid var(--line)", fontSize: 13 }}>
            <span className="muted">حالة القضية</span>
            <b>{c.archived ? "مؤرشفة" : c.status}</b>
          </div>
        </div>
      </div>
    </>
  );
}