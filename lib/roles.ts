import type { TabKey } from "@/types";
import { ROLE_NAMES, pagesForRole } from "@/lib/pages";

export interface ResolvedRole {
  key: string;
  name: string;
  pages: TabKey[];
}

// أدوار ثابتة (لا قواعد مخصصة) — الحل الكافي لمكتب المحاماة. لو صار مطلوب
// أدوار مخصصة: ننقّل الـ mapping لقاعدة للـ roles زي royal-quotes.
export function resolveRole(roleKey?: string): ResolvedRole {
  const key = roleKey || "lawyer";
  return { key, name: ROLE_NAMES[key] ?? key, pages: pagesForRole(key) };
}

export function canAccess(roleKey: string | undefined, page: string): boolean {
  return resolveRole(roleKey).pages.includes(page as TabKey);
}

export function isAdmin(roleKey?: string) {
  return roleKey === "admin";
}