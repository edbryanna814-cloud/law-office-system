// اختبار شامل لـ API بالكامل (Auth + CRUD + رفع مستندات وتحويل LaTeX).
// التشغيل: سيرفر شغال على قاعدة 3999 ثم نفّذ: node tests/api-test.mjs
// اختياري: BASE_URL لتغيير البوابة.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.BASE_URL || "http://localhost:3999";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(__dirname, "fixtures");

const EMAIL = `test.${Date.now()}@demo.office`;
const PASS = "Test@12345";

// قاعدة اختبار نظيفة: نفضي الـ users أولاً عشان أول تسجيل ياخد دور admin نشط.
// القاعدة بتتحدد من نفس MONGODB_URI/DB اللي في .env.local — لازم يكون فيها "lawer"
// عشان نمنع المسح الخاطئ لأي قاعدة تانية بيننا وبينها.
const wipeTestDb = async () => {
  try {
    const envTxt = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
    const get = (k) => {
      const m = envTxt.match(new RegExp(`^${k}=(.+)$`, "m"));
      return m ? m[1].trim() : "";
    };
    const uri = get("MONGODB_URI");
    const dbName = get("MONGODB_DB") || "lawer_office";
    if (process.env.ALLOW_TEST_DB !== "1") return; // تشغيل يدوي آمن: بيشتغل الاختبار بس لو ARE فيه flag ALLOW_TEST_DB=1 صريح.
    if (!uri || !/lawer/i.test(dbName)) return; // مفيش اتصال آمن أو قاعدة مش قانونية — نتخطى.
    const { MongoClient } = await import("mongodb");
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    await db.collection("users").deleteMany({});
    await client.close();
    console.log("[wipe] مسحنا قاعدة اختبار " + dbName);
  } catch (e) {
    console.warn("[wipe] ماينفعش نفضي قاعدة الاختبار:", e?.message ?? e);
  }
};
await wipeTestDb();

// نزروّع عينة من كل كيان عشان الاختبار الـ seeded يلاقي بيانات حقيقية في الـ GET.
// نفس تحقق الأمان: مش بنكتب غير في قاعدة اسمه فيها "lawer".
const seedTestDb = async () => {
  try {
    const envTxt = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
    const get = (k) => {
      const m = envTxt.match(new RegExp(`^${k}=(.+)$`, "m"));
      return m ? m[1].trim() : "";
    };
    const uri = get("MONGODB_URI");
    const dbName = get("MONGODB_DB") || "lawer_office";
    if (process.env.ALLOW_TEST_DB !== "1") return; // مش پایيد في الاختبار — ننبس من غير لمس.
    if (!uri || !/lawer/i.test(dbName)) return; // مش قاعدة قانونية — ننبس من غير لمس.
    const { MongoClient } = await import("mongodb");
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    const fixtures = {
      cases: [{ id: "C-001", title: "قضية ١", client: "عميل١", court: "محكمة أول", type: "مدني", status: "نشطة", value: "5000" }],
      sessions: [{ id: "S-001", caseId: "C-001", date: "2024-01-10", note: "جلسة افتتاح" }],
      staff: [{ id: "ST-001", name: "موظف١", role: "lawyer", email: "staff1@demo.office" }],
      transactions: [{ id: "T-001", caseId: "C-001", amount: 250, kind: "رسوم" }],
      docs: [{ id: "D-001", n: "sample.pdf", caseId: "C-001", ext: "pdf", c: "C-001" }],
    };
    for (const [col, rows] of Object.entries(fixtures)) {
      await db.collection(col).deleteMany({ id: { $in: rows.map((r) => r.id) } });
      await db.collection(col).insertMany(rows);
    }
    await client.close();
    console.log("[seed] زرعنا عينات الاختبار في " + dbName);
  } catch (e) {
    console.warn("[seed] ماينفعش نزروّع:", e?.message ?? e);
  }
};
await seedTestDb();

