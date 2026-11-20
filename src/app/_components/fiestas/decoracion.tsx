/**
 * The «fiestas» decorations: a little snow, Santa peeking from a corner now
 * and then, and his sleigh crossing the screen once in a while.
 *
 * Made to never get in the way of work:
 * - Nothing here can be clicked or covers a button: everything ignores the
 *   pointer, and the snow and the sleigh go behind the cards, so they only
 *   show in the margins. Only Santa peeks over, for a few seconds, from a
 *   corner.
 * - Santa and the sleigh show up for a few seconds every few minutes, not
 *   all the time.
 * - Whoever asked their phone or computer for less motion sees none of it.
 *
 * Pure CSS on purpose: no timers or scripts running while people work. The
 * flakes are spread with a fixed formula, not at random, so the server and
 * the browser draw the same thing.
 */

const COPOS = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  size: 3 + ((i * 7) % 4),
  duration: 14 + ((i * 5) % 11),
  delay: -((i * 13) % 24),
  opacity: 0.45 + ((i * 3) % 5) / 10,
}));

const CSS = `
.fiestas-nieve { position: fixed; inset: 0; z-index: -1; pointer-events: none; overflow: hidden; }
.fiestas-copo {
  position: absolute; top: -12px; border-radius: 9999px; background: var(--nieve);
  animation-name: fiestas-caer; animation-timing-function: linear; animation-iteration-count: infinite;
}
@keyframes fiestas-caer {
  0%   { transform: translate3d(0, -12px, 0); }
  50%  { transform: translate3d(18px, 50vh, 0); }
  100% { transform: translate3d(-6px, 105vh, 0); }
}
.fiestas-noel {
  position: fixed; left: 18px; bottom: 0; z-index: 10; width: 74px; pointer-events: none;
  transform: translateY(110%);
  animation: fiestas-asomarse 200s ease-in-out 30s infinite;
}
@keyframes fiestas-asomarse {
  0%, 100% { transform: translateY(110%); }
  1.2%     { transform: translateY(8%); }
  2.6%     { transform: translateY(8%) rotate(-4deg); }
  3.6%     { transform: translateY(8%); }
  4.8%     { transform: translateY(110%); }
}
.fiestas-trineo {
  position: fixed; left: 0; top: 18vh; z-index: -1; width: 170px; pointer-events: none;
  transform: translateX(-200px);
  animation: fiestas-volar 330s linear 95s infinite;
}
@keyframes fiestas-volar {
  0%       { transform: translate(-200px, 0); }
  2%       { transform: translate(30vw, -14px); }
  4%       { transform: translate(70vw, 6px); }
  6%, 100% { transform: translate(calc(100vw + 40px), -10px); }
}
@media (prefers-reduced-motion: reduce) {
  .fiestas-nieve, .fiestas-noel, .fiestas-trineo { display: none; }
}
@media print {
  .fiestas-nieve, .fiestas-noel, .fiestas-trineo { display: none; }
}
`;

/** Santa peeking over the bottom edge, hands holding on. */
function Noel() {
  return (
    <svg viewBox="0 0 80 72" aria-hidden className="fiestas-noel">
      <g stroke="#2a1d17" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
        {/* Hat, folding to one side, with its pompom */}
        <path d="M18 30C20 12 34 4 50 8c8 2 14 8 17 15l-6 3c-2-4-5-7-9-8 2 5 2 9 0 12Z" fill="#c8323c" />
        <circle cx="64" cy="27" r="5" fill="#fff" />
        <rect x="14" y="27" width="44" height="9" rx="4.5" fill="#fff" />
        {/* Face */}
        <path d="M19 36h34v10c0 7-8 12-17 12S19 53 19 46Z" fill="#f6d2b8" />
        <circle cx="29" cy="43" r="1.6" fill="#2a1d17" stroke="none" />
        <circle cx="43" cy="43" r="1.6" fill="#2a1d17" stroke="none" />
        <circle cx="36" cy="48" r="2.6" fill="#e58a8a" />
        {/* Beard */}
        <path d="M17 46c2 10 9 20 19 20s17-10 19-20c-4 4-9 5-12 3-2 2-5 3-7 3s-5-1-7-3c-3 2-8 1-12-3Z" fill="#fff" />
        {/* Mittens on the edge */}
        <rect x="4" y="62" width="14" height="10" rx="5" fill="#c8323c" />
        <rect x="54" y="62" width="14" height="10" rx="5" fill="#c8323c" />
      </g>
    </svg>
  );
}

/** One reindeer and the sleigh, drawn in the same hand-made line. */
function Trineo() {
  return (
    <svg viewBox="0 0 200 70" aria-hidden className="fiestas-trineo">
      <g stroke="#2a1d17" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
        {/* Reindeer */}
        <path d="M150 34c6-6 18-6 24 0l3-10" fill="none" />
        <path d="M140 38c0-6 6-9 14-9h12c6 0 9 4 9 9s-4 8-10 8h-17c-5 0-8-3-8-8Z" fill="#a8744a" />
        <path d="M146 46l-6 12M156 46l2 12M166 46l-4 12M172 45l6 11" fill="none" />
        <circle cx="181" cy="27" r="7" fill="#a8744a" />
        <path d="M178 21l-4-9m0 0-4 2m4-2 1-5M184 20l3-9m0 0 4 1m-4-1-1-5" fill="none" />
        <circle cx="188" cy="29" r="2.6" fill="#e0353f" />
        {/* Reins */}
        <path d="M150 36C130 30 110 34 96 40" fill="none" strokeWidth="1.4" />
        {/* Sleigh with Santa and the sack */}
        <path d="M60 26c4-6 12-8 18-4 4-5 12-5 15 0l-3 16H62Z" fill="#7a4f2c" />
        <circle cx="82" cy="18" r="6" fill="#f6d2b8" />
        <path d="M76 15c1-6 11-7 13 0Z" fill="#c8323c" />
        <path d="M76 20c1 5 4 7 6 7s5-2 6-7" fill="#fff" />
        <path d="M44 34h56c4 0 6-3 6-6h6c0 9-6 16-14 16H52c-6 0-10-4-8-10Z" fill="#c8323c" />
        <path d="M40 56h64c8 0 12-4 12-10M52 44v12M92 44v12" fill="none" />
      </g>
    </svg>
  );
}

export function DecoracionFiestas() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="fiestas-nieve" aria-hidden>
        {COPOS.map((c, i) => (
          <span
            key={i}
            className="fiestas-copo"
            style={{
              left: `${c.left}%`,
              width: c.size,
              height: c.size,
              opacity: c.opacity,
              animationDuration: `${c.duration}s`,
              animationDelay: `${c.delay}s`,
            }}
          />
        ))}
      </div>
      <Noel />
      <Trineo />
    </>
  );
}
