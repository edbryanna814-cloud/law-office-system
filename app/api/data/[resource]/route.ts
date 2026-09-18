// Data موحّد: CRUD على كل الكيانات + الرفع + إدارة المستخدمين في ملف واحد بنمط [resource].
// — GET  /api/data/all                        : كل الكيانات التي يسمح بها الدور
// — POST /api/data/{entity}                    : إضافة (body يحتوي id)
// — PUT  /api/data/{entity}                    : تحديث (body يحتوي id)
// — DELETE /api/data/{entity}?id=X             : حذف
// — POST /api/data/upload (multipart)          : رفع ملفات لقضية
// — users (GET/PUT/DELETE)                     : إدارة المستخدمين (ادمن فقط)
// — roles (GET/POST/PUT/DELETE)                : إدارة الأدوار المخصصة (ادمن فقط)
import { writeFile, mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, toPlain } from "@/lib/db";
import { readToken, getUserById, hashPassword } from "@/lib/auth";
import { resolveRole } from "@/lib/roles";
import { SYSTEM_ROLES, PAGE_KEYS, ROLE_NAMES, DEFAULT_ROLE_PAGES } from "@/lib/pages";
import { extractText, toLatex } from "@/lib/files";
import { hfOcrImage } from "@/lib/ocr";
import { gdriveConfigured, gdriveUpload } from "@/lib/gdrive";
import { ghConfigured, ghUpload, ghDelete } from "@/lib/gh";

const ENTITIES = ["cases", "sessions", "staff", "transactions", "docs", "templates"] as const;
type Entity = (typeof ENTITIES)[number];

// كل entity ينتمي لصفحة — الدور يسمح بالصفحة دي ولا لأ؟
const ENTITY_PAGE: Record<Entity, string> = {
  cases: "cases",
  sessions: "sessions",
  staff: "staff",
  transactions: "finance",
  docs: "docs",
  templates: "docs",
};

const USER_STATUSES = ["active", "pending", "blocked"] as const;

const BASE = join(process.cwd(), "storage", "cases");

// ---------- helpers ----------

const fmtSize = (bytes: number) =>
  bytes / 1024 > 1024 ? (bytes / 1048576).toFixed(1) + " MB" : Math.round(bytes / 1024) + " KB";

const kindOf = (name: string): "pdf" | "doc" | "img" => {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (["doc", "docx"].includes(ext)) return "doc";
  return "img";
};

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  tex: "application/x-latex",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

// منع path traversal: مسموح بالأرقام والشرطات والأحرف فقط — الملفات خارج نطاق القضايا مرفوضة.
const sanitizeDir = (s: string) => s.replace(/[^a-zA-Z0-9\u0600-\u06FF\-_/]/g, "").replace(/\.\./g, "").replace(/\/+/g, "/").slice(0, 60);

