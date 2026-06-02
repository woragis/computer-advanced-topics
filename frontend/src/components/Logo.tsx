type LogoProps = {
  compact?: boolean;
};

export function RadarIcon() {
  return (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="18" r="17" stroke="#00c2e0" strokeWidth="1.4" opacity="0.3" />
      <circle cx="18" cy="18" r="11" stroke="#00c2e0" strokeWidth="1.4" opacity="0.5" />
      <circle cx="18" cy="18" r="5" stroke="#00c2e0" strokeWidth="1.4" opacity="0.8" />
      <circle cx="18" cy="18" r="2" fill="#00c2e0" />
      <line x1="18" y1="1" x2="18" y2="8" stroke="#00c2e0" strokeWidth="1.4" opacity="0.4" />
      <line x1="18" y1="28" x2="18" y2="35" stroke="#00c2e0" strokeWidth="1.4" opacity="0.4" />
      <line x1="1" y1="18" x2="8" y2="18" stroke="#00c2e0" strokeWidth="1.4" opacity="0.4" />
      <line x1="28" y1="18" x2="35" y2="18" stroke="#00c2e0" strokeWidth="1.4" opacity="0.4" />
      <path
        d="M18 7 L20 18 L18 18"
        stroke="#00c2e0"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}

export function Logo({ compact }: LogoProps) {
  return (
    <div className={`logo${compact ? " logo--compact" : ""}`}>
      <div className="logo-icon" style={compact ? { width: 28, height: 28 } : undefined}>
        <RadarIcon />
      </div>
      <span className="logo-text" style={compact ? { fontSize: "1rem" } : undefined}>
        Fake<span>Radar</span>
      </span>
    </div>
  );
}

export function ScanIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" opacity="0.5" />
      <circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.4" opacity="0.8" />
      <circle cx="8" cy="8" r="1" fill="currentColor" />
      <path d="M8 2.5 L8.8 8 L8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyRadarIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      <circle cx="24" cy="24" r="13" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <circle cx="24" cy="24" r="4" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
      <path
        d="M24 7 L25.5 24 L24 24"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}
