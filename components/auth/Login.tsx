"use client";

import { useState } from "react";
import { Ico, I, Scales } from "@/components/ui/icons";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  status?: string;
  pages?: string[];
}

export function Login({ onLogin }: { onLogin: (u: AuthUser) => void }) {
  const [mode, setMode] = useState<"login" | "forgot" | "reset">("login");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const submit = async () => {
    if (busy) return;
    setErr("");
    setMsg("");
    if (!email) return setErr("اكتب البريد الإلكتروني.");
    if (mode === "login" && !pass) return setErr("اكتب كلمة المرور.");
    if (mode === "reset" && (!code || pass.length < 6)) return setErr("اكتب كود الاستعادة وكلمة مرور جديدة (٦ أحرف على الأقل).");

    setBusy(true);
    try {
      const res = await fetch("/api/auth/" + mode, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "reset"
            ? { email, code, password: pass }
            : { email, password: pass },
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "حصل خطأ.");
      if (mode === "forgot") {
        setMsg("لو البريد مسجّل عندنا، هيوصلك كود استعادة خلال دقائق.");
        setMode("reset");
        return;
      }
      if (mode === "reset") {
        setMsg("تم تغيير كلمة المرور. سجّل دخول بالكلمة الجديدة.");
        setMode("login");
        setPass("");
        setCode("");
        return;
      }
      onLogin(data.user);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "حصل خطأ.");
    } finally {
      setBusy(false);
    }
  };

  const go = (m: typeof mode) => {
    setMode(m);
    setErr("");
    setMsg("");
  };

  return (
    <div className="login">
      <div className="scales" style={{ color: "#8FB6FF" }}>
        <Scales size={340} />
      </div>
      <div className="login-card">
        <div style={{ textAlign: "center", color: "#63A8FF", marginBottom: 10 }}>
          <Scales size={54} />
        </div>
        <h2>
          {mode === "login" ? "تسجيل الدخول" : mode === "forgot" ? "نسيت كلمة المرور" : "استعادة كلمة المرور"}
        </h2>
        <p className="muted" style={{ textAlign: "center", margin: "0 0 24px", fontSize: 13 }}>
          نظام إدارة مكتب المحاماة
        </p>
        <div className="field" style={{ marginBottom: 14 }}>
          <label>البريد الإلكتروني</label>
          <input
            className="input"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="name@office.eg"
          />
        </div>
        {mode === "login" && (
          <div className="field" style={{ marginBottom: 18 }}>
            <label>كلمة المرور</label>
            <input
              className="input"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="••••••••"
            />
          </div>
        )}
        {mode === "reset" && (
          <>
            <div className="field" style={{ marginBottom: 14 }}>
              <label>كود الاستعادة</label>
              <input
                className="input"
                dir="ltr"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="123456"
              />
            </div>
            <div className="field" style={{ marginBottom: 18 }}>
              <label>كلمة مرور جديدة</label>
              <input
                className="input"
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="••••••••"
              />
            </div>
          </>
        )}
        {err && (
          <div className="pill red" style={{ width: "100%", justifyContent: "center", marginBottom: 14, padding: "9px" }}>
            {err}
          </div>
        )}
        {msg && (
          <div className="pill teal" style={{ width: "100%", justifyContent: "center", marginBottom: 14, padding: "9px" }}>
            {msg}
          </div>
        )}
        <button className="btn block" onClick={submit} disabled={busy}>
          {busy ? "جاري..." : mode === "login" ? "دخول" : mode === "forgot" ? "إرسال كود الاستعادة" : "تغيير كلمة المرور"}
        </button>
        {mode === "login" && (
          <div className="row" style={{ justifyContent: "center", marginTop: 12, fontSize: 12.5 }}>
            <button className="muted" style={{ color: "#63A8FF" }} onClick={() => go("forgot")}>
              نسيت كلمة المرور؟
            </button>
          </div>
        )}
        {mode !== "login" && (
          <div className="row" style={{ justifyContent: "center", marginTop: 16, fontSize: 12.5 }}>
            <button className="muted" style={{ color: "#63A8FF" }} onClick={() => go("login")}>
              رجوع لتسجيل الدخول
            </button>
          </div>
        )}
      </div>
    </div>
  );
}