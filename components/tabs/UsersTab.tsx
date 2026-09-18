"use client";

import { useEffect, useState } from "react";
import { I, Ico } from "@/components/ui/icons";
import { Modal } from "@/components/ui/shared";
import { ROLE_NAMES, PAGE_KEYS, pagesForRole } from "@/lib/pages";
import type { TabKey } from "@/types";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  pages?: string[];
  createdAt?: string;
}

interface RoleRow {
  key: string;
  name: string;
  pages: string[];
  system: boolean;
}

const TITLES: Partial<Record<TabKey, string>> = {
  dash: "لوحة التحكم",
  cases: "القضايا",
  archive: "الأرشيف",
  sessions: "الجلسات",
  staff: "الموظفون",
  finance: "العهدة المالية",
  docs: "المستندات",
  search: "البحث الذكي",
  users: "المستخدمون",
  settings: "الإعدادات",
};

export function UsersTab({ me }: { me?: string }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [edit, setEdit] = useState<UserRow | "new" | null>(null);
  const [roleEdit, setRoleEdit] = useState<RoleRow | "new" | null>(null);

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 4000);
  };

  const roleName = (k: string) => roles.find((r) => r.key === k)?.name || ROLE_NAMES[k] || k;

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setMsg("");
    try {
      const [ur, rr] = await Promise.all([fetch("/api/data/users"), fetch("/api/data/roles")]);
      const u = await ur.json();
      if (ur.ok) setUsers(u.users ?? []);
      else flash(u.error ?? "فشل تحميل المستخدمين");
      if (rr.ok) {
        const r = await rr.json();
        setRoles(r.roles ?? []);
      }
    } catch {
      flash("فشل الاتصال");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (u: { name: string; email: string; password?: string; role: string; pages: string[] }) => {
    const res = await fetch("/api/data/users", {
      method: edit === "new" ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(edit === "new" ? u : { id: (edit as UserRow).id, ...u }),
    });
    const d = await res.json();
    if (!res.ok) return d.error ?? "فشل الحفظ";
    setEdit(null);
    load(true);
    return null;
  };

  const del = async (u: UserRow) => {
    if (!confirm("هل تريد حذف «" + u.name + "» نهائيًا؟")) return;
    const res = await fetch(`/api/data/users?id=${u.id}`, { method: "DELETE" });
    const d = await res.json();
    if (res.ok) {
      setUsers((p) => p.filter((x) => x.id !== u.id));
      flash("تم الحذف ✓");
    } else {
      flash(d.error ?? "فشل الحذف");
    }
  };

  const toggleStatus = async (u: UserRow) => {
    const next = u.status === "banned" ? "active" : "banned";
    const res = await fetch("/api/data/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id, status: next }),
    });
    const d = await res.json();
    if (res.ok) {
      setUsers((p) => p.map((x) => (x.id === u.id ? { ...x, status: next } : x)));
      flash(next === "active" ? "تم التفعيل ✓" : "تم الحظر");
    } else {
      flash(d.error ?? "فشل التحديث");
    }
  };

  const saveRole = async (r: { key?: string; name: string; pages: string[] }) => {
    const res = await fetch("/api/data/roles", {
      method: r.key ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(r),
    });
    const d = await res.json();
    if (!res.ok) return d.error ?? "فشل الحفظ";
    setRoleEdit(null);
    load(true);
    return null;
  };

  const delRole = async (r: RoleRow) => {
    if (!confirm("حذف الدور «" + r.name + "»؟")) return;
    const res = await fetch(`/api/data/roles?id=${encodeURIComponent(r.key)}`, { method: "DELETE" });
    const d = await res.json();
    if (res.ok) {
      setRoles((p) => p.filter((x) => x.key !== r.key));
      flash("تم حذف الدور ✓");
    } else {
      flash(d.error ?? "فشل الحذف");
    }
  };

  const effPages = (u: UserRow) => u.pages?.length ? u.pages : null;
  const customRoles = roles.filter((r) => !r.system);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
          <h3>حسابات المستخدمين</h3>
          <button className="btn sm" onClick={() => setEdit("new")}>
            + مستخدم جديد
          </button>
        </div>
        <p className="muted" style={{ fontSize: 12, margin: "4px 0 12px" }}>
          أضف أو عدّل أو احذف الحسابات. لكل مستخدم: دور + تحديد الصفحات التي يراها بالضبط.
        </p>
        {msg && (
          <div className="pill" style={{ marginBottom: 10, background: "rgba(45,212,191,.1)", color: "var(--teal)" }}>
            {msg}
          </div>
        )}
        {loading && !users.length ? (
          <div className="muted" style={{ fontSize: 13, padding: 8 }}>جارٍ التحميل...</div>
        ) : users.length === 0 ? (
          <div className="muted" style={{ fontSize: 13, padding: 8 }}>لا يوجد مستخدمون بعد.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {users.map((u) => (
              <div key={u.id} className="listrow" style={{ alignItems: "flex-start" }}>
                <span className="sq" style={{ background: "rgba(125,155,205,.12)", color: "#8FB6FF" }}>
                  <Ico d={I.users} size={16} />
                </span>
                <span style={{ flex: 1, fontSize: 13, minWidth: 0 }}>
                  {u.name}
                  <span className="muted" style={{ display: "block", fontSize: 11.5, marginTop: 2 }}>{u.email}</span>
                  <span style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                    <span className="pill blue">{roleName(u.role)}</span>
                    {u.status === "active" ? (
                      <span className="pill teal">نشط</span>
                    ) : u.status === "pending" ? (
                      <span className="pill gold">معلق</span>
                    ) : (
                      <span className="pill red">محظور</span>
                    )}
                    {u.id === me && <span className="pill">أنت</span>}
                  </span>
                  {effPages(u) && (
                    <span className="muted" style={{ display: "block", fontSize: 11, marginTop: 5, lineHeight: 1.7 }}>
                      يشاهد: {effPages(u)!.map((p) => TITLES[p as TabKey] ?? p).join("، ")}
                    </span>
                  )}
                </span>
                <span className="row" style={{ gap: 4, alignItems: "center" }}>
                  {u.id !== me && (
                    <button className="btn sm ghost" style={{ fontSize: 12 }} onClick={() => toggleStatus(u)}>
                      {u.status === "banned" ? "إلغاء الحظر" : "حظر"}
                    </button>
                  )}
                  <button className="icon-btn" onClick={() => setEdit(u)} aria-label="تعديل">
                    <Ico d={I.gear} size={14} />
                  </button>
                  {u.id !== me && (
                    <button className="icon-btn" style={{ color: "#FF8296" }} onClick={() => del(u)} aria-label="حذف">
                      <Ico d={I.x} size={14} />
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
          <h3>الأدوار</h3>
          <button className="btn sm" onClick={() => setRoleEdit("new")}>
            + دور جديد
          </button>
        </div>
        <p className="muted" style={{ fontSize: 12, margin: "4px 0 12px" }}>
          الأدوار تحدد الصفحات الافتراضية للمستخدم. يمكنك إنشاء أدوار مخصصة جديدة تناسب مكتبك.
        </p>
        <div style={{ display: "grid", gap: 8 }}>
          {roles.map((r) => (
            <div key={r.key} className="listrow" style={{ alignItems: "flex-start" }}>
              <span className="sq" style={{ background: r.system ? "rgba(125,155,205,.12)" : "rgba(183,135,255,.12)", color: r.system ? "#8FB6FF" : "#CB9FFF" }}>
                <Ico d={I.shield} size={16} />
              </span>
              <span style={{ flex: 1, fontSize: 13, minWidth: 0 }}>
                {r.name}
                <span className="muted" style={{ display: "block", fontSize: 11.5, marginTop: 2 }}>
                  {r.system ? "دور أساسي ثابت" : "دور مخصص"} — يشاهد: {(r.pages.map((p) => TITLES[p as TabKey] ?? p).join("، ")) || "لا شيء"}
                </span>
              </span>
              {!r.system && (
                <span className="row" style={{ gap: 4, alignItems: "center" }}>
                  <button className="icon-btn" onClick={() => setRoleEdit(r)} aria-label="تعديل">
                    <Ico d={I.gear} size={14} />
                  </button>
                  <button className="icon-btn" style={{ color: "#FF8296" }} onClick={() => delRole(r)} aria-label="حذف">
                    <Ico d={I.x} size={14} />
                  </button>
                </span>
              )}
            </div>
          ))}
          {roles.length === 0 && <div className="muted" style={{ fontSize: 13, padding: 4 }}>لا توجد أدوار بعد.</div>}
        </div>
      </div>

      {edit !== null && (
        <UserForm
          me={me}
          roles={roles}
          initial={edit === "new" ? null : edit}
          onClose={() => setEdit(null)}
          onSave={async (data) => flash((await save(data)) || "تم الحفظ ✓")}
        />
      )}
      {roleEdit !== null && (
        <RoleForm
          initial={roleEdit === "new" ? null : roleEdit}
          onClose={() => setRoleEdit(null)}
          onSave={async (data) => flash((await saveRole(data)) || "تم الحفظ ✓")}
        />
      )}
    </div>
  );
}

function UserForm({
  initial,
  me,
  roles,
  onClose,
  onSave,
}: {
  initial: UserRow | null;
  me?: string;
  roles: RoleRow[];
  onClose: () => void;
  onSave: (data: { name: string; email: string; password?: string; role: string; pages: string[] }) => void;
}) {
  const isNew = !initial;
  const isMe = initial?.id === me;
  const roleOptions = [
    ...Object.entries(ROLE_NAMES).map(([k, v]) => ({ key: k, name: v, pages: pagesForRole(k) })),
    ...roles.filter((r) => !r.system).map((r) => ({ key: r.key, name: r.name, pages: r.pages })),
  ];
  const known = roleOptions.some((r) => r.key === initial?.role);
  const initRole = isNew ? "lawyer" : known ? initial!.role : "lawyer";
  const [f, setF] = useState({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    password: "",
    role: initRole,
    pages: initial?.pages?.length ? (initial.pages as string[]) : roleOptions.find((r) => r.key === initRole)?.pages ?? pagesForRole(initRole),
  });
  const ok = Boolean(f.name.trim() && f.email.trim() && (isNew ? f.password.length >= 6 : true) && f.pages.length);

  const set = (k: keyof typeof f, v: string | string[]) => setF((p) => ({ ...p, [k]: v }));

  const togglePage = (k: string) =>
    set("pages", f.pages.includes(k) ? f.pages.filter((x) => x !== k) : [...f.pages, k]);

  return (
    <Modal onClose={onClose}>
      <div className="row" style={{ marginBottom: 18 }}>
        <h3 style={{ margin: 0, fontSize: 19 }}>{isNew ? "إضافة مستخدم جديد" : "تعديل المستخدم"}</h3>
        <button className="icon-btn" style={{ marginInlineStart: "auto" }} onClick={onClose} aria-label="إغلاق">
          <Ico d={I.x} />
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="field">
          <label>الاسم</label>
          <input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="الاسم الكامل" />
        </div>
        <div className="field">
          <label>البريد الإلكتروني</label>
          <input className="input" dir="ltr" value={f.email} disabled={!isNew} onChange={(e) => set("email", e.target.value)} style={{ opacity: !isNew ? 0.6 : 1 }} placeholder="name@office.eg" />
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>{isNew ? "كلمة المرور" : isMe ? "كلمة المرور (لا يمكن تغييرها بنفسك من هنا)" : "كلمة مرور جديدة (اختياري)"}</label>
          <input
            className="input"
            type="password"
            dir="ltr"
            value={f.password}
            disabled={isMe}
            onChange={(e) => set("password", e.target.value)}
            placeholder={isMe ? "" : isNew ? "٦ أحرف على الأقل" : "اتركه فاضيًا لعدم التغيير"}
          />
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>الدور (يحدد الصلاحيات الافتراضية)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {roleOptions.map((r) => {
              const on = f.role === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  disabled={isMe}
                  onClick={() => {
                    set("role", r.key);
                    set("pages", r.pages);
                  }}
                  style={{
                    padding: "9px 14px",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 700,
                    border: on ? "1px solid #2E8BFF" : "1px solid var(--line)",
                    background: on ? "rgba(46,139,255,.16)" : "#0D1423",
                    color: on ? "#63A8FF" : "#E7EDF9",
                    cursor: isMe ? "not-allowed" : "pointer",
                    opacity: isMe ? 0.5 : 1,
                    flex: "1 1 140px",
                    textAlign: "center",
                  }}
                >
                  {r.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {isMe ? (
        <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          لا يمكنك تغيير دورك أو صلاحياتك — المدير العام هو الأدمن الوحيد.
        </div>
      ) : (
        <>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginTop: 16, marginBottom: 6 }}>
            الصفحات التي يراها هذا المستخدم
          </label>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 8 }}>
            {PAGE_KEYS.map((k) => (
              <label key={k} className="listrow" style={{ cursor: "pointer", padding: "7px 10px", fontSize: 12.5 }}>
                <input type="checkbox" checked={f.pages.includes(k)} onChange={() => togglePage(k)} />
                <span style={{ marginInlineStart: 6 }}>{TITLES[k] ?? k}</span>
              </label>
            ))}
          </div>
        </>
      )}

      <div className="row" style={{ gap: 10, marginTop: 18 }}>
        <button className="btn" style={{ flex: 1 }} disabled={!ok} onClick={() => onSave({ ...f, name: f.name.trim(), email: f.email.trim().toLowerCase() })}>
          {isNew ? "إنشاء الحساب" : "حفظ التعديلات"}
        </button>
        <button className="btn ghost" onClick={onClose}>
          إلغاء
        </button>
      </div>
      {!ok && (
        <div className="muted" style={{ fontSize: 12, marginTop: 10, color: "#FF8296" }}>
          {!f.name.trim() && "اكتب الاسم. "}
          {!f.email.trim() && "اكتب البريد. "}
          {isNew && f.password.length < 6 && "كلمة المرور ٦ أحرف على الأقل. "}
          {f.pages.length === 0 && "حدد صفحة واحدة على الأقل. "}
        </div>
      )}
    </Modal>
  );
}

function RoleForm({
  initial,
  onClose,
  onSave,
}: {
  initial: RoleRow | null;
  onClose: () => void;
  onSave: (data: { key?: string; name: string; pages: string[] }) => void;
}) {
  const isNew = !initial;
  const [f, setF] = useState({
    name: initial?.name ?? "",
    pages: initial?.pages?.length ? initial.pages : [],
  });
  const ok = Boolean(f.name.trim() && f.pages.length);

  const togglePage = (k: string) =>
    setF((p) => ({ ...p, pages: p.pages.includes(k) ? p.pages.filter((x) => x !== k) : [...p.pages, k] }));

  return (
    <Modal onClose={onClose}>
      <div className="row" style={{ marginBottom: 18 }}>
        <h3 style={{ margin: 0, fontSize: 19 }}>{isNew ? "إضافة دور مخصص" : "تعديل الدور"}</h3>
        <button className="icon-btn" style={{ marginInlineStart: "auto" }} onClick={onClose} aria-label="إغلاق">
          <Ico d={I.x} />
        </button>
      </div>

      <div className="field">
        <label>اسم الدور</label>
        <input className="input" value={f.name} onChange={(e) => setF((p) => ({ ...p, name: e.target.value }))} placeholder="مثال: مسؤول المتابعة" />
      </div>

      <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginTop: 16, marginBottom: 6 }}>
        الصفحات التي يشاهدها هذا الدور
      </label>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 8 }}>
        {PAGE_KEYS.map((k) => (
          <label key={k} className="listrow" style={{ cursor: "pointer", padding: "7px 10px", fontSize: 12.5 }}>
            <input type="checkbox" checked={f.pages.includes(k)} onChange={() => togglePage(k)} />
            <span style={{ marginInlineStart: 6 }}>{TITLES[k] ?? k}</span>
          </label>
        ))}
      </div>

      <div className="row" style={{ gap: 10, marginTop: 18 }}>
        <button className="btn" style={{ flex: 1 }} disabled={!ok} onClick={() => onSave({ key: initial?.key, name: f.name.trim(), pages: f.pages })}>
          {isNew ? "إنشاء الدور" : "حفظ التعديلات"}
        </button>
        <button className="btn ghost" onClick={onClose}>
          إلغاء
        </button>
      </div>
      {!ok && (
        <div className="muted" style={{ fontSize: 12, marginTop: 10, color: "#FF8296" }}>
          {!f.name.trim() && "اكتب اسم الدور. "}
          {f.pages.length === 0 && "حدد صفحة واحدة على الأقل. "}
        </div>
      )}
    </Modal>
  );
}