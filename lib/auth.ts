// Auth حقيقي بنمط التوكنين: Access JWT قصير (15 د) + Refresh عشوائي محفوظ كـ hash في DB (7 أيام).
import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/db";

const secret = process.env.JWT_SECRET || "dev-secret-change-me";

export const ACCESS_COOKIE = "lawer_access";
export const REFRESH_COOKIE = "lawer_refresh";

// ponytail: التسجيل الذاتي مستحيل — أول حساب بس (والقاعدة فاضية) بينعمل أدمن/مفعّل
// (بيُنشأ من الـ register كـ bootstrap)، وكل تسجيل بعده بيتقفل بـ 403. بعد كده الأدمن
// هو بس اللي بيضيف المستخدمين (اسم/إيميل/باسورد/دور) من تبويب الإعدادات.
// الرولز (admin/lawyer) موجودة جوه الـ back ولها معنى حقيقي في الـ permissions.

const accessMaxAge = 15 * 60; // 15 دقيقة
export const refreshMaxAge = 7 * 24 * 60 * 60; // 7 أيام

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status?: string;
  pages?: string[];
}

export const ROLE_LABELS: Record<string, string> = {
  admin: "مدير عام",
  lawyer: "محامي",
};

export const hashPassword = (p: string) => bcrypt.hash(p, 10);
export const verifyPassword = (p: string, h: string) => bcrypt.compare(p, h);

export function signAccess(user: SessionUser) {
  return jwt.sign({ name: user.name, email: user.email, role: user.role, status: user.status }, secret, {
    subject: user.id,
    expiresIn: accessMaxAge,
  });
}

export function verifyAccess(token: string): SessionUser | null {
  try {
    const p = jwt.verify(token, secret) as jwt.JwtPayload;
    return { id: p.sub!, name: String(p.name), email: String(p.email), role: String(p.role || ""), status: String(p.status || "active") };
  } catch {
    return null;
  }
}

export function newRefreshToken() {
  return randomBytes(48).toString("base64url");
}

// ponytail: sha256 للأوبك توكينز مقبول؛ الأهم حماية كلمة المرور نفسها (bcrypt). غيّرها لو صار leak فعلي.
export function hashRefresh(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

export function cookieBase(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

// React Native بيبعث التوكن في Authorization header بدل الكوكيز.
export function bearerToken(req: { headers: { get(name: string): string | null } }) {
  const h = req.headers.get("authorization");
  return h?.startsWith("Bearer ") ? h.slice(7) : undefined;
}

export async function setSessionCookies(access: string, refresh?: string) {
  const store = await cookies();
  store.set(ACCESS_COOKIE, access, cookieBase(accessMaxAge));
  if (refresh) store.set(REFRESH_COOKIE, refresh, cookieBase(refreshMaxAge));
}

export async function clearSessionCookies() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

export async function saveRefreshToken(token: string, userId: string) {
  const { db } = await connectToDatabase();
  await db.collection("auth_sessions").insertOne({
    token: hashRefresh(token),
    userId,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + refreshMaxAge * 1000),
  });
}

export async function isValidRefreshToken(token: string) {
  const { db } = await connectToDatabase();
  const s = await db.collection("auth_sessions").findOne({ token: hashRefresh(token) });
  return Boolean(s && s.expiresAt > new Date());
}

export async function deleteRefreshToken(token: string) {
  const { db } = await connectToDatabase();
  await db.collection("auth_sessions").deleteMany({ token: hashRefresh(token) });
}

export async function getUserById(id: string): Promise<SessionUser | null> {
  const { db } = await connectToDatabase();
  const u = await db.collection("users").findOne({ _id: new ObjectId(id) });
  if (!u) return null;
  return {
    id: u._id.toString(),
    name: u.name as string,
    email: u.email as string,
    role: u.role as string,
    status: (u.status as string) || "active",
    pages: u.pages as string[] | undefined,
  };
}

// يقرأ الAccess من الكوكي — يُستخدم في أغلب الـ API routes الحالية.
export async function readToken(): Promise<SessionUser | null> {
  // ponytail: رجّعنا المنطق الحقيقي — بيقرا الـ Access من الكوكي، ويحلل التوكن.
  // الدخول المباشر اللي كان قبل كده اتشال لأن المستخدم طلب نظام تسجيل حقيقي
  // (Login) من غير تسجيل ذاتي، والأدمن هو اللي بيضيف الحسابات بباسورداتها.
  const store = await cookies();
  const access = store.get(ACCESS_COOKIE)?.value;
  return access ? verifyAccess(access) : null;
}

// تجديد كامل للجلسة: يتحقق من الـ Refresh (7 أيام)، ويصدر Access و Refresh جديدين (rotation).
export async function rotateSession(): Promise<{ user: SessionUser } | null> {
  const store = await cookies();
  const refresh = store.get(REFRESH_COOKIE)?.value;
  if (!refresh) return null;

  const valid = await isValidRefreshToken(refresh).catch(() => false);
  if (!valid) return null;

  const { db } = await connectToDatabase();
  const s = await db.collection("auth_sessions").findOne({ token: hashRefresh(refresh) });
  if (!s?.userId) return null;

  const user = await getUserById(String(s.userId));
  if (!user || user.status !== "active") return null;

  // rotation: نشطب القديم، نعمل جديد
  await deleteRefreshToken(refresh);
  const newRefresh = newRefreshToken();
  await saveRefreshToken(newRefresh, user.id);
  await setSessionCookies(signAccess(user), newRefresh);
  return { user };
}

export async function getRefreshToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(REFRESH_COOKIE)?.value ?? null;
}