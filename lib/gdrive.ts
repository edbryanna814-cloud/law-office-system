// رفع الملفات على Google Drive بدل الهارد — عبر service account (jose جاهز للتوقيع).
import { SignJWT, importPKCS8 } from "jose";

const SCOPES = "";
const TOKEN_URL = "";

// ponytail: token cache global — تكفي سكوب واحد؛ لو تشغّل كذا instance غيّرها لـ shared cache.
let cached: { token: string; exp: number } | null = null;

export const gdriveConfigured = () => Boolean(process.env.GDRIVE_CLIENT_EMAIL && process.env.GDRIVE_PRIVATE_KEY);

async function accessToken(): Promise<string> {
  if (cached && cached.exp > Date.now()) return cached.token;
  const clientEmail = process.env.GDRIVE_CLIENT_EMAIL!;
  const privateKey = await importPKCS8(process.env.GDRIVE_PRIVATE_KEY!.replace(/\\n/g, "\n"), "RS256");
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({ scope: SCOPES })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(clientEmail)
    .setAudience(TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  if (!res.ok) throw new Error("Google Drive: فشل الحصول على توكن (" + res.status + ")");
  const data = await res.json();
  cached = { token: data.access_token, exp: Date.now() + (data.expires_in - 60) * 1000 };
  return cached.token;
}

async function gFetch(url: string, init?: RequestInit) {
  const token = await accessToken();
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
  return res;
}

export async function gdriveUpload(fileName: string, mime: string, buf: Buffer, folderId?: string): Promise<string> {
  const folder = folderId || process.env.GDRIVE_FOLDER_ID;
  const meta = { name: fileName, mimeType: mime, ...(folder ? { parents: [folder] } : {}) };
  const boundary = "lawer" + Date.now();
  const parts = [
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\n` +
        `Content-Type: ${mime}\r\n\r\n`
    ),
    buf,
    Buffer.from(`\r\n--${boundary}--`),
  ];
  const body = Buffer.concat(parts);
  const res = await gFetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,kind", { method: "POST", body });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error("Google Drive: فشل الرفع (" + res.status + ") " + txt.slice(0, 200));
  }
  return (await res.json()).id;
}

export async function gdriveDownload(id: string): Promise<{ buf: Buffer; mime: string; name: string }> {
  const res = await gFetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, { method: "GET" });
  if (!res.ok) throw new Error("Google Drive: فشل التحميل (" + res.status + ")");
  return { buf: Buffer.from(await res.arrayBuffer()), mime: res.headers.get("content-type") ?? "application/octet-stream", name: id };
}

export async function gdriveDelete(id: string): Promise<void> {
  await gFetch(`https://www.googleapis.com/drive/v3/files/${id}`, { method: "DELETE" });
}

export async function gdriveEnsureFolder(name: string): Promise<string> {
  const res = await gFetch(
    `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.folder'%20and%20name='${encodeURIComponent(name)}'%20and%20trashed=false&fields=files(id,name)`,
    { method: "GET" }
  );
  if (!res.ok) throw new Error("Google Drive: فشل البحث عن المجلد (" + res.status + ")");
  const data = await res.json();
  if (data.files?.length) return data.files[0].id;
  const created = await gFetch("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder" }),
  });
  if (!created.ok) throw new Error("Google Drive: فشل إنشاء المجلد (" + created.status + ")");
  return (await created.json()).id;
}
