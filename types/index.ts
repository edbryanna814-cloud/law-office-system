export type CaseStatus = "نشطة" | "مؤجلة" | "مغلقة";
export type CaseType = "مدني" | "تجاري" | "عمالي" | "جنائي" | "عقاري";

export interface CaseData {
  id: string;
  title: string;
  client: string;
  court: string;
  type: CaseType;
  status: CaseStatus;
  next: string;
  value: string;
  notes?: string;
  archived?: boolean;
}

export type SessionTone = "blue" | "teal" | "red" | "gold";

export interface SessionData {
  id: string;
  t: string;
  c: string;
  d: string;
  h: string;
  room: string;
  tone: SessionTone;
  lawyer: string;
}

export interface EmployeeData {
  n: string;
  r: string;
  id: string;
  cases: number;
  phone: string;
  mail: string;
}

export type TxDirection = "in" | "out";

export interface TransactionData {
  id: string;
  d: string;
  t: string;
  amt: number;
  date: string;
  dir: TxDirection;
}

export type DocKind = "pdf" | "doc" | "img";

export interface DocumentData {
  id: string;
  n: string;
  s: string;
  k: DocKind;
  c: string;
  file?: string;
  gid?: string | null;
  tex?: string | null;
}

export interface TemplateData {
  id: string;
  name: string;
  desc: string;
  body: string;
}

export type TabKey =
  | "dash"
  | "cases"
  | "archive"
  | "sessions"
  | "staff"
  | "finance"
  | "docs"
  | "search"
  | "users"
  | "settings";