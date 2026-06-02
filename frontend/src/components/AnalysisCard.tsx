"use client";

import Link from "next/link";
import type { Analysis } from "@/lib/api";
import {
  VERDICT_LABEL,
  analysisSnippet,
  formatAnalysisDate,
  verdictColor,
} from "@/lib/verdict";

type AnalysisCardProps = {
  analysis: Analysis;
};

export function AnalysisCard({ analysis }: AnalysisCardProps) {
  const score = Math.round(analysis.credibilityScore * 100);
  const color = verdictColor(analysis.verdict);

  return (
    <Link href={`/analyses/${analysis.id}`} className="analysis-card">
      <div className="verdict-stripe" style={{ background: color }} />
      <div className="card-body">
        <div className="card-snippet">{analysisSnippet(analysis)}</div>
        <div className="card-meta">{formatAnalysisDate(analysis.createdAt)}</div>
        <div className="mini-bar">
          <div className="mini-fill" style={{ width: `${score}%`, background: color }} />
        </div>
      </div>
      <div className="card-right">
        <span className={`verdict-badge verdict-${analysis.verdict}`}>
          {VERDICT_LABEL[analysis.verdict]}
        </span>
        <span className={`score-num score-${analysis.verdict}`}>{score}%</span>
      </div>
    </Link>
  );
}
