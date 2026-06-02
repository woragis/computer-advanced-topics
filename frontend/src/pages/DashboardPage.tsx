import { type FormEvent, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api, type Analysis } from "../lib/api";
import { useAuth } from "../context/AuthContext";

function verdictClass(verdict: Analysis["verdict"]) {
  return `verdict verdict-${verdict.toLowerCase()}`;
}

export default function DashboardPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [inputUrl, setInputUrl] = useState("");
  const [inputText, setInputText] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    if (!user) return;
    api
      .listAnalyses()
      .then(setAnalyses)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingList(false));
  }, [user]);

  if (authLoading) return <div className="page">Carregando…</div>;
  if (!user) return <Navigate to="/login" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>FakeRadar</h1>
          <p className="muted">{user.email}</p>
        </div>
        <button type="button" className="secondary" onClick={logout}>
          Sair
        </button>
      </header>

      <section className="card stack">
        <h2>Nova análise</h2>
        <form onSubmit={onSubmit} className="stack">
          <label>
            URL (opcional)
            <input
              type="url"
              placeholder="https://…"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
            />
          </label>
          <label>
            Texto (opcional)
            <textarea
              rows={5}
              placeholder="Cole o texto da notícia…"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={submitting || (!inputUrl.trim() && !inputText.trim())}>
            {submitting ? "Analisando…" : "Analisar"}
          </button>
        </form>
      </section>

      <section className="stack">
        <h2>Histórico</h2>
        {loadingList && <p className="muted">Carregando…</p>}
        {!loadingList && analyses.length === 0 && (
          <p className="muted">Nenhuma análise ainda.</p>
        )}
        <ul className="analysis-list">
          {analyses.map((a) => (
            <li key={a.id} className="card">
              <div className="analysis-row">
                <span className={verdictClass(a.verdict)}>{a.verdict}</span>
                <span className="score">{(a.credibilityScore * 100).toFixed(0)}%</span>
              </div>
              <p className="snippet">
                {a.inputText?.slice(0, 120) ?? a.inputUrl ?? a.rawText?.slice(0, 120) ?? "—"}
              </p>
              <Link to={`/analyses/${a.id}`}>Ver detalhes →</Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
