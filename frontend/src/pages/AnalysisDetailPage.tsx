import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { api, type Analysis } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function AnalysisDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;
    api
      .getAnalysis(id)
      .then(setAnalysis)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, user]);

  if (authLoading) return <div className="page">Carregando…</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="page">
      <p>
        <Link to="/dashboard">← Voltar</Link>
      </p>
      {loading && <p className="muted">Carregando…</p>}
      {error && <p className="error">{error}</p>}
      {analysis && (
        <article className="card stack">
          <div className="analysis-row">
            <span className={`verdict verdict-${analysis.verdict.toLowerCase()}`}>
              {analysis.verdict}
            </span>
            <span className="score">
              Credibilidade: {(analysis.credibilityScore * 100).toFixed(0)}%
            </span>
          </div>
          {analysis.explanation && <p>{analysis.explanation}</p>}
          <section>
            <h3>Claims ({analysis.claims.length})</h3>
            <ul className="claims">
              {analysis.claims.map((c) => (
                <li key={c.id}>
                  <span>{c.isVerified ? "✅" : "❌"}</span> {c.text}
                  {c.sourceUrl && (
                    <>
                      {" "}
                      <a href={c.sourceUrl} target="_blank" rel="noreferrer">
                        fonte
                      </a>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
          {analysis.rawText && (
            <section>
              <h3>Texto analisado</h3>
              <pre className="raw-text">{analysis.rawText}</pre>
            </section>
          )}
        </article>
      )}
    </div>
  );
}
