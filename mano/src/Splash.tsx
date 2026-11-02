import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

/** How long the launch mark stays before it fades (ms). The app loads behind it. */
export const SPLASH_MS = 1500;

/** Launch mark, like a studio card: the full CocoWash logo — Coqui washing Memo
 * with «CocoWash» to the right — centred, and the maker's mark (Zángano's
 * isotype) near the bottom. Shown briefly at every launch over the same cream as
 * the native launch screen, so nothing flashes. Purely decorative: it never
 * takes touches and VoiceOver skips it; the app keeps loading underneath.
 * Reduce Motion: no travel or scale, only a fade. */
export function Splash({ done }: { done: () => void }) {
  const reduced = useReducedMotion();
  // Removed by its own timers, never by waiting on an animation: on a renderer
  // without GPU (CI simulator) a full-screen fade may not settle, and an app that
  // never goes idle cannot be driven by UI tests (run 41491916425).
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const leave = setTimeout(() => setLeaving(true), SPLASH_MS);
    const end = setTimeout(done, SPLASH_MS + 280);
    return () => { clearTimeout(leave); clearTimeout(end); };
  }, []);
  const ease = [.2, .8, .2, 1] as const;
  return <div className="splash" aria-hidden="true">
    <motion.div className="splash-lockup" initial={reduced ? { opacity: 0 } : { opacity: 0, scale: .94, y: 8 }}
      animate={leaving ? { opacity: 0 } : { opacity: 1, scale: 1, y: 0 }} transition={{ duration: leaving ? .24 : reduced ? .2 : .55, ease }}>
      <img className="splash-hero" src="/assets/characters/coqui-memo.webp" alt="" draggable={false}/>
      <img className="splash-logo" src="/assets/brand/cocowash-logo.svg" alt="" draggable={false}/>
    </motion.div>
    <motion.div className="splash-maker" initial={{ opacity: 0 }} animate={{ opacity: leaving ? 0 : 1 }} transition={{ delay: leaving || reduced ? 0 : .3, duration: leaving ? .24 : .4, ease }}>
      <img src="/assets/brand/zangano-isotipo.svg" alt="" draggable={false}/>
    </motion.div>
  </div>;
}
