// Auth موحّد: كل الأكشنز في ملف واحد بنمط [action] — `POST /api/auth/login` مثلاً.
import { NextResponse, type NextRequest } from "next/server";
import { randomInt } from "node:crypto";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/db";
import {
  readToken,
  getUserById,
  signAccess,
  setSessionCookies,
  clearSessionCookies,
  newRefreshToken,
  saveRefreshToken,
  deleteRefreshToken,
  getRefreshToken,
  verifyPassword,
  hashPassword,
  rotateSession,
} from "@/lib/auth";
import { pagesForRole } from "@/lib/pages";

async function body(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

async function requireActiveUser() {
  const s = await readToken();
  if (!s) return null;
  const u = await getUserById(s.id);
  if (!u || u.status !== "active") return null;
  return u;
}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  const p = await body(req);

  if (action === "login") {
    try {
      if (!p.email || !p.password) {
        return NextResponse.json({ error: "اكتب البريد وكلمة المرور." }, { status: 400 });
      }
      const { db } = await connectToDatabase();
      const users = db.collection("users");
      const emailNorm = String(p.email).trim().toLowerCase();

      const u = await users.findOne({ email: emailNorm });
      if (!u || !(await verifyPassword(String(p.password), String(u.password)))) {
        return NextResponse.json({ error: "بريد أو كلمة مرور غير صحيحة." }, { status: 401 });
      }

      const userStatus = (u.status as string) || "active";
      if (userStatus !== "active") {
        return NextResponse.json({ error: "حسابك بانتظار موافقة المدير." }, { status: 403 });
      }

      const user = { id: u._id.toString(), name: u.name as string, email: emailNorm, role: u.role as string, status: userStatus };
      const refresh = newRefreshToken();
      await saveRefreshToken(refresh, user.id);
      await setSessionCookies(signAccess(user), refresh);
      return NextResponse.json({ user });
    } catch (e: any) {
      console.error("LOGIN_ERROR:", e?.message ?? e);
      return NextResponse.json({ error: "تعذّر الاتصال بقاعدة البيانات: " + (e?.message ?? "unknown") }, { status: 500 });
    }
  }

  if (action === "refresh") {
    const result = await rotateSession();
    if (!result) return NextResponse.json({ error: "غير مسجّل دخول أو الحساب غير مفعّل." }, { status: 401 });
    return NextResponse.json({ user: result.user });
  }

  if (action === "logout") {
    const refresh = await getRefreshToken();
    if (refresh) await deleteRefreshToken(refresh).catch(() => {});
    await clearSessionCookies();
    return NextResponse.json({ ok: true });
  }

  if (action === "change-password") {
    try {
      const user = await requireActiveUser();
      if (!user) return NextResponse.json({ error: "غير مسجّل دخول." }, { status: 401 });

      if (!p.current || !p.newPassword) {
        return NextResponse.json({ error: "اكتب كلمة المرور الحالية والجديدة." }, { status: 400 });
      }
      if (String(p.newPassword).length < 6) {
        return NextResponse.json({ error: "كلمة المرور الجديدة قصيرة. ٦ أحرف على الأقل." }, { status: 400 });
      }

      const { db } = await connectToDatabase();
      const users = db.collection("users");
      const u = await users.findOne({ _id: new ObjectId(user.id) });
      if (!u) return NextResponse.json({ error: "حساب غير موجود." }, { status: 404 });

      const ok = await verifyPassword(String(p.current), String(u.password));
      if (!ok) return NextResponse.json({ error: "كلمة المرور الحالية غير صحيحة." }, { status: 401 });

      await users.updateOne({ _id: u._id }, { $set: { password: await hashPassword(String(p.newPassword)) } });
      return NextResponse.json({ ok: true });
    } catch (e: any) {
      console.error("PASSWORD_CHANGE_ERROR:", e?.message ?? e);
      return NextResponse.json({ error: "فشل تغيير كلمة المرور." }, { status: 500 });
    }
  }

  if (action === "forgot") {
    try {
      if (!p.email) return NextResponse.json({ error: "اكتب البريد الإلكتروني." }, { status: 400 });
      const { db } = await connectToDatabase();
      const emailNorm = String(p.email).trim().toLowerCase();

      const u = await db.collection("users").findOne({ email: emailNorm });
      if (u) {
        const code = String(randomInt(0, 1000000)).padStart(6, "0");
        await db
          .collection("users")
          .updateOne({ _id: u._id }, { $set: { resetCode: await hashPassword(code), resetExpires: Date.now() + 30 * 60 * 1000 } });
        // ponytail: مفيش SMTP بعد — الكود يتطبع في كونسول السيرفر؛ وصوله بالبريد يتضاف لما يتضبط.
        console.log(`[RESET] ${emailNorm} code=${code}`);
      }
      // نفس الرد دايماً حتى مفيش إيميل مسجّل (منع استكشاف العناوين).
      return NextResponse.json({ ok: true });
    } catch (e: any) {
      console.error("FORGOT_ERROR:", e?.message ?? e);
      return NextResponse.json({ error: "تعذّر الاتصال بقاعدة البيانات." }, { status: 500 });
    }
  }

  if (action === "reset") {
    // إعادة تعيين كلمة المرور: الكود صالح ٣٠ دقيقة ويُلغى بعد الاستخدام.
    try {
      if (!p.email || !p.code || !p.password) return NextResponse.json({ error: "اكتب كل البيانات المطلوبة." }, { status: 400 });
      if (String(p.password).length < 6) return NextResponse.json({ error: "كلمة المرور قصيرة جدًا (٦ أحرف على الأقل)." }, { status: 400 });

      const { db } = await connectToDatabase();
      const emailNorm = String(p.email).trim().toLowerCase();
      const u = await db.collection("users").findOne({ email: emailNorm });
      if (
        !u ||
        !u.resetCode ||
        !u.resetExpires ||
        u.resetExpires < Date.now() ||
        !(await verifyPassword(String(p.code), String(u.resetCode)))
      ) {
        return NextResponse.json({ error: "كود غير صحيح أو منتهي الصلاحية." }, { status: 401 });
      }

      await db
        .collection("users")
        .updateOne({ _id: u._id }, { $set: { password: await hashPassword(String(p.password)) }, $unset: { resetCode: "", resetExpires: "" } });
      return NextResponse.json({ ok: true });
    } catch (e: any) {
      console.error("RESET_ERROR:", e?.message ?? e);
      return NextResponse.json({ error: "تعذّر الاتصال بقاعدة البيانات." }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "إجراء غير معروف." }, { status: 404 });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (action !== "me") return NextResponse.json({ error: "إجراء غير معروف." }, { status: 404 });

  const s = await readToken();
  if (!s) return NextResponse.json({ error: "غير مسجّل دخول." }, { status: 401 });

  // نقرأ من الـ DB مباشرة (زي royal-quotes /api/me) عشان أي تعديل
  // يظهر فوراً (تغيير الدور، الحظر، إلغاء الحظر).
  const user = await getUserById(s.id);
  if (!user) return NextResponse.json({ error: "حساب غير موجود." }, { status: 401 });
  if (user.status !== "active") {
    return NextResponse.json({ error: "حسابك بانتظار موافقة المدير." }, { status: 403 });
  }

  return NextResponse.json({
    user: { ...user, pages: user.pages?.length ? user.pages : pagesForRole(user.role) },
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (action !== "profile") return NextResponse.json({ error: "إجراء غير معروف." }, { status: 404 });

  try {
    const user = await requireActiveUser();
    if (!user) return NextResponse.json({ error: "غير مسجّل دخول." }, { status: 401 });

    const p = await body(req);
    if (!p.name || !String(p.name).trim()) {
      return NextResponse.json({ error: "اكتب الاسم." }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const users = db.collection("users");
    const newName = String(p.name).trim();
    const u = await users.findOne({ _id: new ObjectId(user.id) });
    if (!u) return NextResponse.json({ error: "حساب غير موجود." }, { status: 404 });

    await users.updateOne({ _id: u._id }, { $set: { name: newName } });
    const fresh = { id: user.id, name: newName, email: user.email, role: user.role, status: user.status };
    await setSessionCookies(signAccess(fresh)); // نعيد إصدار access بالاسم الجديد فقط (refresh القديم يظل كما هو)
    return NextResponse.json({ user: fresh });
  } catch (e: any) {
    console.error("PROFILE_UPDATE_ERROR:", e?.message ?? e);
    return NextResponse.json({ error: "فشل تحديث الملف الشخصي." }, { status: 500 });
  }
}