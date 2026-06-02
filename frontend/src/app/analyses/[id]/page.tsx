"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { Header } from "@/components/Header";
import { ScoreRing } from "@/components/ScoreRing";
import { useToast } from "@/context/ToastContext";
import { api, type Analysis } from "@/lib/api";
import { VERDICT_LABEL, formatAnalysisDate, heroClass, repColor } from "@/lib/verdict";

export default function AnalysisDetailPage() {
  return (
    <AuthGuard>
      <AnalysisDetailContent />
    </AuthGuard>
  );
}

function AnalysisDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    api
      .getAnalysis(params.id)
      .then(setAnalysis)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleDelete() {
    if (!analysis || deleting) return;
    setDeleting(true);
    try {
      await api.deleteAnalysis(analysis.id);
      showToast("Análise excluída.");
      router.push("/dashboard");
    } catch {
      setError("Não foi possível excluir a análise.");
      setDeleting(false);
    }
  }

  const score = analysis ? Math.round(analysis.credibilityScore * 100) : 0;
  const rawSnippet = (analysis?.rawText || analysis?.inputText || analysis?.inputUrl || "").substring(
    0,
    600
  );

  return (
    <div className="page-shell">
      <Header />
      <div className="detail-body">
        <Link href="/dashboard" className="back-btn animate">
          <span className="back-arrow">←</span> Voltar ao dashboard
        </Link>

        {loading && <p style={{ color: "var(--text-3)" }}>Carregando…</p>}
        {error && <div className="error-msg">{error}</div>}

        {analysis && (
          <>
            <div className={`result-hero ${heroClass(analysis.verdict)} animate animate-d1`}>
              <ScoreRing score={analysis.credibilityScore} verdict={analysis.verdict} />
              <div className="hero-info">
                <div className={`verdict-big ${analysis.verdict}`}>
                  {VERDICT_LABEL[analysis.verdict]}
                </div>
                <div style={{ color: "var(--text-2)", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                  Score de credibilidade: {score}%
                </div>
                <div className="hero-date">{formatAnalysisDate(analysis.createdAt, true)}</div>
              </div>
            </div>

            {analysis.explanation && (
              <div className="detail-section animate animate-d2">
                <div className="detail-section-title">Explicação</div>
                <p className="explanation-text">{analysis.explanation}</p>
              </div>
            )}

            <div className="detail-section animate animate-d3">
              <div className="detail-section-title">
                Alegações verificadas ({analysis.claims.length})
              </div>
              {analysis.claims.length === 0 ? (
                <p style={{ color: "var(--text-3)", fontSize: "0.88rem" }}>
                  Nenhuma alegação extraída.
                </p>
              ) : (
                <div className="claims-list">
                  {analysis.claims.map((c) => (
                    <div key={c.id} className="claim-item">
                      <div className={`claim-icon ${c.isVerified ? "claim-ok" : "claim-fail"}`}>
                        {c.isVerified ? "✓" : "✗"}
                      </div>
                      <div className="claim-body">
                        <div className="claim-text">{c.text}</div>
                        <div className="claim-conf">
                          Confiança: {Math.round(c.confidence * 100)}%
                        </div>
                        {c.sourceUrl && (
                          <a
                            className="claim-source"
                            href={c.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            ↗ ver fonte
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="detail-section animate animate-d4">
              <div className="detail-section-title">Fontes relacionadas</div>
              {analysis.sources.length === 0 ? (
                <p style={{ color: "var(--text-3)", fontSize: "0.88rem" }}>
                  Nenhuma fonte relacionada encontrada.
                </p>
              ) : (
                <div className="sources-list">
                  {analysis.sources.map((s) => (
                    <div key={s.id} className="source-item">
                      <div className="source-domain">{s.domain}</div>
                      {s.isKnownSatire && <span className="satire-badge">SÁTIRA</span>}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div className="rep-bar">
                          <div
                            className="rep-fill"
                            style={{
                              width: `${Math.round(s.reputationScore * 100)}%`,
                              background: repColor(s.reputationScore),
                            }}
                          />
                        </div>
                        <span className="source-rep">
                          {Math.round(s.reputationScore * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {rawSnippet && (
              <div className="detail-section animate animate-d5">
                <div className="detail-section-title">Texto analisado</div>
                <div className="raw-text">{rawSnippet}</div>
              </div>
            )}

            <div className="danger-zone animate animate-d5">
              <button
                type="button"
                className="btn-danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Excluindo…" : "Excluir análise"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
