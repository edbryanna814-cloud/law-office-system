// OCR عبر Space الرسمي baidu/Unlimited-OCR على HuggingFace (مفتوح/مجاني/رسمي).
// HF_OCR_MODEL = اسم الـ Space ("baidu/Unlimited-OCR") — ده الموديل اللي مثبت عليه في HF.
// الفكرة: NOVITA/HF-inference-api مافيش لهذا الموديل API ذاتي — الاستضافة الوحيدة هي الـ Space الرسمي.
// سقف: الـ Space shared وrate-limited؛ لو عايز تعمل حلو تعديل: بدّل المصدر لـ vLLM local.

import { Client, handle_file } from "@gradio/client";

// Cloned/scaled Space. الرسمي: https://huggingface.co/spaces/baidu/Unlimited-OCR
const SPACE = process.env.HF_OCR_MODEL || "baidu/Unlimited-OCR";

export async function hfOcrImage(buf: Buffer, mime: string): Promise<string | null> {
  try {
    const client = await Client.connect(SPACE, { hf_token: process.env.HUGGINGFACE_API_KEY as `hf_${string}` | undefined });
    const res = await client.predict(
      "/run_ocr", // api_name/path من config الـ Space — بياخد (image, mode, prompt)
      [
        handle_file(new Blob([new Uint8Array(buf)], { type: mime || "image/png" })),
        "gundam",
        "document parsing.",
      ]
    );
    const out = (res as any)?.data?.[0];
    if (out == null) return null;
    // الـ Space بيرجّع { text: "..." } (نص المستند + أحيانًا وسْم rect/تنظيف).
    let text = typeof out === "string" ? out : (out as any)?.text ?? (out as any)?.value ?? "";
    text = String(text)
      .replace(/<\|[^>]*>/g, "") // وسوم كشف <|ref|> <|det|>
      .replace(/\brect\b\s*$/g, "")
      .trim();
    return text || null;
  } catch (e: any) {
    console.warn("[ocr] فشل:", e?.message ?? e);
    return null;
  }
}