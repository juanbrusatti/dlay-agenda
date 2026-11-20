/**
 * A little Christmas tree in the same hand-drawn line as the rest. Its
 * lights twinkle softly (the CSS lives with the other decorations and stays
 * still for reduced motion).
 */
export function Arbolito({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 80" aria-hidden className={className}>
      <g stroke="#2a1d17" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
        {/* Trunk */}
        <rect x="25" y="64" width="10" height="11" rx="2" fill="#8a5a35" />
        {/* Three tiers, bottom to top */}
        <path d="M6 66 30 38l24 28Z" fill="#1f7a4a" />
        <path d="M11 50 30 26l19 24Z" fill="#23864f" />
        <path d="M16 34 30 14l14 20Z" fill="#279257" />
        {/* Garland */}
        <path d="M14 58c10 4 22 4 32-3M18 43c8 3 17 2 24-3" fill="none" stroke="#e8c15a" strokeWidth="1.6" />
        {/* Star */}
        <path
          className="fiestas-estrella"
          d="m30 3 2.6 5.4 5.9.8-4.3 4.1 1 5.8L30 16.4l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8Z"
          fill="#f2c94c"
        />
      </g>
      {/* Lights */}
      <g stroke="#2a1d17" strokeWidth="1">
        <circle className="fiestas-luz" cx="22" cy="60" r="2.6" fill="#e0353f" />
        <circle className="fiestas-luz fiestas-luz-2" cx="38" cy="61" r="2.6" fill="#f2c94c" />
        <circle className="fiestas-luz fiestas-luz-3" cx="30" cy="48" r="2.6" fill="#4aa3e0" />
        <circle className="fiestas-luz fiestas-luz-2" cx="23" cy="40" r="2.4" fill="#f2c94c" />
        <circle className="fiestas-luz" cx="37" cy="39" r="2.4" fill="#e0353f" />
        <circle className="fiestas-luz fiestas-luz-3" cx="30" cy="27" r="2.2" fill="#e0353f" />
      </g>
    </svg>
  );
}
