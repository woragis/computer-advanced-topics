"use client";

import { type FormEvent, useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { AnalysisCard } from "@/components/AnalysisCard";
import { Header } from "@/components/Header";
import { EmptyRadarIcon, ScanIcon } from "@/components/Logo";
import { useToast } from "@/context/ToastContext";
import { api, type Analysis } from "@/lib/api";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}

function DashboardContent() {
  const { showToast } = useToast();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [inputUrl, setInputUrl] = useState("");
  const [inputText, setInputText] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    api
      .listAnalyses()
      .then(setAnalyses)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingList(false));
  }, []);

  const canSubmit = Boolean(inputUrl.trim() || inputText.trim());

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setSubmitting(true);
    try {
      const created = await api.createAnalysis({
        inputUrl: inputUrl.trim() || undefined,
        inputText: inputText.trim() || undefined,
      });
      setAnalyses((prev) => [created, ...prev]);
      setInputUrl("");
      setInputText("");
      showToast("Análise concluída!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na análise.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-shell">
      <Header />
      <div className="dashboard-body">
        <div className="analyze-card animate animate-d1">
          <div className="section-label">// nova análise</div>
          <div className="section-title">O que deseja verificar?</div>

          <form onSubmit={onSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="input-url">
                URL da notícia
              </label>
              <input
                id="input-url"
                type="url"
                className="form-input"
                placeholder="https://exemplo.com/noticia"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
              />
            </div>

            <div className="or-divider">— ou —</div>

            <div className="form-group">
              <label className="form-label" htmlFor="input-text">
                Cole o texto
              </label>
              <textarea
                id="input-text"
                className="form-input"
                placeholder="Cole aqui o texto da notícia que deseja verificar..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
            </div>

            {error && <div className="error-msg">{error}</div>}

            <button
              type="submit"
              className={`scan-btn${submitting ? " scanning" : ""}`}
              disabled={!canSubmit || submitting}
            >
              {submitting ? (
                <>
                  <div className="radar-ring" />
                  ANALISANDO...
                </>
              ) : (
                <>
                  <ScanIcon />
                  ESCANEAR
                </>
              )}
            </button>
          </form>
        </div>

        <div className="animate animate-d2">
          <div className="history-header">
            <div>
              <div className="section-label">// histórico</div>
              <div className="section-title" style={{ marginBottom: 0 }}>
                Análises anteriores
              </div>
            </div>
            <div className="count-badge">
              {analyses.length} {analyses.length === 1 ? "análise" : "análises"}
            </div>
          </div>

          <div className="history-list">
            {loadingList && <p style={{ color: "var(--text-3)" }}>Carregando…</p>}
            {!loadingList && analyses.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">
                  <EmptyRadarIcon />
                </div>
                <p>
                  Nenhuma análise ainda.
                  <br />
                  Cole uma URL ou texto acima e clique em <strong>Escanear</strong>.
                </p>
              </div>
            )}
            {analyses.map((a) => (
              <AnalysisCard key={a.id} analysis={a} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
