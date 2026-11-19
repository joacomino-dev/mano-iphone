import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { XIcon } from '@phosphor-icons/react';
import { Bubble, Dim, Ring, screenRect, type Hole } from './Coach';
import type { Pose } from './Characters';
import { haptic } from './haptics';
import { t } from './i18n';
import { countDecision, markSeen, nextTip, readTips, saveTips, type PileMoment, type TipId } from './tips';

/** «Trucos» on the pile (user, 2026-11-19): the first time each advanced gesture makes
 * sense, the same coach marks as the practice — the target lit, the rest dimmed, a hint
 * of the gesture and one line from Coqui over the controls, never over the photo. A tap
 * anywhere closes it; a tap on the lit target also does what it does (the stack moves
 * on, the pinch opens the photo, «Álbum» opens). Each tip shows once (tips.ts). */

const LINE: Record<TipId, () => string> = {
  stack: () => t('Toca para ver la siguiente'),
  zoom: () => t('Pellizca para ampliar'),
  anchor: () => t('Mantén pulsada y arrastra hasta Anclar'),
  album: () => t('Guárdala en un álbum sin salir de aquí'),
};
const POSE: Record<TipId, Pose> = { stack: 'coqui-point', zoom: 'coqui-think', anchor: 'coqui-point', album: 'coqui-photos' };
const TARGET: Record<TipId, string> = { stack: '.photo-card.front', zoom: '.photo-card.front', anchor: '.photo-card.front', album: '#album-trigger' };
/** A tip waits for the card to settle before it appears. */
const SETTLE_MS = 700;
const DECISIONS = ['keep', 'discard', 'favorite', 'later'];

type Shown = { id: TipId; front?: string; target: Hole; bubble: Hole };
const union = (a: Hole | null, b: Hole | null): Hole | null => !a ? b : !b ? a : { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.max(a.x + a.w, b.x + b.w) - Math.min(a.x, b.x), h: Math.max(a.y + a.h, b.y + b.h) - Math.min(a.y, b.y), r: a.r };

export function ContextTips({ moment, front, history }: { moment: PileMoment; front?: string; history: readonly { action: string }[] }) {
  const reduced = useReducedMotion();
  const layer = useRef<HTMLDivElement>(null);
  const tips = useRef(readTips());
  const [version, setVersion] = useState(0);
  const save = (next: typeof tips.current) => { tips.current = next; saveTips(next); setVersion(v => v + 1); };
  // Ajustes › Trucos may have shown them again: read the stored state whenever the pile is back.
  useEffect(() => { if (moment.calm) { tips.current = readTips(); setVersion(v => v + 1); } }, [moment.calm]);

  // Decisions made on the pile (not undos or reloads): the record keeps only ten.
  const last = history.at(-1);
  const seenLast = useRef(last);
  useEffect(() => {
    const previous = seenLast.current; seenLast.current = last;
    if (!last || last === previous) return;
    const fresh = previous ? history.at(-2) === previous : history.length === 1;
    if (fresh && DECISIONS.includes(last.action)) save(countDecision(tips.current, last.action));
  }, [last]);

  const [shown, setShown] = useState<Shown | null>(null);
  useEffect(() => {
    if (shown) return;
    const id = nextTip(tips.current, moment); if (!id) return;
    const timer = setTimeout(() => {
      const app = layer.current?.parentElement ?? null;
      const target = screenRect(app?.querySelector(TARGET[id]) ?? null, layer.current, id === 'album' ? 6 : 10, id === 'album' ? 16 : 14);
      // Coqui speaks over the controls for the photo's tips, over the header for «Álbum».
      const bubble = id === 'album'
        ? union(screenRect(app?.querySelector('.archive-header') ?? null, layer.current), screenRect(app?.querySelector('.archive-progress') ?? null, layer.current))
        : union(screenRect(app?.querySelector('.decision-bar') ?? null, layer.current), screenRect(app?.querySelector('.archive-tools') ?? null, layer.current));
      if (!target || !bubble) return;
      save(markSeen(tips.current, id)); haptic('light');
      setShown({ id, front, target, bubble });
    }, SETTLE_MS);
    return () => clearTimeout(timer);
  }, [shown, moment.calm, moment.hand, moment.front, moment.albums, front, version]);
  // Anything else on top, or another card: the tip has done its job.
  useEffect(() => { if (shown && (!moment.calm || front !== shown.front)) setShown(null); }, [moment.calm, front]);

  // A tap closes it. On the lit target, or on a button, it also goes through. Elsewhere
  // its click is eaten — only that one: the guard removes itself after a moment whatever
  // happens next (a drag has no click), and never outlives the component.
  const swallow = useRef<{ eat: (e: Event) => void; timer: ReturnType<typeof setTimeout> } | null>(null);
  const unswallow = () => { const s = swallow.current; if (!s) return; swallow.current = null; clearTimeout(s.timer); window.removeEventListener('click', s.eat, true); };
  useEffect(() => unswallow, []);
  useEffect(() => {
    if (!shown) return;
    const down = (e: PointerEvent) => {
      if (layer.current?.contains(e.target as Node)) return;
      const el = document.querySelector(TARGET[shown.id]); const box = el?.getBoundingClientRect();
      const inside = !!box && e.clientX >= box.left - 8 && e.clientX <= box.right + 8 && e.clientY >= box.top - 8 && e.clientY <= box.bottom + 8;
      const control = (e.target as Element | null)?.closest?.('button,a,input,[role=button],[role=switch]');
      setShown(null);
      if (inside || control) return;
      e.preventDefault(); e.stopPropagation();
      unswallow();
      const eat = (event: Event) => { event.preventDefault(); event.stopPropagation(); unswallow(); };
      window.addEventListener('click', eat, true);
      swallow.current = { eat, timer: setTimeout(unswallow, 450) };
    };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setShown(null); };
    document.addEventListener('pointerdown', down, true); window.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', down, true); window.removeEventListener('keydown', key); };
  }, [shown]);

  const close = () => { haptic('selection'); setShown(null); };
  const hint = shown && { x: shown.target.x + shown.target.w / 2, y: shown.target.y + shown.target.h / 2 };
  return <div ref={layer} className="tip-layer">
    <AnimatePresence>{shown && <motion.div key={shown.id} className={`tip is-${shown.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? .12 : .24 }}>
      <Dim on holes={[shown.target]}/>
      <Ring hole={shown.target} strong/>
      {hint && <span className={`tip-hint is-${shown.id}`} style={{ left: hint.x, top: shown.id === 'anchor' ? shown.target.y + shown.target.h * .3 : hint.y }} aria-hidden="true"><i/><i/></span>}
      <div className="tip-bubble" style={{ left: shown.bubble.x, top: shown.bubble.y, width: shown.bubble.w, height: shown.bubble.h }} onClick={close} role="status">
        <Bubble pose={POSE[shown.id]} text={LINE[shown.id]()} tone="ask"/>
        <button type="button" className="tip-close" onClick={e => { e.stopPropagation(); close(); }} aria-label={t('Cerrar aviso')}><XIcon size={16} weight="bold"/></button>
      </div>
    </motion.div>}</AnimatePresence>
  </div>;
}
