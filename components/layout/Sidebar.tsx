"use client";

import { I, Ico, Scales } from "@/components/ui/icons";
import type { TabKey } from "@/types";

const NAV: { k: TabKey; l: string; d: string; dot?: boolean }[] = [
  { k: "dash", l: "لوحة التحكم", d: I.grid },
  { k: "cases", l: "القضايا", d: I.gavel },
  { k: "archive", l: "الأرشيف", d: I.file },
  { k: "sessions", l: "الجلسات", d: I.calendar, dot: true },
  { k: "staff", l: "الموظفون", d: I.users },
  { k: "finance", l: "العهدة المالية", d: I.wallet },
  { k: "docs", l: "المستندات", d: I.file },
  { k: "search", l: "البحث الذكي", d: I.search },
  { k: "users", l: "المستخدمون", d: I.shield },
  { k: "settings", l: "الإعدادات", d: I.gear },
];

export function Sidebar({
  active,
  detailOpen,
  menuOpen,
  pages,
  onNavigate,
  onNewCase,
  onLogout,
  onClose,
}: {
  active: TabKey;
  detailOpen: boolean;
  menuOpen: boolean;
  pages: string[];
  onNavigate: (k: TabKey) => void;
  onNewCase: () => void;
  onLogout: () => void;
  onClose: () => void;
}) {
  const items = NAV.filter((n) => pages.includes(n.k));
  return (
    <aside className={"side" + (menuOpen ? " toggled" : "")}>
      <button className="side-close icon-btn" onClick={onClose} aria-label="إغلاق القائمة">
        <Ico d={I.x} size={16} />
      </button>
      <div className="brand">
        <span className="brand-mark" style={{ color: "#63A8FF" }}>
          <Scales size={20} />
        </span>
        <b>
          مكتب العدالة<span>لإدارة القضايا</span>
        </b>
      </div>
      {items.map((n) => (
        <button
          key={n.k}
          className={"nav-item" + (active === n.k && !detailOpen ? " on" : "")}
          onClick={() => onNavigate(n.k)}
        >
          <Ico d={n.d} size={17} />
          {n.l}
          {n.dot && <i className="dot" />}
        </button>
      ))}
      <div className="side-cta">
        <button
          className="btn block"
          onClick={() => {
            onNavigate("cases");
            onNewCase();
          }}
        >
          قضية جديدة
        </button>
        <button className="nav-item" style={{ marginTop: 8 }} onClick={onLogout}>
          <Ico d={I.logout} size={17} />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}