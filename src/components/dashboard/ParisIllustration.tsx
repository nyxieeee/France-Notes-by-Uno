// Soft Paris skyline for the home hero — drawn in the theme's rose tones
export default function ParisIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 200" className={className} aria-hidden="true" preserveAspectRatio="xMaxYMax slice">
      <defs>
        <linearGradient id="paris-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.45" />
        </linearGradient>
        <linearGradient id="paris-tower" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--pink)" stopOpacity="0.75" />
          <stop offset="100%" stopColor="var(--pink)" stopOpacity="0.45" />
        </linearGradient>
      </defs>

      <rect width="320" height="200" fill="url(#paris-sky)" />
      <circle cx="250" cy="70" r="34" fill="var(--card)" opacity="0.7" />

      {/* Far skyline */}
      <path
        d="M0 170 L0 150 L18 150 L18 138 L34 138 L34 152 L52 152 L52 132 L60 124 L68 132 L68 150 L90 150 L90 140 L108 140 L108 156 L130 156 L130 146 L150 146 L150 170 Z"
        fill="var(--accent)" opacity="0.55"
      />
      <path
        d="M200 170 L200 148 L216 148 L216 134 L232 134 L232 150 L250 150 L250 140 L272 140 L272 128 L280 120 L288 128 L288 152 L320 152 L320 170 Z"
        fill="var(--accent)" opacity="0.55"
      />

      {/* Eiffel Tower */}
      <g fill="url(#paris-tower)">
        <rect x="174" y="18" width="2" height="18" rx="1" />
        <path d="M171 36 L179 36 L186 92 L164 92 Z" />
        <rect x="160" y="92" width="30" height="5" rx="1.5" />
        <path d="M163 97 L187 97 L201 140 L149 140 Z" />
        <rect x="142" y="140" width="66" height="6" rx="2" />
        <path d="M146 146 L130 186 L148 186 Q175 150 202 186 L220 186 L204 146 Z" />
      </g>
      <g stroke="var(--card)" strokeWidth="0.8" opacity="0.6">
        <line x1="168" y1="50" x2="182" y2="64" /><line x1="182" y1="50" x2="168" y2="64" />
        <line x1="166" y1="66" x2="184" y2="84" /><line x1="184" y1="66" x2="166" y2="84" />
        <line x1="160" y1="104" x2="190" y2="132" /><line x1="190" y1="104" x2="160" y2="132" />
      </g>

      {/* Ground + trees */}
      <rect x="0" y="182" width="320" height="18" fill="var(--accent)" opacity="0.6" />
      <circle cx="40" cy="178" r="12" fill="var(--pink)" opacity="0.18" />
      <circle cx="58" cy="181" r="9" fill="var(--pink)" opacity="0.15" />
      <circle cx="292" cy="178" r="12" fill="var(--pink)" opacity="0.18" />
      <circle cx="270" cy="182" r="8" fill="var(--pink)" opacity="0.15" />

      {/* Hearts */}
      <path d="M118 56 c-3 -5 -10 -3 -8 3 c1 3 8 7 8 7 s7 -4 8 -7 c2 -6 -5 -8 -8 -3 z" fill="var(--pink)" opacity="0.4" />
      <path d="M226 36 c-2 -3 -6 -2 -5 2 c0.6 2 5 4.5 5 4.5 s4.4 -2.5 5 -4.5 c1 -4 -3 -5 -5 -2 z" fill="var(--pink)" opacity="0.35" />
    </svg>
  )
}
