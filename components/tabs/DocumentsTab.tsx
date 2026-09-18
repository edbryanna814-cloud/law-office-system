"use client";

import { useEffect, useRef, useState } from "react";
import { I, Ico } from "@/components/ui/icons";
import { Drop } from "@/components/ui/Drop";
import type { CaseData, DocKind, DocumentData, TemplateData } from "@/types";
import { splitDots, fillTemplate } from "@/lib/templates";

const color = (k: DocKind) => (k === "pdf" ? "#63A8FF" : k === "doc" ? "#E3B34A" : "#2DD4BF");

function pretty(latex: string) {
  return latex
    .replace(/\\section\*\{([^}]*)\}/g, "\n\n$1\n\n")
    .replace(/\\medskip|\n{3,}/g, "\n\n")
    .replace(/\\(?:textbf|emph|textit|texttt)\{([^}]*)\}/g, "$1")
    .replace(/\\textbackslash\{\}/g, "\\")
    .replace(/\\[a-zA-Z]+\{?/g, "")
    .replace(/[{}]/g, "")
    .trim();
}

const genId = () => "TPL-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e6).toString(36);

export function DocumentsTab({
  list,
  cases,
  templates,
  onUpload,
  onLatex,
  onDelete,
  onEditTex,
  onAddTemplate,
  onEditTemplate,
  onDeleteTemplate,
}: {
  list: DocumentData[];
  cases: CaseData[];
  templates: TemplateData[];
  onUpload: (files: FileList | File[], caseId?: string) => void;
  onLatex: (name: string, latex: string, caseId?: string) => void;
  onDelete: (id: string) => void;
  onEditTex: (d: DocumentData) => void;
  onAddTemplate: (t: TemplateData) => void;
  onEditTemplate: (t: TemplateData) => void;
  onDeleteTemplate: (id: string) => void;
}) {
  const [hot, setHot] = useState(false);
  const [sel, setSel] = useState(0);
  const inp = useRef<HTMLInputElement>(null);
  const [caseId, setCaseId] = useState("");
  const [tplId, setTplId] = useState(templates[0]?.id ?? "");
  const [vals, setVals] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [editTpl, setEditTpl] = useState<TemplateData | "new" | null>(null);
  const [delTpl, setDelTpl] = useState<TemplateData | null>(null);
  const [texModal, setTexModal] = useState(false);
  const [texName, setTexName] = useState("");
  const [texBody, setTexBody] = useState("");

  useEffect(() => {
    if (!caseId && cases.length) setCaseId(cases[0].id);
  }, [cases, caseId]);

  const attachCase = cases.find((c) => c.id === caseId);
  const noCase = !attachCase;

  const tpl = templates.find((t) => t.id === tplId) ?? templates[0];
  const fields = tpl ? splitDots(tpl.body).filter((p) => p.kind === "dot") : [];

  const lat = !tpl
    ? ""
    : "\\documentclass[12pt,a4paper]{article}\n\\usepackage{fontspec}\n\\usepackage[bidi=basic]{babel}\n\\usepackage{geometry}\\geometry{margin=2.5cm}\n\\begin{document}\n" +
      fillTemplate(tpl.body, vals)
        .split("\n")
        .map((l) => (l.trim() ? l.replace(/[&%$#_{}~^]/g, (c) => "\\" + c) : "\\medskip"))
        .join("\n") +
      "\n\\end{document}";

  const prettyText = tpl ? pretty(lat) : "";

  const pickTpl = (id: string) => {
    setTplId(id);
    const t = templates.find((x) => x.id === id);
    setVals(new Array(t ? splitDots(t.body).filter((p) => p.kind === "dot").length : 0).fill(""));
  };

  const download = (name: string, mime: string, content: string) => {
    const b = new Blob([content], { type: mime + ";charset=utf-8" });
    const u = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = u;
    a.download = name;
    a.click();
    URL.revokeObjectURL(u);
  };

  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr 1.4fr" }}>
      <div style={{ display: "grid", gap: 14 }}>
        <div className="card">
          <h3>رفع مستند</h3>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 5 }}>القضية المرتبطة</label>
          <Drop
            value={caseId}
            onChange={setCaseId}
            disabled={!cases.length}
            placeholder={cases.length ? "اختر القضية..." : "مفيش قضايا — اعمل قضية الأول"}
            options={cases.map((c) => ({ value: c.id, label: c.id + " — " + c.title }))}
          />
          <div
            className={"drop" + (hot ? " hot" : "")}
            onDragOver={(e) => {
              e.preventDefault();
              setHot(true);
            }}
            onDragLeave={() => setHot(false)}
            onDrop={(e) => {
              e.preventDefault();
              setHot(false);
              if (!noCase) onUpload(e.dataTransfer.files, caseId);
            }}
          >
            <div style={{ color: "#63A8FF", display: "grid", placeItems: "center", marginBottom: 10 }}>
              <Ico d={I.upload} size={30} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>اسحب الملفات هنا</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              PDF أو Word أو صور — الملف الأصلي بيتحفظ نسخة احتياطية دايمًا، والنص بيتحول ل-LaTeX
            </div>
            <button className="btn sm" style={{ marginTop: 14 }} disabled={noCase} onClick={() => inp.current?.click()}>
              اختيار من الجهاز
            </button>
            <input ref={inp} type="file" multiple hidden accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(e) => { if (e.target.files) { if (!noCase) onUpload(e.target.files, caseId); e.target.value = ""; } }} />
          </div>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 10, lineHeight: 1.7 }}>
            لو الـ OCR مقراش الملف، اكتبه بنفسك هنا:
          </div>
          <button className="btn ghost sm" style={{ marginTop: 6 }} disabled={noCase} onClick={() => setTexModal(true)}>
            رفع LaTeX يدويًا
          </button>
          <div className="row" style={{ justifyContent: "space-between", marginTop: 16, fontSize: 12.5 }}>
            <span className="muted">إجمالي المستندات</span>
            <b>{list.length}</b>
          </div>
        </div>

        <div className="card">
          <h3>إنشاء مستند من قالب</h3>
          {templates.length > 0 ? (
            <>
              <Drop value={tplId} onChange={(v) => pickTpl(v)} options={templates.map((t) => ({ value: t.id, label: t.name }))} />
              <div className="muted" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.8 }}>
                {tpl?.desc}
              </div>
              <button className="btn sm" style={{ marginTop: 14 }} onClick={() => setOpen(true)} disabled={!tpl}>
                تعبئة القالب
              </button>
              {tpl && fields.length > 1 && (
                <div className="muted" style={{ fontSize: 11.5, marginTop: 10 }}>
                  {fields.length - 1} حقل تُستبدل بالنقط «………». الحقل الفاضي يبقى نقط كما هو.
                </div>
              )}
            </>
          ) : (
            <div className="muted" style={{ fontSize: 13 }}>
              مفيش قوالب — اضف أول قالب من الأسفل.
            </div>
          )}
        </div>

        <div className="card">
          <h3>إدارة القوالب</h3>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <span className="muted" style={{ fontSize: 12.5 }}>
              {templates.length} قالب
            </span>
            <button className="btn sm" onClick={() => setEditTpl("new")}>
              + قالب جديد
            </button>
          </div>
          {templates.length === 0 && <div className="muted" style={{ fontSize: 12.5 }}>لا توجد قوالب بعد.</div>}
          {templates.map((t) => (
            <div key={t.id} className="listrow">
              <span style={{ flex: 1, fontSize: 13 }}>
                {t.name}
                <span className="muted" style={{ display: "block", fontSize: 11.5, marginTop: 3 }}>
                  {t.desc}
                </span>
              </span>
              <span className="row" style={{ gap: 4 }}>
                <button className="icon-btn" onClick={() => setEditTpl(t)} aria-label="تعديل" title="تعديل">
                  <Ico d={I.gear} size={14} />
                </button>
                <button className="icon-btn" onClick={() => setDelTpl(t)} aria-label="حذف" style={{ color: "#FF8296" }} title="حذف">
                  <Ico d={I.x} size={14} />
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>أرشيف المستندات</h3>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", marginBottom: 16 }}>
          {list.slice(0, 4).map((d, i) => (
            <button key={d.id} className={"thumb" + (i === sel ? " sel" : "")} onClick={() => setSel(i)}>
              <span style={{ color: color(d.k) }}>
                <Ico d={I.file} size={30} />
              </span>
            </button>
          ))}
        </div>
        {list.map((d) => (
          <div key={d.id} className="listrow">
            <span className="sq" style={{ background: "rgba(125,155,205,.08)", color: color(d.k) }}>
              <Ico d={I.file} size={16} />
            </span>
            <span style={{ flex: 1, fontSize: 13 }}>
              {d.n}
              <span className="muted" style={{ display: "block", fontSize: 11.5, marginTop: 3 }}>
                قضية {d.c}
                {d.tex && <span className="pill gold" style={{ marginInlineStart: 6, fontSize: 10 }}>LaTeX</span>}
              </span>
            </span>
            <span className="muted" style={{ fontSize: 12 }}>
              {d.s}
            </span>
            <span className="row" style={{ gap: 4 }}>
              {d.tex && (
                <button className="icon-btn" onClick={() => onEditTex(d)} aria-label="تعديل LaTeX" title="تعديل LaTeX">
                  <Ico d={I.gear} size={14} />
                </button>
              )}
              <a className="icon-btn" href={`/api/files/${d.id}`} target="_blank" rel="noopener noreferrer" aria-label="تحميل الأصلي" title="تنزيل الملف الأصلي (نسخة احتياطية)">
                <Ico d={I.file} size={14} />
              </a>
              <button className="icon-btn" onClick={() => onDelete(d.id)} aria-label="حذف" style={{ color: "#FF8296" }}>
                <Ico d={I.x} size={14} />
              </button>
            </span>
          </div>
        ))}
      </div>

      {texModal && (
        <div className="overlay" onClick={() => setTexModal(false)}>
          <div className="modal" style={{ maxWidth: 560, maxHeight: "82vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 6 }}>رفع LaTeX يدويًا</h3>
            <div className="muted" style={{ fontSize: 12, marginBottom: 16 }}>
              استخدمه لما الـ OCR مقراش الملف — اكتب النص هنا ويتم حفظه كمستند LaTeX.
            </div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 5 }}>اسم المستند</label>
            <input className="input" style={{ marginBottom: 12 }} value={texName} onChange={(e) => setTexName(e.target.value)} placeholder="مثال: عقد إيجار" />
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
                  onLatex(texName.trim(), texBody, caseId);
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

      {open && tpl && (
        <div className="overlay" onClick={() => setOpen(false)}>
          <div className="modal" style={{ maxWidth: 560, maxHeight: "82vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 6 }}>تعبئة قالب: {tpl.name}</h3>
            <div className="muted" style={{ fontSize: 12, marginBottom: 16 }}>
              كل نقط «………» في القالب أصبحت حقل أدناه. اترك أي حقل فاضيًا وسيبقى نقطًا كما هو في المستند.
            </div>

            {fields.map((f, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 5 }}>حقل {i + 1}</label>
                <input
                  className="input"
                  value={vals[i]}
                  onChange={(e) => setVals(vals.map((x, j) => (j === i ? e.target.value : x)))}
                  placeholder="اتركه فاضيًا ليبقى نقط"
                />
              </div>
            ))}

            <div className="card" style={{ marginTop: 14, padding: 16 }}>
              <h4 style={{ marginBottom: 8 }}>معاينة</h4>
              <div style={{ direction: "rtl", textAlign: "right", fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 2, background: "rgba(255,255,255,.05)", padding: 14, borderRadius: 10, maxHeight: 220, overflow: "auto" }}>
                {prettyText}
              </div>
            </div>

            <div className="row" style={{ gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              <button className="btn sm" onClick={() => download("document.tex", "application/x-latex", lat)}>
                تنزيل LaTeX (.tex)
              </button>
              <button
                className="btn sm"
                onClick={() =>
                  download(
                    "document.doc",
                    "application/msword",
                    `<html xmlns:w="urn:schemas-microsoft-com:office:word" dir="rtl" lang="ar"><head><meta charset="utf-8"></head><body style="font-family:'Traditional Arabic',serif;direction:rtl;font-size:14pt;line-height:2;">${prettyText.split("\n").map((l) => `<p>${l}</p>`).join("")}</body></html>`,
                  )
                }
              >
                تنزيل Word (.doc)
              </button>
            </div>
            <div className="row" style={{ justifyContent: "space-between", marginTop: 16 }}>
              <button className="btn sm muted" onClick={() => setOpen(false)}>إغلاق</button>
              <button className="btn sm" onClick={() => window.print()}>طباعة / حفظ كـ PDF</button>
            </div>
          </div>
        </div>
      )}

      {editTpl !== null && (
        <TemplateForm
          initial={editTpl === "new" ? null : editTpl}
          onClose={() => setEditTpl(null)}
          onSave={(data) => {
            if (editTpl === "new") {
              onAddTemplate({ ...data, id: genId() });
            } else {
              onEditTemplate({ ...data, id: editTpl.id });
            }
            setEditTpl(null);
          }}
        />
      )}

      {delTpl && (
        <div className="overlay" onClick={() => setDelTpl(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 12 }}>حذف القالب</h3>
            <div className="muted" style={{ fontSize: 13, marginBottom: 18 }}>
              هل تريد حذف «{delTpl.name}»؟ المستندات المنشأة منه لا تتأثر.
            </div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <button className="btn sm muted" onClick={() => setDelTpl(null)}>إلغاء</button>
              <button
                className="btn sm"
                style={{ background: "#c0392b" }}
                onClick={() => {
                  onDeleteTemplate(delTpl.id);
                  setDelTpl(null);
                }}
              >
                حذف نهائيًا
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateForm({
  initial,
  onClose,
  onSave,
}: {
  initial: TemplateData | null;
  onClose: () => void;
  onSave: (data: { name: string; desc: string; body: string }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [desc, setDesc] = useState(initial?.desc ?? "");
  const [body, setBody] = useState(initial?.body ?? "");

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 620, maxHeight: "86vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 14 }}>{initial ? "تعديل القالب" : "قالب جديد"}</h3>

        <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 5 }}>اسم القالب</label>
        <input className="input" style={{ marginBottom: 12 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: عقد إيجار شقة" />

        <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 5 }}>وصف مختصر</label>
        <input className="input" style={{ marginBottom: 12 }} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="وصف يظهر للمستخدم" />

        <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 5 }}>
          نص القالب — استخدم «………» لكل خانة يملأها المستخدم
        </label>
        <textarea
          className="input"
          style={{ minHeight: 220, direction: "rtl", lineHeight: 2, whiteSpace: "pre-wrap" }}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={"اكتب نص العقد هنا.\n\nمثال:\nأنه في يوم ....... الموافق ....... تم الاتفاق بين:\nالسيد: ....... المقيم في ....... بطاقة رقم ....... ... إلخ"}
        />

        <div className="muted" style={{ fontSize: 11.5, marginTop: 8, lineHeight: 1.8 }}>
          أي سلسلة نقط «………» = حقل تعبئة في فورم المستخدم. تركه فاضي = يبقى نقط في المستند النهائي.
        </div>

        <div className="row" style={{ justifyContent: "space-between", marginTop: 18 }}>
          <button className="btn sm muted" onClick={onClose}>إلغاء</button>
          <button
            className="btn sm"
            disabled={!name.trim() || !body.trim()}
            onClick={() => onSave({ name: name.trim(), desc: desc.trim(), body })}
          >
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
}