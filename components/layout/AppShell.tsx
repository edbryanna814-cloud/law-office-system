"use client";

import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Login } from "@/components/auth/Login";
import { CaseDetailsTab } from "@/components/tabs/CaseDetailsTab";
import { ArchiveTab } from "@/components/tabs/ArchiveTab";
import { CasesTab } from "@/components/tabs/CasesTab";
import { DashboardTab } from "@/components/tabs/DashboardTab";
import { DocumentsTab } from "@/components/tabs/DocumentsTab";
import { EmployeeProfileTab } from "@/components/tabs/EmployeeProfileTab";
import { EmployeesTab } from "@/components/tabs/EmployeesTab";
import { FinanceTab } from "@/components/tabs/FinanceTab";
import { SearchTab } from "@/components/tabs/SearchTab";
import { SessionsTab } from "@/components/tabs/SessionsTab";
import { SettingsTab } from "@/components/tabs/SettingsTab";
import { UsersTab } from "@/components/tabs/UsersTab";
import { AddCaseModal } from "@/components/cases/AddCaseModal";
import { AddEmployeeModal } from "@/components/employees/AddEmployeeModal";
import { AddSessionModal } from "@/components/sessions/AddSessionModal";
import { TexEditorModal } from "@/components/docs/TexEditorModal";
import type { AuthUser } from "@/components/auth/Login";
import { pagesForRole } from "@/lib/pages";
import type { CaseData, EmployeeData, SessionData, TabKey, TransactionData, DocumentData, TemplateData } from "@/types";

const TITLES: Record<TabKey, [string, string]> = {
  dash: ["لوحة التحكم", "نظرة عامة على أداء المكتب"],
  cases: ["القضايا", "كل الدعاوى المقيّدة والمتابعة"],
  archive: ["الأرشيف", "القضايا المؤرشفة والمنتهية"],
  sessions: ["الجلسات", "المواعيد القادمة أمام المحاكم"],
  staff: ["الموظفون", "فريق المكتب والمهام المسندة"],
  finance: ["العهدة المالية", "التحصيلات والمصروفات"],
  docs: ["المستندات", "الأرشيف الإلكتروني للمكتب"],
  search: ["البحث الذكي", "نتائج من كل أقسام النظام"],
  users: ["المستخدمون", "إدارة الحسابات والصلاحيات"],
  settings: ["الإعدادات", "تفضيلات النظام والحساب"],
};

