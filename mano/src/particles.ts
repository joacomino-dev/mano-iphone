/** Small, event-driven particles (CW-CL-085, user 2026-11-17): a few ink dots when a
 * keep stamp lands, two or three hearts on a favourite, sparkles on an earned star and
 * a short burst of paper at the end of a round. Nothing for a discard or «Más tarde».
 *
 * Rules: one shared, decorative layer (no pointer events, out of the accessibility
 * tree); each burst is a few spans animated with WAAPI on transform/opacity and
 * removed when done; a new burst on the same channel replaces the old one (no
 * queue); at most MAX_ACTIVE at once; nothing while the page is hidden or with
 * Reduce Motion; no React state per particle or frame. */
type Kind = 'ink' | 'heart' | 'sparkle' | 'paper';
type Live = { el: HTMLElement; anim: Animation; channel: string };

const MAX_ACTIVE = 24;
/** The app's ease-out (`--cw-ease`). */
const EASE_OUT = 'cubic-bezier(.2,.8,.2,1)';
const PAPER = ['#1E7470', '#EF9A98', '#F4B63F', '#FCEFD9', '#8A4B2D', '#7CCBC2'];
const live: Live[] = [];
let layer: HTMLElement | null = null;

function host(): HTMLElement {
  if (layer?.isConnected) return layer;
  layer = document.createElement('div');
  layer.className = 'cw-particles';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  return layer;
}

const quiet = () => typeof document === 'undefined' || document.hidden
  || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);

/** Cancels the particles of one channel (or all); cancelled ones remove themselves. */
export function stopParticles(channel?: string) {
  for (const p of [...live]) if (!channel || p.channel === channel) p.anim.cancel();
}

if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.hidden) stopParticles(); });

/** One particle's path: where it travels, how it turns and shrinks, how long. */
function path(kind: Kind, i: number, count: number) {
  const r = (a: number, b: number) => a + Math.random() * (b - a);
  if (kind === 'ink') {
    const angle = (i / count) * Math.PI * 2 + r(-.4, .4), d = r(16, 30);
    return { keyframes: [{ x: 0, y: 0, s: 1, rot: 0 }, { x: Math.cos(angle) * d, y: Math.sin(angle) * d, s: .35, rot: 0 }], duration: r(300, 380), delay: 0 };
  }
  if (kind === 'heart') {
    const spread = (i - (count - 1) / 2) * 22;
    return { keyframes: [{ x: 0, y: 0, s: .55, rot: spread / 2 }, { x: spread + r(-6, 6), y: r(-46, -30), s: 1, rot: spread }], duration: r(560, 640), delay: i * 50 };
  }
  if (kind === 'sparkle') {
    const angle = -Math.PI / 2 + (i - (count - 1) / 2) * .9, d = r(12, 20);
    return { keyframes: [{ x: 0, y: 0, s: .4, rot: 0 }, { x: Math.cos(angle) * d, y: Math.sin(angle) * d, s: 1, rot: 45 }], duration: r(320, 380), delay: i * 30 };
  }
  const angle = -Math.PI / 2 + r(-1.1, 1.1), d = r(60, 120);
  return { keyframes: [{ x: 0, y: 0, s: 1, rot: 0 }, { x: Math.cos(angle) * d, y: Math.sin(angle) * d, s: 1, rot: r(-200, 200) }, { x: Math.cos(angle) * d * 1.25, y: Math.sin(angle) * d + r(110, 170), s: .9, rot: r(-420, 420) }], duration: r(1000, 1250), delay: r(0, 60) };
}

/** Emits `count` particles of `kind` from a point on screen (viewport pixels). */
export function burst(channel: string, at: { x: number; y: number }, kind: Kind, count: number) {
  if (quiet() || !(count > 0)) return;
  stopParticles(channel);
  // Over the global budget: the oldest make room (never a backlog).
  const excess = live.length + count - MAX_ACTIVE;
  for (const p of live.slice(0, Math.max(0, excess))) p.anim.cancel();
  const room = host();
  for (let i = 0; i < Math.min(count, MAX_ACTIVE); i++) {
    const el = document.createElement('span');
    el.className = `cw-particle is-${kind}`;
    el.style.left = `${at.x}px`; el.style.top = `${at.y}px`;
    if (kind === 'paper') el.style.background = PAPER[i % PAPER.length];
    room.appendChild(el);
    const { keyframes, duration, delay } = path(kind, i, count);
    const last = keyframes.length - 1;
    const anim = el.animate(keyframes.map((k, n) => ({
      transform: `translate(-50%,-50%) translate(${k.x}px,${k.y}px) rotate(${k.rot}deg) scale(${k.s})`,
      opacity: n === last ? 0 : 1,
    })), { duration, delay, easing: kind === 'paper' ? 'cubic-bezier(.3,.6,.4,1)' : EASE_OUT, fill: 'backwards' });
    const entry: Live = { el, anim, channel };
    const done = () => { el.remove(); const k = live.indexOf(entry); if (k >= 0) live.splice(k, 1); };
    anim.onfinish = done; anim.oncancel = done;
    live.push(entry);
  }
}

/** The centre of an element on screen, for `burst`. */
export function centreOf(el: Element | null | undefined) {
  if (!el) return null;
  const b = el.getBoundingClientRect();
  return b.width || b.height ? { x: b.left + b.width / 2, y: b.top + b.height / 2 } : null;
}

/** For tests: how many particles are alive right now. */
export const liveParticles = () => live.length;