let cookie = "";
const call = async (method, url, { body, form } = {}) => {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  let payload;
  if (form) {
    payload = form;
  } else if (body) {
    headers["content-type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(BASE + url, { method, headers, body: payload });
  const setc = res.headers.getSetCookie?.() ?? [];
  if (setc.length) cookie = setc.map((c) => c.split(";")[0]).join("; ");
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
};

test("1. register new user", async () => {
  const { status, json } = await call("POST", "/api/auth/register", { body: { name: "مختبَر", email: EMAIL, password: PASS } });
  assert.equal(status, 200);
  assert.ok(json.user?.id);
});

test("2. duplicate register = 409", async () => {
  const { status } = await call("POST", "/api/auth/register", { body: { name: "مختبَر", email: EMAIL, password: PASS } });
  assert.equal(status, 409);
});

// بعد أول تسجيل (admin نشط)، أي تسجيل جديد بيبقى "pending" ومش بيقدر يدخل — ده سلوك
// متعمد (موافقة المدير). نضيف حساب ثاني ونشوف أنه بيتحفظ فعلاً كمستخدم بانتظار التفعيل
// (يعني الـ API شغال في جمع المستخدمين لكن مش بيفتح الدخول لوحده):
test("2b. register second user → pending (يظهر عند المدير لكن دخوله محظور)", async () => {
  const EMAIL2 = `staff.${Date.now()}@demo.office`;
  const { status } = await call("POST", "/api/auth/register", { body: { name: "موظفة", email: EMAIL2, password: PASS } });
  assert.equal(status, 200); // ✗ الحساب اتسجل
  const { status: sLogin } = await call("POST", "/api/auth/login", { body: { email: EMAIL2, password: PASS } });
  assert.equal(sLogin, 403); // لكن مش قادر يدخل لحد ما المدير يوافق عليه
});

test("3. me = 200", async () => {
  const { status, json } = await call("GET", "/api/auth/me");
  assert.equal(status, 200);
  assert.equal(json.user.email, EMAIL);
});

test("4. wrong password = 401", async () => {
  const { status } = await call("POST", "/api/auth/login", { body: { email: EMAIL, password: "wrong" } });
  assert.equal(status, 401);
});

test("5. correct login = 200", async () => {
  const { status, json } = await call("POST", "/api/auth/login", { body: { email: EMAIL, password: PASS } });
  assert.equal(status, 200);
  assert.ok(json.user.id);
});

test("6. refresh = 200", async () => {
  const { status, json } = await call("POST", "/api/auth/refresh");
  assert.equal(status, 200);
  assert.ok(json.user.id);
});

test("7. forgot password = 200 (always ok)", async () => {
  const { status, json } = await call("POST", "/api/auth/forgot", { body: { email: EMAIL } });
  assert.equal(status, 200);
  assert.equal(json.ok, true);
});

test("8. reset with bad code = 401", async () => {
  const { status } = await call("POST", "/api/auth/reset", { body: { email: EMAIL, code: "000000", password: "NewPass987" } });
  assert.equal(status, 401);
});

// قبل اختبار 9 لازم يكون في زرع: القاعدة ممكن تكون فاضية. نزرع كيانًا من كل نوع
// بالـ POST المتاح (كل واحد برسالة ناجحة) لو ده مش متوفر نسلّم — وغالبًا المتوفر.
test("9a. POST one row into each of the 5 seeded entities", async () => {
  const rows = [
    ["cases", { id: "SD-001", title: "قضية معاينة", client: "موكل ت", court: "محكمة ت", type: "مدني", status: "نشطة", value: "100" }],
    ["sessions", { id: "SD-002", caseId: "SD-001", date: "2024-03-01", note: "إعادة" }],
    ["staff", { id: "SD-003", name: "موظف معاينة", role: "محامي", email: "sd-staff@demo.office" }],
    ["transactions", { id: "SD-004", caseId: "SD-001", amount: 101, kind: "سداد" }],
    ["docs", { id: "SD-005", n: "اكتتاب.pdf", caseId: "SD-001", ext: "pdf" }],
  ];
  for (const [resource, body] of rows) {
    const { status } = await call("POST", "/api/data/" + resource, { body });
    assert.ok(status === 200 || status === 409, resource + " لازم يتسجل (ممكن مكرر = مقبول)");
  }
});

test("9. GET /api/data seeded = 200 with all 5 entities", async () => {
  const { status, json } = await call("GET", "/api/data/all");
  assert.equal(status, 200);
  for (const k of ["cases", "sessions", "staff", "transactions", "docs"]) {
    assert.ok(Array.isArray(json[k]), k + " should be array");
    assert.ok(json[k].length > 0, k + " should be seeded");
  }
});

test("10. POST case = 200", async () => {
  const { status } = await call("POST", "/api/data/cases", {
    body: { id: "TST-001", title: "قضية اختبار", client: "موكل ت", court: "محكمة ت", type: "مدني", status: "نشطة", value: "1000" },
  });
  assert.equal(status, 200);
});

test("11. PUT case = 200 (update)", async () => {
  const { status } = await call("PUT", "/api/data/cases", {
    body: { id: "TST-001", title: "قضية بعد التعديل", archived: true },
  });
  assert.equal(status, 200);
});

test("12. DELETE case = 200 + gone from GET", async () => {
  const { status } = await call("DELETE", "/api/data/cases?id=TST-001");
  assert.equal(status, 200);
  const { json } = await call("GET", "/api/data/all");
  assert.ok(!json.cases.some((c) => c.id === "TST-001"));
});

test("13. upload pdf + docx → tex generated", async () => {
  const form = new FormData();
  form.append("caseId", "2024/118");
  form.append("files", new File([fs.readFileSync(path.join(fixtureDir, "sample.pdf"))], "sample.pdf", { type: "application/pdf" }));
  form.append("files", new File([fs.readFileSync(path.join(fixtureDir, "sample.docx"))], "sample.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }));
  const { status, json } = await call("POST", "/api/data/upload", { form });
  assert.equal(status, 200);
  const pdf = json.docs.find((d) => d.n === "sample.pdf");
  const docx = json.docs.find((d) => d.n === "sample.docx");
  assert.ok(pdf?.tex, "pdf should have tex");
  assert.ok(pdf.tex.includes("documentclass"), "pdf tex should be real LaTeX");
  assert.ok(docx?.tex, "docx should have tex");

  const { json: data } = await call("GET", "/api/data/all");
  const saved = data.docs.find((d) => d.id === pdf.id);
  assert.ok(saved?.tex?.includes("documentclass"));
  assert.equal(saved.c, "2024/118");
});

test("14. edit tex in-app → PUT persists", async () => {
  const { json: data } = await call("GET", "/api/data/all");
  const doc = data.docs.find((d) => d.n === "sample.pdf");
  const edited = `\\documentclass{article}\n% edited ${Date.now()}\n\\begin{document}\ntest\n\\end{document}`;
  const { status } = await call("PUT", "/api/data/docs", { body: { id: doc.id, tex: edited } });
  assert.equal(status, 200);
  const { json: data2 } = await call("GET", "/api/data/all");
  assert.match(data2.docs.find((d) => d.id === doc.id).tex, /% edited/);
});

test("15. fetch stored file = 200", async () => {
  const { json: data } = await call("GET", "/api/data/all");
  const doc = data.docs.find((d) => d.n === "sample.pdf");
  const res = await fetch(BASE + "/api/files/" + doc.id, { headers: { cookie } });
  assert.equal(res.status, 200);
  const buf = Buffer.from(await res.arrayBuffer());
  assert.ok(buf.length > 100, "should return file bytes");
});

test("16. delete doc cleans up", async () => {
  const { json: data } = await call("GET", "/api/data/all");
  const doc = data.docs.find((d) => d.n === "sample.pdf");
  const { status } = await call("DELETE", "/api/data/docs?id=" + doc.id);
  assert.equal(status, 200);
  const res = await fetch(BASE + "/api/files/" + doc.id, { headers: { cookie } });
  assert.equal(res.status, 404, "file should be gone from disk");
});

test("17. unauth /api/data = 401", async () => {
  const res = await fetch(BASE + "/api/data/all");
  assert.equal(res.status, 401);
});

test("18. logout = 200, then me = 401", async () => {
  const { status } = await call("POST", "/api/auth/logout");
  assert.equal(status, 200);
  cookie = "";
  const { status: s2 } = await call("GET", "/api/auth/me");
  assert.equal(s2, 401);
});