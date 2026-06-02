import type { Verdict } from "./api";

export const VERDICT_LABEL: Record<Verdict, string> = {
  RELIABLE: "Confiável",
  SUSPICIOUS: "Suspeito",
  FAKE: "Falso",
};

export function verdictColor(verdict: Verdict): string {
  if (verdict === "RELIABLE") return "var(--ok)";
  if (verdict === "SUSPICIOUS") return "var(--warn)";
  return "var(--danger)";
}

export function heroClass(verdict: Verdict): string {
  if (verdict === "RELIABLE") return "hero-reliable";
  if (verdict === "SUSPICIOUS") return "hero-suspicious";
  return "hero-fake";
}

export function formatAnalysisDate(iso: string, long = false): string {
  const d = new Date(iso);
  if (long) {
    return d.toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function analysisSnippet(a: {
  inputUrl?: string | null;
  inputText?: string | null;
  rawText?: string | null;
}): string {
  const raw = a.inputUrl || a.inputText || a.rawText || "";
  if (raw.length <= 100) return raw || "—";
  return raw.substring(0, 100) + "…";
}

export function userInitials(email: string): string {
  return email[0]?.toUpperCase() ?? "U";
}

export function repColor(score: number): string {
  if (score > 0.7) return "var(--ok)";
  if (score > 0.4) return "var(--warn)";
  return "var(--danger)";
}