async function body(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

// الحارس الموحّد: توكن صحيح + مستخدم موجود + الحساب مفعّل. القراءة من الـ DB
// مباشرة عشان أي حظر/تعطيل يظهر فوراً حتى لو الجلسة القديمة لسه حية.
async function guard() {
  const t = await readToken();
  if (!t) return null;
  const u = await getUserById(t.id);
  if (!u || u.status !== "active") return null;
  let pages = (u.pages?.length ? u.pages : null) as string[] | null;
  if (!pages) {
    // الأدوار المخصصة: نجيب صفحاتها من قاعدة الأدوار (لو لسه).
    const { db } = await connectToDatabase();
    const r = await db.collection("roles").findOne({ key: u.role });
    pages = (r?.pages as string[]) ?? resolveRole(u.role).pages;
  }
  return { user: u, pages };
}

const deny = () => NextResponse.json({ error: "غير مخوّل لهذا المورد." }, { status: 403 });

// كل مستخدم بدور (غير الأدمن) يبقى موظف: سجل staff مرتبط بـ uid = معرّف المستخدم.
const newEmpId = () => "EMP-" + String(Math.floor(1000 + Math.random() * 9000));

async function staffRoleName(db: any, key?: string) {
  if (!key || key === "admin") return ROLE_NAMES[key ?? ""] ?? key ?? "";
  const r = await db.collection("roles").findOne({ key });
  return (r?.name as string) ?? ROLE_NAMES[key] ?? key;
}

async function ensureStaff(db: any, user: any, createdBy: string) {
  const uid = String(user._id);
  const adm = user.role === "admin";
  const r = await staffRoleName(db, user.role);
  const found = await db.collection("staff").findOne({ uid });
  if (found) {
    await db.collection("staff").updateOne({ uid }, { $set: { n: user.name, r, adm } });
    return;
  }
  await db.collection("staff").insertOne({
    id: newEmpId(),
    uid,
    n: user.name,
    r,
    cases: 0,
    phone: "",
    mail: user.email ?? "",
    adm,
    _createdBy: createdBy,
  });
}

async function handleUpload(user: { id: string; name: string }, req: NextRequest) {
  const form = await req.formData();
  const files = form.getAll("files") as File[];
  const caseId = String(form.get("caseId") || "").trim();

  const { db } = await connectToDatabase();
  const docs = db.collection("docs");
  const safeCase = sanitizeDir(caseId);
  const caseDir = join(BASE, safeCase || "_");

  const saved = [];

  // خيار "رفع LaTeX يدويًا": form بيكم LaTeX مباشرة من غير ملف — لمّا الـ OCR ميقدرش يقرا الصور/الـ PDF
  const rawLatex = String(form.get("latex") || "").trim();
  const texName = String(form.get("name") || "").trim().slice(0, 100);
  if (rawLatex) {
    const id = "DOC-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e6).toString(36);
    const doc = {
      id,
      n: texName || "مستند LaTeX",
      s: "نص",
      k: "doc",
      c: safeCase || "_",
      file: null,
      gid: null,
      tex: rawLatex.includes("\\documentclass") ? rawLatex : toLatex(rawLatex, texName || "مستند"),
      by: user.name,
      created: new Date().toISOString(),
    };
    await docs.insertOne(doc);
    saved.push(doc);
    return NextResponse.json({ docs: saved });
  }

  if (!files.length) return NextResponse.json({ error: "مافيش ملفات مرفوعة." }, { status: 400 });

  for (const raw of files) {
    if (!(raw instanceof File)) continue;
    const buf = Buffer.from(await raw.arrayBuffer());
    const fileName = raw.name.replace(/[\\/:*?"<>|]/g, "_").slice(0, 100);
    const k = kindOf(fileName);
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "bin";

    const id = "DOC-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e6).toString(36);

    // التخزين: Google Drive → GitHub private repo → disk (fallback محلي).
    let gid: string | null = null;
    let gh: string | null = null;
    const mime = MIME[ext] ?? "application/octet-stream";
    if (gdriveConfigured()) {
      gid = await gdriveUpload(fileName, mime, buf);
    } else if (ghConfigured()) {
      const p = `${safeCase || "_"}/${id}.${ext}`.replace(/^\/+/, "");
      await ghUpload(p, buf, fileName);
      gh = p;
    } else {
      await mkdir(caseDir, { recursive: true });
      await writeFile(join(caseDir, `${id}.${ext}`), buf);
    }

    // For pdf/docx/doc: extract text + wrap to LaTeX, store FULL tex in DB.
    // Images: no local text layer → OCR via HuggingFace (if API key set).
    let tex: string | null = null;
    if (k === "img") {
      const rawText = await hfOcrImage(buf, MIME[ext] ?? "image/png");
      if (rawText) tex = toLatex(rawText, fileName);
    } else {
      const rawText = await extractText(buf, ext);
      if (rawText) tex = toLatex(rawText, fileName);
      else {
        const ocr = await hfOcrImage(buf, MIME[ext] ?? "application/octet-stream");
        if (ocr) tex = toLatex(ocr, fileName);
      }
    }

    const doc = {
      id,
      n: fileName,
      s: fmtSize(buf.length),
      k,
      c: safeCase || "_",
      file: gid ?? gh ?? `${id}.${ext}`,
      gid,
      gh,
      tex: tex ?? null,
      by: user.name,
      created: new Date().toISOString(),
    };
    await docs.insertOne(doc);
    saved.push(doc);
  }
  return NextResponse.json({ docs: saved });
}

// ---------- إدارة المستخدمين (ادمن فقط) ----------

async function adminGuard() {
  const g = await guard();
  if (!g) return null;
  if (g.user.role !== "admin") return null;
  return g;
}

// الأدوار المخصصة مخزنة في collection "roles". الأدوار النظامية من الكود ثابتة.
const cleanRolePages = (pages: unknown): string[] =>
  Array.isArray(pages) ? (pages as string[]).filter((p) => PAGE_KEYS.includes(p as any)) : [];

const roleExists = async (role: string): Promise<boolean> => {
  if (SYSTEM_ROLES.includes(role)) return true;
  const { db } = await connectToDatabase();
  return !!(await db.collection("roles").findOne({ key: role }));
};

const listRoles = async () => {
  const { db } = await connectToDatabase();
  const custom = await db.collection("roles").find({}).sort({ createdAt: 1 }).toArray();
  return [
    ...SYSTEM_ROLES.map((k) => ({ key: k, name: ROLE_NAMES[k], pages: DEFAULT_ROLE_PAGES[k] ?? [], system: true })),
    ...custom.map((r) => ({ key: r.key, name: r.name, pages: (r.pages ?? []) as string[], system: false })),
  ];
};

async function lastAdminCheck(db: any, targetId: string, message: string) {
  const target = await db.collection("users").findOne({ _id: new ObjectId(targetId) });
  if (target?.role === "admin") {
    const adminCount = await db.collection("users").countDocuments({ role: "admin" });
    if (adminCount <= 1) return NextResponse.json({ error: message }, { status: 400 });
  }
  return null;
}

async function listUsers() {
  const { db } = await connectToDatabase();
  const rows = (await db
    .collection("users")
    .find({}, { projection: { password: 0 } })
    .sort({ createdAt: 1 })
    .toArray()) as any[];
  return rows.map((u) => ({
    id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role || "lawyer",
    status: u.status || "active",
    pages: u.pages as string[] | undefined,
    createdAt: u.createdAt,
  }));
}

// ---------- routes ----------

export async function GET(req: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const g = await guard();
  if (!g) return NextResponse.json({ error: "غير مسجّل دخول أو الحساب غير مفعّل." }, { status: 401 });
  const { resource } = await params;

  if (resource === "users") {
    if (g.user.role !== "admin") return deny();
    return NextResponse.json({ users: await listUsers() });
  }

  if (resource === "roles") {
    if (g.user.role !== "admin") return deny();
    return NextResponse.json({ roles: await listRoles() });
  }

  if (resource !== "all") return NextResponse.json({ error: "غير معروف." }, { status: 404 });

  try {
    const { db } = await connectToDatabase();
    const out: Record<string, any[]> = {};
    // مزامنة: كل المستخدمين (بما فيهم الأدمن) يظهرون كموظفين. سجل الأدمن لا يظهر لغير الأدمن.
    if (g.pages.includes("staff")) {
      const all = (await db.collection("users").find({}).toArray()) as any[];
      for (const u of all) await ensureStaff(db, u, g.user.id);
    }
    const callerAdmin = g.user.role === "admin";
    await Promise.all(
      ENTITIES.map(async (e) => {
        let rows = g.pages.includes(ENTITY_PAGE[e])
          ? (await db.collection(e).find({}).toArray()).map(toPlain)
          : [];
        if (e === "staff" && !callerAdmin) rows = rows.filter((s: any) => !s.adm);
        out[e] = rows;
      })
    );
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: "تعذّر الاتصال بقاعدة البيانات: " + (e?.message ?? "") }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const g = await guard();
  if (!g) return NextResponse.json({ error: "غير مسجّل دخول أو الحساب غير مفعّل." }, { status: 401 });
  const { resource } = await params;

  // إضافة مستخدم جديد (ادمن فقط)
  if (resource === "users") {
    if (g.user.role !== "admin") return deny();
    const data = await body(req);
    if (!data?.name || !data?.email || !data?.password) {
      return NextResponse.json({ error: "اكتب الاسم والبريد وكلمة المرور." }, { status: 400 });
    }
    if (String(data.password).length < 6) {
      return NextResponse.json({ error: "كلمة المرور قصيرة جدًا (٦ أحرف على الأقل)." }, { status: 400 });
    }
    if (data.role && !(await roleExists(data.role))) {
      return NextResponse.json({ error: "دور غير معروف." }, { status: 400 });
    }
    const emailNorm = String(data.email).trim().toLowerCase();
    const pages = Array.isArray(data.pages) ? (data.pages as string[]).filter((p) => PAGE_KEYS.includes(p as any)) : undefined;
    try {
      const { db } = await connectToDatabase();
      const users = db.collection("users");
      if (await users.findOne({ email: emailNorm })) {
        return NextResponse.json({ error: "البريد الإلكتروني مسجّل من قبل." }, { status: 409 });
      }
      const role = data.role || "lawyer";
      const ins = await users.insertOne({
        name: String(data.name).trim(),
        email: emailNorm,
        password: await hashPassword(String(data.password)),
        role,
        status: "active",
        pages: pages?.length ? pages : undefined,
        createdAt: new Date(),
      });
      await ensureStaff(db, { _id: ins.insertedId, name: String(data.name).trim(), role, email: emailNorm }, g.user.id);
      return NextResponse.json({ ok: true });
    } catch (e: any) {
      return NextResponse.json({ error: e?.message ?? "DB error" }, { status: 500 });
    }
  }

  // إضافة دور مخصص (ادمن فقط)
  if (resource === "roles") {
    if (g.user.role !== "admin") return deny();
    const data = await body(req);
    const name = String(data?.name || "").trim();
    const pages = cleanRolePages(data?.pages);
    if (!name) return NextResponse.json({ error: "اكتب اسم الدور." }, { status: 400 });
    if (!pages.length) return NextResponse.json({ error: "حدد صفحة واحدة على الأقل لهذا الدور." }, { status: 400 });
    try {
      const { db } = await connectToDatabase();
      const roles = db.collection("roles");
      if (SYSTEM_ROLES.includes(name) || (await roles.findOne({ name }))) {
        return NextResponse.json({ error: "يوجد دور بنفس الاسم." }, { status: 409 });
      }
      const key = "custom_" + Date.now().toString(36) + "_" + Math.floor(Math.random() * 1e6).toString(36);
      await roles.insertOne({ key, name, pages, createdAt: new Date() });
      return NextResponse.json({ ok: true, key });
    } catch (e: any) {
      return NextResponse.json({ error: e?.message ?? "DB error" }, { status: 500 });
    }
  }

  if (resource === "upload") {
    if (!g.pages.includes("docs")) return deny();
    try {
      return await handleUpload(g.user, req);
    } catch (e: any) {
      console.error("UPLOAD_ERROR:", e?.message ?? e);
      return NextResponse.json({ error: "فشل رفع الملف: " + (e?.message ?? "unknown") }, { status: 500 });
    }
  }

  const entity = resource as Entity;
  if (!ENTITIES.includes(entity)) return NextResponse.json({ error: "كيان غير معروف." }, { status: 400 });
  if (!g.pages.includes(ENTITY_PAGE[entity])) return deny();
  const data = await body(req);
  if (!data?.id) return NextResponse.json({ error: "محتاج id." }, { status: 400 });

  try {
    const { db } = await connectToDatabase();
    await db.collection(entity).insertOne({ ...data, _createdBy: g.user.id });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "DB error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const g = await guard();
  if (!g) return NextResponse.json({ error: "غير مسجّل دخول أو الحساب غير مفعّل." }, { status: 401 });
  const { resource } = await params;
  const p = await body(req);

  if (resource === "users") {
    if (g.user.role !== "admin") return deny();
    const id = req.nextUrl.searchParams.get("id") ?? p?.id;
    if (!id) return NextResponse.json({ error: "معرف مفقود." }, { status: 400 });
    const { db } = await connectToDatabase();
    const users = db.collection("users");

    const set: any = {};
    if (p.name !== undefined) {
      const nm = String(p.name).trim();
      if (!nm) return NextResponse.json({ error: "اكتب الاسم." }, { status: 400 });
      set.name = nm;
    }
    if (p.role !== undefined) {
      if (!(await roleExists(p.role))) return NextResponse.json({ error: "دور غير معروف." }, { status: 400 });
      if (String(id) === g.user.id && p.role !== "admin")
        return NextResponse.json({ error: "لا يمكنك إسقاط دور المدير عن نفسك." }, { status: 400 });
      const adminErr = await lastAdminCheck(db, id, "لا يمكن إسقاط آخر مدير.");
      if (adminErr) return adminErr;
      set.role = p.role;
    }
    if (p.pages !== undefined) {
      if (!Array.isArray(p.pages)) return NextResponse.json({ error: "صلاحيات غير صالحة." }, { status: 400 });
      const cleanPages = (p.pages as string[]).filter((x) => PAGE_KEYS.includes(x as any));
      set.pages = cleanPages.length ? cleanPages : undefined;
    }
    if (p.password) {
      if (String(p.password).length < 6) return NextResponse.json({ error: "كلمة المرور قصيرة جدًا." }, { status: 400 });
      if (String(id) === g.user.id)
        return NextResponse.json({ error: "غيّر كلمة مرورك من الإعدادات." }, { status: 400 });
      set.password = await hashPassword(String(p.password));
    }
    if (p.status !== undefined) {
      if (!USER_STATUSES.includes(p.status)) return NextResponse.json({ error: "حالة غير معروفة." }, { status: 400 });
      if (p.status !== "active") {
        if (String(id) === g.user.id) return NextResponse.json({ error: "لا يمكنك حظر نفسك." }, { status: 400 });
        const adminErr = await lastAdminCheck(db, id, "لا يمكن حظر آخر مدير.");
        if (adminErr) return adminErr;
        await db.collection("auth_sessions").deleteMany({ userId: String(id) });
      }
      set.status = p.status;
    }
    if (Object.keys(set).length === 0) return NextResponse.json({ error: "لا توجد بيانات للتعديل." }, { status: 400 });

    const res = await users.updateOne({ _id: new ObjectId(id) }, { $set: set });
    if (res.matchedCount === 0) return NextResponse.json({ error: "المستخدم غير موجود." }, { status: 404 });
    // مزامنة سجل الموظف عند تغيّر الاسم أو الدور (الأدمن يتحوّل لسجل موظف مخفي عن غير الأدمن).
    if (set.role !== undefined || set.name !== undefined) {
      const u = (await users.findOne({ _id: new ObjectId(id) })) as any;
      if (u) await ensureStaff(db, u, g.user.id);
    }
    return NextResponse.json({ ok: true });
  }

  // تعديل دور مخصص (ادمن فقط)
  if (resource === "roles") {
    if (g.user.role !== "admin") return deny();
    const key = p.key;
    if (!key) return NextResponse.json({ error: "معرف الدّور ناقص." }, { status: 400 });
    const name = String(p.name || "").trim();
    const pages = cleanRolePages(p.pages);
    if (!name) return NextResponse.json({ error: "اكتب اسم الدور." }, { status: 400 });
    if (!pages.length) return NextResponse.json({ error: "حدد صفحة واحدة على الأقل لهذا الدور." }, { status: 400 });
    try {
      const { db } = await connectToDatabase();
      const roles = db.collection("roles");
      const clash = await roles.findOne({ name, key: { $ne: key } });
      if (clash) return NextResponse.json({ error: "يوجد دور بنفس الاسم." }, { status: 409 });
      const res = await roles.updateOne({ key }, { $set: { name, pages } });
      if (res.matchedCount === 0) return NextResponse.json({ error: "الدور غير موجود." }, { status: 404 });
      // نحدّث users اللي شايلة ده الدور عشان يظل الدور مرجعهم (pages تظل مخصصة إفتراضياً إن مفيش override)
      await db.collection("users").updateMany({ role: key }, { $set: { pages: pages } });
      return NextResponse.json({ ok: true });
    } catch (e: any) {
      return NextResponse.json({ error: e?.message ?? "DB error" }, { status: 500 });
    }
  }

  const entity = resource as Entity;
  if (!ENTITIES.includes(entity)) return NextResponse.json({ error: "كيان غير معروف." }, { status: 400 });
  if (!g.pages.includes(ENTITY_PAGE[entity])) return deny();
  const data = p;
  if (!data?.id) return NextResponse.json({ error: "محتاج id." }, { status: 400 });

  try {
    const { db } = await connectToDatabase();
    const { id, ...rest } = data;
    await db.collection(entity).updateOne({ id }, { $set: rest });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "DB error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const g = await guard();
  if (!g) return NextResponse.json({ error: "غير مسجّل دخول أو الحساب غير مفعّل." }, { status: 401 });
  const { resource } = await params;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "محتاج id." }, { status: 400 });

  if (resource === "users") {
    if (g.user.role !== "admin") return deny();
    if (String(id) === g.user.id) return NextResponse.json({ error: "لا يمكنك حذف نفسك." }, { status: 400 });
    const { db } = await connectToDatabase();
    const adminErr = await lastAdminCheck(db, id, "لا يمكن حذف آخر مدير.");
    if (adminErr) return adminErr;
    const res = await db.collection("users").deleteOne({ _id: new ObjectId(id) });
    if (res.deletedCount === 0) return NextResponse.json({ error: "المستخدم غير موجود." }, { status: 404 });
    await db.collection("auth_sessions").deleteMany({ userId: String(id) });
    await db.collection("staff").deleteOne({ uid: String(id) });
    return NextResponse.json({ ok: true });
  }

  if (resource === "roles") {
    if (g.user.role !== "admin") return deny();
    const { db } = await connectToDatabase();
    const used = await db.collection("users").countDocuments({ role: id });
    if (used > 0) return NextResponse.json({ error: "لا يمكن حذف دور مسند لمستخدم — غيّر دور المستخدم أولًا." }, { status: 400 });
    const roles = await db.collection("roles").deleteOne({ key: id });
    if (roles.deletedCount === 0) return NextResponse.json({ error: "الدور غير موجود." }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  const entity = resource as Entity;
  if (!ENTITIES.includes(entity)) return NextResponse.json({ error: "كيان غير معروف." }, { status: 400 });
  if (!g.pages.includes(ENTITY_PAGE[entity])) return deny();

  try {
    const { db } = await connectToDatabase();
    if (entity === "docs") {
      const doc = await db.collection("docs").findOne({ id });
      if (doc?.gid) {
        const { gdriveDelete } = await import("@/lib/gdrive");
        await gdriveDelete(doc.gid).catch(() => {});
      } else if (doc?.gh) {
        await ghDelete(doc.gh).catch(() => {});
      } else if (doc?.file && doc?.c) {
        const path = join(process.cwd(), "storage", "cases", doc.c, doc.file);
        await unlink(path).catch(() => {});
      }
    }
    await db.collection(entity).deleteOne({ id });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "DB error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";