const api = async (entity: string, data: object, method: "POST" | "PUT" = "POST") => {
  const res = await fetch(`/api/data/${entity}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.ok;
};

export function AppShell() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [route, setRoute] = useState<TabKey>("dash");
  const [openCase, setOpenCase] = useState<CaseData | null>(null);
  const [openStaff, setOpenStaff] = useState<EmployeeData | null>(null);
  const [menu, setMenu] = useState(false);

  // حالة البيانات (الكائن كله واحد عشان التحديث سهل)
  const [state, setState] = useState({
    cases: [] as CaseData[],
    sessions: [] as SessionData[],
    staff: [] as EmployeeData[],
    transactions: [] as TransactionData[],
    docs: [] as DocumentData[],
    templates: [] as TemplateData[],
  });

  // modals: "off" | "new" | edit-target
  const [modal, setModal] = useState<{ kind: "case" | "session" | "employee"; edit?: any; archived?: boolean } | null>(null);
  const [texDoc, setTexDoc] = useState<DocumentData | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setUser(d.user))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  const refreshTimer = useCallback(() => {
    fetch("/api/auth/refresh", { method: "POST" }).catch(() => {});
  }, []);
  useEffect(() => {
    if (!user) return;
    const t = setInterval(refreshTimer, 10 * 60 * 1000);
    return () => clearInterval(t);
  }, [user, refreshTimer]);

  // تحميل البيانات الحقيقية من قاعدة البيانات بعد الدخول
  useEffect(() => {
    if (!user) return;
    fetch("/api/data/all")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setState({
          cases: d.cases as CaseData[],
          sessions: d.sessions as SessionData[],
          staff: d.staff as EmployeeData[],
          transactions: d.transactions as TransactionData[],
          docs: d.docs as DocumentData[],
          templates: d.templates as TemplateData[],
        });
      })
      .catch(() => {});
  }, [user]);

  // تذكير الجلسات الحقيقي: إشعار متصفح (Web Notification) لأقرب جلسة خلال ٢٤ ساعة.
  useEffect(() => {
    if (!user || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const fire = () => {
      try {
        const prefs = JSON.parse(localStorage.getItem("lawer_prefs") ?? "{}");
        if (prefs.sessions === false) return;
        let reminded: Record<string, boolean> = {};
        try {
          reminded = JSON.parse(localStorage.getItem("sessions_reminded") ?? "{}");
        } catch {}
        const now = Date.now();
        const WINDOW = 24 * 60 * 60 * 1000;
        let changed = false;
        for (const s of state.sessions) {
          if (reminded[s.id] || !s.d || !s.h) continue;
          const when = new Date(`${s.d}T${s.h}:00`).getTime();
          if (!Number.isFinite(when) || when < now || when - now > WINDOW) continue;
          reminded[s.id] = true;
          changed = true;
          new Notification("جلسة قادمة خلال ٢٤ ساعة", {
            body: `${s.t} — قضية ${s.c} · ${s.room}`,
            icon: "/favicon.ico",
          });
          break;
        }
        if (changed) localStorage.setItem("sessions_reminded", JSON.stringify(reminded));
      } catch {}
    };
    fire();
    const t = setInterval(fire, 60 * 1000);
    return () => clearInterval(t);
  }, [user, state.sessions]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
  };

  const pages = (user ? user.pages ?? pagesForRole(user.role) : pagesForRole("admin")) as TabKey[];
  const cur = (pages.includes(route) ? route : "dash") as TabKey;

  const go = (k: TabKey) => {
    if (!pages.includes(k)) return;
    setRoute(k);
    setOpenCase(null);
    setOpenStaff(null);
    setMenu(false);
  };

  const patch = useCallback(
    (key: "cases" | "sessions" | "staff" | "transactions" | "docs" | "templates", fn: (list: any[]) => any[]) =>
      setState((p) => ({ ...p, [key]: fn(p[key]) })),
    []
  );

  // ---------- CRUD: قضايا ----------
  const addCase = (c: CaseData) => {
    patch("cases", (l) => [c, ...l]);
    api("cases", c);
  };
  const editCase = (c: CaseData) => {
    patch("cases", (l) => l.map((x) => (x.id === c.id ? c : x)));
    api("cases", c, "PUT");
  };
  const deleteCase = (id: string) => {
    patch("cases", (l) => l.filter((x) => x.id !== id));
    fetch(`/api/data/cases?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  };
  const archiveCase = (c: CaseData) => editCase({ ...c, archived: !c.archived });

  // ---------- CRUD: جلسات ----------
  const addSession = (s: SessionData) => {
    patch("sessions", (l) => [s, ...l]);
    api("sessions", s);
  };
  const editSession = (s: SessionData) => {
    patch("sessions", (l) => l.map((x) => (x.id === s.id ? s : x)));
    api("sessions", s, "PUT");
  };
  const deleteSession = (id: string) => {
    patch("sessions", (l) => l.filter((x) => x.id !== id));
    fetch(`/api/data/sessions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  };

  // ---------- CRUD: موظفين ----------
  const addEmployee = (e: EmployeeData) => {
    patch("staff", (l) => [e, ...l]);
    api("staff", e);
  };
  const editEmployee = (e: EmployeeData) => {
    patch("staff", (l) => l.map((x) => (x.id === e.id ? e : x)));
    api("staff", e, "PUT");
  };
  const deleteEmployee = (id: string) => {
    patch("staff", (l) => l.filter((x) => x.id !== id));
    fetch(`/api/data/staff?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  };

  // ---------- CRUD: عهدة مالية ----------
  const addTx = (t: TransactionData) => {
    patch("transactions", (l) => [t, ...l]);
    api("transactions", t);
  };
  const deleteTx = (id: string) => {
    patch("transactions", (l) => l.filter((x) => x.id !== id));
    fetch(`/api/data/transactions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  };

  // ---------- CRUD: مستندات ----------
  const uploadDocs = async (files: FileList | File[], caseId?: string) => {
    const form = new FormData();
    for (const f of Array.from(files)) form.append("files", f);
    form.append("caseId", caseId || "");
    try {
      const res = await fetch("/api/data/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("فشل الرفع");
      const { docs } = await res.json();
      patch("docs", (l: DocumentData[]) => [...docs, ...l]);
    } catch {}
  };
  const uploadLatex = async (name: string, latex: string, caseId?: string) => {
    const form = new FormData();
    form.append("latex", latex);
    form.append("name", name || "مستند LaTeX");
    form.append("caseId", caseId || "");
    try {
      const res = await fetch("/api/data/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("فشل الرفع");
      const { docs } = await res.json();
      patch("docs", (l: DocumentData[]) => [...docs, ...l]);
    } catch {}
  };
  const deleteDoc = (id: string) => {
    patch("docs", (l: DocumentData[]) => l.filter((x) => x.id !== id));
    fetch(`/api/data/docs?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  };
  const saveDocTex = (id: string, tex: string) => {
    patch("docs", (l: DocumentData[]) => l.map((x) => (x.id === id ? { ...x, tex } : x)));
    fetch("/api/data/docs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, tex }),
    });
  };

  // ---------- CRUD: قوالب المستندات ----------
  const addTemplate = (t: TemplateData) => {
    patch("templates", (l: TemplateData[]) => [t, ...l]);
    api("templates", t);
  };
  const editTemplate = (t: TemplateData) => {
    patch("templates", (l: TemplateData[]) => l.map((x) => (x.id === t.id ? t : x)));
    api("templates", t, "PUT");
  };
  const deleteTemplate = (id: string) => {
    patch("templates", (l: TemplateData[]) => l.filter((x) => x.id !== id));
    fetch(`/api/data/templates?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  };

  if (checking) return null;
  if (!user) return <Login onLogin={setUser} />;

  const [title, sub] = openCase
    ? ["تفاصيل القضية", openCase.id]
    : openStaff
      ? ["ملف الموظف", openStaff.id]
      : TITLES[cur];

  const body = openCase ? (
    <CaseDetailsTab c={openCase} docs={state.docs} sessions={state.sessions} onUpload={uploadDocs} onLatex={uploadLatex} onEditCase={editCase} onDelete={deleteDoc} onEditTex={setTexDoc} onBack={() => setOpenCase(null)} />
  ) : openStaff ? (
    <EmployeeProfileTab p={openStaff} cases={state.cases} sessions={state.sessions} onBack={() => setOpenStaff(null)} onOpenCase={setOpenCase} />
  ) : cur === "dash" ? (
    <DashboardTab cases={state.cases} sessions={state.sessions} transactions={state.transactions} goSessions={() => go("sessions")} onOpenCase={setOpenCase} />
  ) : cur === "cases" ? (
    <CasesTab
      list={state.cases}
      onOpen={setOpenCase}
      onAdd={() => setModal({ kind: "case" })}
      onEdit={(c) => setModal({ kind: "case", edit: c })}
      onArchive={archiveCase}
      onDelete={deleteCase}
    />
  ) : cur === "archive" ? (
    <ArchiveTab list={state.cases} onOpen={setOpenCase} onRestore={archiveCase} onDelete={deleteCase} onAdd={() => setModal({ kind: "case", archived: true })} />
  ) : cur === "sessions" ? (
    <SessionsTab
      list={state.sessions}
      onAdd={() => setModal({ kind: "session" })}
      onEdit={(s) => setModal({ kind: "session", edit: s })}
      onDelete={deleteSession}
    />
  ) : cur === "staff" ? (
    <EmployeesTab
      list={state.staff}
      onOpen={setOpenStaff}
      onAdd={() => setModal({ kind: "employee" })}
      onEdit={(e) => setModal({ kind: "employee", edit: e })}
      onDelete={deleteEmployee}
    />
  ) : cur === "finance" ? (
    <FinanceTab list={state.transactions} onAdd={addTx} onDelete={deleteTx} cases={state.cases} />
  ) : cur === "docs" ? (
    <DocumentsTab list={state.docs} cases={state.cases} templates={state.templates} onUpload={uploadDocs} onLatex={uploadLatex} onDelete={deleteDoc} onEditTex={setTexDoc} onAddTemplate={addTemplate} onEditTemplate={editTemplate} onDeleteTemplate={deleteTemplate} />
  ) : cur === "search" ? (
    <SearchTab cases={state.cases} staff={state.staff} docs={state.docs} onOpen={setOpenCase} onOpenStaff={setOpenStaff} />
  ) : cur === "users" ? (
    <UsersTab me={user.id} />
  ) : (
    <SettingsTab user={user} onUserUpdate={(name) => setUser((u) => (u ? { ...u, name } : u))} />
  );

  return (
    <>
      <Sidebar
        active={cur}
        pages={pages}
        detailOpen={!!openCase || !!openStaff}
        menuOpen={menu}
        onNavigate={go}
        onNewCase={() => setModal({ kind: "case" })}
        onLogout={logout}
      />
      <div className={"main" + (menu ? " toggled" : "")}>
        <Topbar
          title={title}
          sub={sub}
          user={user.name}
          onToggleMenu={() => setMenu((m) => !m)}
          onSearch={() => go("search")}
          onBell={() => go("sessions")}
        />
        <main className="content">{body}</main>
      </div>
      {modal?.kind === "case" && (
        <AddCaseModal edit={modal.edit as CaseData | undefined} startArchived={modal.archived} onClose={() => setModal(null)} onSave={modal.edit ? editCase : addCase} />
      )}
      {modal?.kind === "session" && (
        <AddSessionModal
          edit={modal.edit as SessionData | undefined}
          cases={state.cases}
          staff={state.staff}
          onClose={() => setModal(null)}
          onSave={modal.edit ? editSession : addSession}
        />
      )}
      {modal?.kind === "employee" && (
        <AddEmployeeModal edit={modal.edit as EmployeeData | undefined} onClose={() => setModal(null)} onSave={modal.edit ? editEmployee : addEmployee} />
      )}
      {texDoc && <TexEditorModal doc={texDoc} onSave={saveDocTex} onClose={() => setTexDoc(null)} />}
    </>
  );
}