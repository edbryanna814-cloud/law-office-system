"use client";

import { I, Ico } from "@/components/ui/icons";

export function Topbar({
  title,
  sub,
  user,
  onToggleMenu,
  onSearch,
  onBell,
}: {
  title: string;
  sub: string;
  user: string;
  onToggleMenu: () => void;
  onSearch: () => void;
  onBell: () => void;
}) {
  return (
    <header className="topbar">
      <button className="icon-btn" onClick={onToggleMenu} aria-label="القائمة">
        <Ico d={I.menu} />
      </button>
      <div>
        <h1>{title}</h1>
        <div className="crumb">{sub}</div>
      </div>
      <div className="top-actions">
        <button className="icon-btn" onClick={onSearch} aria-label="بحث">
          <Ico d={I.search} />
        </button>
        <button className="icon-btn" onClick={onBell} aria-label="تنبيهات">
          <Ico d={I.bell} />
          <i className="bdg" />
        </button>
        <span className="avatar">{(user[0] || "م").toUpperCase()}</span>
      </div>
    </header>
  );
}