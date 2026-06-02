import type { Verdict } from "@/lib/api";
import { verdictColor } from "@/lib/verdict";

type ScoreRingProps = {
  score: number;
  verdict: Verdict;
};

const R = 38;
const C = 2 * Math.PI * R;

export function ScoreRing({ score, verdict }: ScoreRingProps) {
  const pct = Math.round(score * 100);
  const color = verdictColor(verdict);
  const dash = C * (1 - score);

  return (
    <div className="score-ring">
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
        <circle
          cx="45"
          cy="45"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeDasharray={C}
          strokeDashoffset={dash}
          strokeLinecap="round"
        />
      </svg>
      <div className="score-ring-text">
        <span className="big-num" style={{ color }}>
          {pct}
        </span>
        <span className="pct">%</span>
      </div>
    </div>
  );
}
