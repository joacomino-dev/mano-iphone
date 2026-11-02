import { useEffect } from 'react';
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
  useEffect(() => { const t = setTimeout(done, SPLASH_MS); return () => clearTimeout(t); }, []);
  const ease = [.2, .8, .2, 1] as const;
  return <motion.div className="splash" aria-hidden="true" initial={false} exit={{ opacity: 0, transition: { duration: reduced ? .15 : .42, ease } }}>
    <motion.div className="splash-lockup" initial={reduced ? { opacity: 0 } : { opacity: 0, scale: .94, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: reduced ? .2 : .55, ease }}>
      <img className="splash-hero" src="/assets/characters/coqui-memo.webp" alt="" draggable={false}/>
      <img className="splash-logo" src="/assets/brand/cocowash-logo.svg" alt="" draggable={false}/>
    </motion.div>
    <motion.div className="splash-maker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduced ? 0 : .3, duration: .4, ease }}>
      <img src="/assets/brand/zangano-isotipo.svg" alt="" draggable={false}/>
    </motion.div>
  </motion.div>;
}
