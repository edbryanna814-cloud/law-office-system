import { mkdir, writeFile, unlink, readdir, rmdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const BASE = join(process.cwd(), "storage", "cases");

export function docDir(caseId: string) {
  return join(BASE, caseId);
}

export function docPaths(caseId: string, docId: string, ext: string) {
  const dir = docDir(caseId);
  return { dir, bin: join(dir, `${docId}.${ext}`), tex: join(dir, `${docId}.tex`) };
}

export async function saveFile(caseId: string, ext: string, buf: ArrayBuffer) {
  const id = randomUUID().slice(0, 12);
  const p = docPaths(caseId, id, ext);
  await mkdir(p.dir, { recursive: true });
  await writeFile(p.bin, new Uint8Array(buf));
  return { id, ...p };
}

export async function deleteFile(caseId: string, docId: string, ext: string) {
  const p = docPaths(caseId, docId, ext);
  await unlink(p.bin).catch(() => {});
  await unlink(p.tex).catch(() => {});
  try {
    const files = await readdir(p.dir);
    if (files.length === 0) await rmdir(p.dir);
  } catch {}
}

export async function extractText(buf: Buffer, ext: string): Promise<string | null> {
  try {
    if (ext === "pdf") {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buf) });
      const result = await parser.getText();
      await parser.destroy().catch(() => {});
      return result.text || null;
    }
    if (ext === "docx") {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: buf });
      return result.value || null;
    }
    if (ext === "doc") {
      const WordExtractor = (await import("word-extractor")).default;
      const doc = new WordExtractor();
      const extracted = await doc.extract(buf);
      const text = extracted?.getBody?.() ?? "";
      return text || null;
    }
    return null;
  } catch {
    return null;
  }
}

function escapeTex(s: string) {
  return s.replace(/\\/g, "\\textbackslash{}").replace(/[&%$#_{}~^]/g, (ch) => "\\" + ch);
}

export function toLatex(text: string, title: string) {
  return [
    "\\documentclass[12pt,a4paper]{article}",
    "\\usepackage{fontspec}",
    "\\usepackage[bidi=basic]{babel}",
    "\\defaultfontfeatures{Scale=1.15}",
    "\\usepackage[margin=2.5cm]{geometry}",
    "",
    "\\begin{document}",
    `\\section*{${escapeTex(title)}}`,
    "",
    text.split("\n").map((l) => (l.trim() ? escapeTex(l) : "\\medskip")).join("\n"),
    "\\end{document}",
  ].join("\n");
}

export const MIME: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  tex: "application/x-latex",
  img: "image/png",
};