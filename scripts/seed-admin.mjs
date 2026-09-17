#!/usr/bin/env node
// seed-admin.mjs — ponytail: يضيف (أو يحدّث) حساب أدمن جاهز بدخول فوري.
// بيقرا MONGODB_URI و MONGODB_DB من .env.local (نفس أسماء lib/db.ts).
// التشغيل:  npm run seed
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = {};
try {
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {
  // مفيش .env.local — نعتمد على process.env.
}

const uri = env.MONGODB_URI || process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI مش في .env.local");
  process.exit(1);
}
const dbName = env.MONGODB_DB || process.env.MONGODB_DB || "lawer_office";

const EMAIL = "edbryanna814@gmail.com".trim().toLowerCase();
const PASSWORD = "admin123456";
const NAME = "المدير العام";

const client = new MongoClient(uri);
try {
  await client.connect();
  const db = client.db(dbName);
  const users = db.collection("users");
  const hash = await bcrypt.hash(PASSWORD, 10);
  const existing = await users.findOne({ email: EMAIL });

  if (existing) {
    await users.updateOne(
      { email: EMAIL },
      { $set: { name: NAME, password: hash, role: "admin", status: "active", updatedAt: new Date() } },
    );
    console.log("تم تحديث الأدمن: " + EMAIL);
  } else {
    await users.insertOne({
      name: NAME,
      email: EMAIL,
      password: hash,
      role: "admin",
      status: "active",
      createdAt: new Date(),
    });
    console.log("تم إنشاء الأدمن: " + EMAIL);
  }
  console.log("البريد: " + EMAIL);
  console.log("كلمة المرور: " + PASSWORD);
} catch (e) {
  console.error("فشل الـ seed:", e?.message ?? e);
  process.exit(1);
} finally {
  await client.close();
}
