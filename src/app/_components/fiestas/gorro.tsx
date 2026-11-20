/**
 * A Santa hat that sits on the corner of the logo in the bar while the
 * «fiestas» look is on. The logo itself stays as it is: the brand does not
 * change color, it just dresses up.
 */
export function GorroFiestas() {
  return (
    <svg
      viewBox="0 0 26 22"
      aria-hidden
      className="pointer-events-none absolute"
      style={{ right: -8, top: -10, width: 21, height: 18, transform: "rotate(18deg)" }}
    >
      <g stroke="#2a1d17" strokeWidth="1.3" strokeLinejoin="round">
        <path d="M4 15C5 6 11 1 18 3c3 1 5 4 5 7l-3 1c0-2-1-3-3-4 1 3 1 6 0 8Z" fill="#c8323c" />
        <circle cx="21.5" cy="12.5" r="2.6" fill="#fff" />
        <rect x="2" y="14" width="17" height="5" rx="2.5" fill="#fff" />
      </g>
    </svg>
  );
}
