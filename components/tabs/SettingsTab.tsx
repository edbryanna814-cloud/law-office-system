"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/shared";
import type { AuthUser } from "@/components/auth/Login";

const DEFAULTS = { notify: true, mail: false, sessions: true, backup: true, twofa: false };
const loadPrefs = (): typeof DEFAULTS => {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem("lawer_prefs") ?? "{}") };
  } catch {
    return DEFAULTS;
  }
};

export function SettingsTab({
  user,
  onUserUpdate,
}: {
  user: AuthUser;
  onUserUpdate: (name: string) => void;
}) {
  const [s, setS] = useState(loadPrefs);
  const t = (k: keyof typeof s) =>
    setS((p) => {
      const next = { ...p, [k]: !p[k] };
      localStorage.setItem("lawer_prefs", JSON.stringify(next));
      return next;
    });

  const [name, setName] = useState(user.name);
  const [savedName, setSavedName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [passMsg, setPassMsg] = useState("");
  const [savingPass, setSavingPass] = useState(false);

  const exportBackup = async () => {
    try {
      const res = await fetch("/api/data/all");
      const data = await res.json();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "backup-" + new Date().toISOString().slice(0, 10) + ".json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("فشل إنشاء النسخة الاحتياطية");
    }
  };

  const saveName = async () => {
    if (!name.trim() || name.trim() === user.name) return;
    setSavingName(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        setSavedName("تم الحفظ ✓");
        onUserUpdate(name.trim());
        setTimeout(() => setSavedName(""), 2000);
      } else {
        const d = await res.json();
        setSavedName(d.error ?? "فشل الحفظ");
      }
    } catch {
      setSavedName("فشل الاتصال");
    }
    setSavingName(false);
  };

  const changePass = async () => {
    if (!curPass || newPass.length < 6) return;
    setSavingPass(true);
    setPassMsg("");
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current: curPass, newPassword: newPass }),
      });
      const d = await res.json();
      if (res.ok) {
        setPassMsg("تم تغيير كلمة المرور ✓");
        setCurPass("");
        setNewPass("");
      } else {
        setPassMsg(d.error ?? "فشل التغيير");
      }
    } catch {
      setPassMsg("فشل الاتصال");
    }
    setSavingPass(false);
  };

  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
      <div className="card">
        <h3>الملف الشخصي</h3>
        <div className="field" style={{ marginBottom: 14 }}>
          <label>الاسم</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 14 }}>
          <label>البريد الإلكتروني</label>
          <input className="input" value={user.email} disabled style={{ opacity: 0.6 }} />
        </div>
        <button className="btn block" onClick={saveName} disabled={savingName || !name.trim() || name.trim() === user.name}>
          {savedName || "حفظ الاسم"}
        </button>

        <div style={{ height: 1, background: "var(--line)", margin: "18px 0" }} />
        <h3>تغيير كلمة المرور</h3>
        <div className="field" style={{ marginBottom: 14 }}>
          <label>كلمة المرور الحالية</label>
          <input className="input" type="password" value={curPass} onChange={(e) => setCurPass(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 14 }}>
          <label>كلمة المرور الجديدة</label>
          <input className="input" type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="٦ أحرف على الأقل" />
        </div>
        <button className="btn block" onClick={changePass} disabled={savingPass || !curPass || newPass.length < 6}>
          {savingPass ? "جاري التغيير..." : "تغيير كلمة المرور"}
        </button>
        {passMsg && (
          <div className="muted" style={{ fontSize: 12, marginTop: 8, color: passMsg.includes("✓") ? "var(--teal)" : "#FF8296" }}>
            {passMsg}
          </div>
        )}
      </div>

      <div className="card">
        <h3>التنبيهات</h3>
        {[
          ["notify", "تنبيهات داخل النظام"],
          ["mail", "إشعار بالبريد"],
          ["sessions", "تذكير الجلسات قبل ٢٤ ساعة"],
        ].map(([k, l]) => (
          <div key={k} className="listrow">
            <span style={{ flex: 1, fontSize: 13.5 }}>{l}</span>
            <Switch on={s[k as keyof typeof s]} onChange={() => t(k as keyof typeof s)} />
          </div>
        ))}
        <div style={{ height: 1, background: "var(--line)", margin: "18px 0" }} />
        <h3>المنطقة الزمنية</h3>
        <select className="input" defaultValue="القاهرة (GMT+2)">
          <option>القاهرة (GMT+2)</option>
          <option>الرياض (GMT+3)</option>
          <option>دبي (GMT+4)</option>
        </select>
      </div>

      <div className="card">
        <h3>النسخ الاحتياطي</h3>
        <div className="listrow">
          <span style={{ flex: 1, fontSize: 13.5 }}>نسخة احتياطية يومية</span>
          <Switch on={s.backup} onChange={() => t("backup")} />
        </div>
        <div className="listrow">
          <span style={{ flex: 1, fontSize: 13.5 }}>تحقق بخطوتين</span>
          <Switch on={s.twofa} onChange={() => t("twofa")} />
        </div>
        <button className="btn block" style={{ marginTop: 14 }} onClick={exportBackup}>
          إنشاء نسخة الآن
        </button>
      </div>
    </div>
  );
}
