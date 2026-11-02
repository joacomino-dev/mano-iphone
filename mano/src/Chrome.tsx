import type { ReactNode } from 'react';

/** Main-screen chrome in the decision bar's language (see DecisionBar.tsx):
 * solid colour, cream band, ink contour, an ink base under what can be pressed.
 * Brand and chrome labels use Fredoka (rounded, straight stems); decision verbs
 * keep Patua One. */

/** The CocoWash logo (2 Nov 2026): «Coco» in coffee over «Wash» in pink, the
 * brand's own lettering traced to SVG from the approved artwork
 * (brand/cocowash-logo.svg, brand/trace-logo.py). One cached file for every use;
 * the accessible name lives next to it (sr-only), so this stays decorative. */
export function Wordmark({ className = '' }: { className?: string; size?: number }) {
  return <img className={`wordmark ${className}`} src="/assets/brand/cocowash-logo.svg" alt="" aria-hidden="true" draggable={false} decoding="async"/>;
}

/** Progress through the filtered pile: a turquoise track and the count on a
 * light capsule. Same accessible name as before («Revisados …»). */
export function PileProgress({ reviewed, total, count }: { reviewed: number; total: number; count: ReactNode }) {
  const share = total ? Math.min(1, reviewed / total) : 0;
  // The count capsule reserves room for the total's digits, so the track keeps
  // its length while the reviewed number grows (1/20 → 10/20).
  const digits = String(Math.max(0, total)).length;
  return <>
    <div className="pile-meter" role="progressbar" aria-valuemin={0} aria-valuemax={Math.max(1, total)} aria-valuenow={reviewed} aria-label={`Revisados ${reviewed} de ${total} con estos filtros`}>
      <span className="pile-meter-fill" style={{ width: `${share * 100}%` }}/>
    </div>
    <span className="pile-count" aria-hidden="true" style={{ minWidth: `calc(${digits * 2 + 1}ch + 22px)` }}>{count}</span>
  </>;
}
