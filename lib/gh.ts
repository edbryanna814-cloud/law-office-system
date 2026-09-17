// تخزين الملفات على مستودع GitHub خاص (بيشتغل على Vercel/serverless — الـ disk مش بيثبت هناك).
// — GITHUB_TOKEN: fine-grained Personal Access Token (الصلاحيات: Contents: Read and write على الـ storage repo بس).
//   https://github.com/settings/personal-access-tokens/new   →  نجيب منه، ونتجنب using بي الشغل أو repo آخر.
// — GITHUB_STORAGE_REPO: "owner/name" للمستودع الخاص (مثال: "edbryanna814/lawer-storage").
// سقف: كل رفع بيعمل commit جديد على الـ repo؛ الملفات الكبيرة جدًا (>100MB) مرفوضة من GitHub. آلاف الملفات = repo كبير.

const REPO = process.env.GITHUB_STORAGE_REPO || "";
const TOKEN = process.env.GITHUB_TOKEN || "";

export const ghConfigured = () => Boolean(REPO && TOKEN);

const base = (path: string) => `https://api.github.com/repos/${REPO}/contents/${encodeURIComponent(path)}`;

async function ghFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  return res;
}

export async function ghUpload(path: string, buf: Buffer, name: string): Promise<string> {
  const res = await ghFetch(base(path), {
    method: "PUT",
    body: JSON.stringify({
      message: `upload ${name}`,
      content: buf.toString("base64"),
    }),
  });
  if (!res.ok) throw new Error("GitHub storage: فشل الرفع (" + res.status + ") " + (await res.text()).slice(0, 200));
  return path;
}

export async function ghDownload(path: string): Promise<{ buf: Buffer; name: string }> {
  const res = await ghFetch(base(path), { headers: { Accept: "application/vnd.github.raw" } });
  if (!res.ok) throw new Error("GitHub storage: فشل التحميل (" + res.status + ")");
  return { buf: Buffer.from(await res.arrayBuffer()), name: path.split("/").pop() ?? "file" };
}

export async function ghDelete(path: string): Promise<void> {
  const info = await ghFetch(base(path)).catch(() => null);
  if (!info || info.status === 404) return;
  const { sha } = await info.json();
  if (!sha) return;
  await ghFetch(base(path), { method: "DELETE", body: JSON.stringify({ message: "delete " + path, sha }) });
}