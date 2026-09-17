import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { readToken } from "@/lib/auth";
import { gdriveDownload } from "@/lib/gdrive";

const BASE = join(process.cwd(), "storage", "cases");

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  tex: "application/x-latex",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await readToken();
  if (!user) return NextResponse.json({ error: "غير مسجّل دخول." }, { status: 401 });

  const { db } = await connectToDatabase();
  const doc = await db.collection("docs").findOne({ id: params.id });
  if (!doc) return NextResponse.json({ error: "المستند غير موجود." }, { status: 404 });

  const caseId = doc.c;
  const fileName = doc.file;
  if (!caseId || !fileName) return NextResponse.json({ error: "الملف غير موجود." }, { status: 404 });

  try {
    if (doc.gid) {
      const { buf, mime } = await gdriveDownload(doc.gid);
      const ext = (doc.n.split(".").pop() ?? "").toLowerCase();
return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": mime ?? MIME[ext] ?? "application/octet-stream",
          "Content-Disposition": `inline; filename="${encodeURIComponent(doc.n)}"`,
          "Cache-Control": "private, max-age=3600",
        },
      });
    }
    if (doc.gh) {
      const { ghDownload } = await import("@/lib/gh");
      const { buf } = await ghDownload(doc.gh);
      const ext = (fileName.split(".").pop() ?? "").toLowerCase();
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": MIME[ext] ?? "application/octet-stream",
          "Content-Disposition": `inline; filename="${encodeURIComponent(doc.n)}"`,
          "Cache-Control": "private, max-age=3600",
        },
      });
    }
    const buf = await readFile(join(BASE, caseId, fileName));
    const ext = (fileName.split(".").pop() ?? "").toLowerCase();
    return new NextResponse(buf, {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(doc.n)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "الملف غير موجود على السيرفر." }, { status: 404 });
  }
}

export const dynamic = "force-dynamic";
