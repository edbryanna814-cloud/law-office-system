import type { TabKey } from "@/types";

export const PAGE_KEYS: TabKey[] = ["dash", "cases", "archive", "sessions", "staff", "finance", "docs", "search", "users", "settings"];

export const ROLE_NAMES: Record<string, string> = {
  admin: "مدير عام",
  lawyer: "محامي",
  archive: "مسؤول الأرشيف",
  cases: "مسؤول القضايا",
  finance: "مسؤول العهدة المالية",
  docs: "مسؤول المستندات",
  staff: "مسؤول الموظفين",
};

export const DEFAULT_ROLE_PAGES: Record<string, TabKey[]> = {
  admin: [...PAGE_KEYS],
  lawyer: ["dash", "cases", "archive", "sessions", "docs", "search"],
  archive: ["dash", "archive", "search"],
  cases: ["dash", "cases", "sessions", "search"],
  finance: ["dash", "finance", "search"],
  docs: ["dash", "docs", "search"],
  staff: ["dash", "staff", "search"],
};

export const SYSTEM_ROLES = Object.keys(ROLE_NAMES);

export function pagesForRole(role?: string): TabKey[] {
  const r = role || "lawyer";
  return DEFAULT_ROLE_PAGES[r] ?? [...DEFAULT_ROLE_PAGES.lawyer];
}