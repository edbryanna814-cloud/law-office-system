export const fmtSessionDate = (iso: string) => {
  if (!iso) return "";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
  } catch {
    return iso;
  }
};

export const fmtSessionTime = (t: string) => {
  if (!t) return "";
  try {
    return new Date("2000-01-01T" + t).toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" });
  } catch {
    return t;
  }
};
