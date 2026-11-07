import { Capacitor, registerPlugin } from '@capacitor/core';
import { useEffect, useRef, useState } from 'react';
import { ArrowCounterClockwiseIcon, CalendarCheckIcon, CoffeeIcon, InfinityIcon, ShieldCheckIcon } from '@phosphor-icons/react';
import { AdCadence, DEFAULT_RULES, TEST_RULES, INTRO_MS } from './adCadence';
import { Character } from './Characters';
import { t, locale } from './i18n';
import './monetization.css';

/** deck: the full letter in the pile (dismissed by swiping). finish / review:
 * the compact letter fixed in the round summary and in «Una última mirada». */
type Placement = 'deck' | 'finish' | 'review';
type Product = { id: string; price: string };
type Status = { adFree: boolean; expires?: number | null; products?: Product[] };
type Outcome = 'purchased' | 'pending' | 'cancelled';
// The native letter and purchases exist on iPhone (CocoMonetization.swift) and Android (CocoMonetizationPlugin.kt).
const native = ['ios', 'android'].includes(Capacitor.getPlatform());
const Store = registerPlugin<{
  status(): Promise<Status>;
  catalog(): Promise<Status>;
  buy(input: { id: string }): Promise<Status & { outcome: Outcome }>;
  restore(): Promise<Status>;
  prepare(): Promise<{ ready: boolean }>;
  show(input: { x: number; y: number; width: number; height: number; deck: boolean; style: 'deck' | 'inline'; hidden: boolean; labels: Record<string, string> }): Promise<{ shown: boolean; retry?: boolean }>;
  hide(): Promise<void>;
  privacy(): Promise<void>;
  addListener(event: 'purchaseChanged' | 'adDismissed', cb: () => void): Promise<{ remove(): Promise<void> }>;
}>('CocoMonetization');
const key = 'cocowash-ad-active-ms-v1';
/** The next letter starts loading a few seconds into sorting (not after the
 * one-minute intro), so «Terminar» and the summary find it ready: no pop. */
const PRELOAD_MS = 8_000;

/** testing: «Modo de prueba» — same placements, much shorter cadence, separate counters.
 * `cleaning` counts active sorting time; `warm` also lets the next letter load
 * while the round summary or «Una última mirada» is open. */
/** `off`: «Modo developer › Anuncios» switched off — no letter is offered or kept. */
export function useMonetization(enabled: boolean, cleaning: boolean, testing = false, warm = false, off = false) {
  const rules = testing ? TEST_RULES : DEFAULT_RULES;
  const available = native && enabled;
  const [status, setStatus] = useState<Status>();
  const [placement, setPlacement] = useState<Placement>();
  const [cadence] = useState(() => new AdCadence(Math.random, rules));
  const activeMs = useRef(0);
  const ready = useRef(false);
  const loading = useRef(false);
  const nextAttempt = useRef(0);
  const current = useRef<Placement | undefined>(undefined);
  const [loadedTime, setLoadedTime] = useState(false);

  /** A fixed letter asked for before an ad was ready: shown as soon as one is. */
  const wanted = useRef<Placement | undefined>(undefined);
  // Mirrors `wanted` for rendering: the screen keeps the letter's room meanwhile.
  const [awaiting, setAwaiting] = useState<Placement>();
  const want = (where: Placement) => { wanted.current = where; setAwaiting(where); };
  const clear = () => {
    wanted.current = undefined;
    setAwaiting(undefined);
    current.current = undefined;
    setPlacement(undefined);
  };
  useEffect(() => {
    if (!available) return;
    // 0.9.9.1 (38): a fresh page owns no letter. If iOS reloaded the page while
    // one was on screen, take it away before anything else is drawn.
    void Store.hide().catch(() => {});
    try { activeMs.current = Math.min(INTRO_MS, Math.max(0, Number(localStorage.getItem(key)) || 0)); } catch { /* optional */ }
    setLoadedTime(true);
    let alive = true;
    const update = () => { void Store.status().then(value => {
      if (!alive) return;
      setStatus(previous => ({ ...previous, ...value }));
      if (value.adFree) { ready.current = false; clear(); }
    }).catch(() => {}); };
    const changed = Store.addListener('purchaseChanged', update);
    const dismissed = Store.addListener('adDismissed', clear);
    document.addEventListener('visibilitychange', update);
    update();
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', update);
      void changed.then(x => x.remove()).catch(() => {});
      void dismissed.then(x => x.remove()).catch(() => {});
    };
  }, [available]);

  useEffect(() => {
    if (!available || !loadedTime || !(cleaning || warm || wanted.current)) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      if (cleaning && !document.hidden && !current.current) {
        const previous = activeMs.current;
        activeMs.current += Math.min(now - last, 1500);
        if (previous < INTRO_MS) try { localStorage.setItem(key, String(Math.floor(activeMs.current))); } catch { /* optional */ }
      }
      last = now;
      // 9.8.3: the next letter may load while a fixed one is on screen (the review
      // letter, then the summary one); only the pile letter waits for its turn.
      if (off || document.hidden || !status || status.adFree || (activeMs.current < PRELOAD_MS && !wanted.current) || ready.current || loading.current || current.current === 'deck' || now < nextAttempt.current) return;
      loading.current = true;
      nextAttempt.current = now + 30_000;
      void Store.prepare().then(value => {
        ready.current = value.ready;
        if (value.ready) nextAttempt.current = 0;
        const pending = wanted.current;
        if (value.ready && pending && !current.current) { wanted.current = undefined; setAwaiting(undefined); offer(pending); }
      }).catch(() => {}).finally(() => { loading.current = false; });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [available, cleaning, warm, loadedTime, status, placement, off]);

  useEffect(() => {
    if (!available || !off) return;
    clear();
    void Store.hide().catch(() => {});
  }, [available, off]);
  const offer = (where: Placement) => {
    if (off || !ready.current || current.current || !status || status.adFree) return false;
    ready.current = false;
    current.current = where;
    setPlacement(where);
    return true;
  };
  return {
    available, placement, awaiting, status, setStatus, clear,
    review(ids: string[]) {
      if (!available || off || status?.adFree) return;
      cadence.review(ids);
      if (cadence.between(activeMs.current) && !offer('deck')) cadence.skipDeck();
    },
    /** «Una última mirada»: always a fixed letter under its buttons (9.8.3). */
    reviewing() {
      if (!available || off || !status || status.adFree) return;
      // A pile letter waiting behind the sheet is never seen: the review letter takes its turn.
      if (current.current === 'deck') { current.current = undefined; setPlacement(undefined); }
      if (current.current) return;
      if (!offer('review')) want('review');
    },
    /** Leaving a screen: drop its letter, shown or still awaited. */
    release(where: Placement) {
      if (current.current === where || wanted.current === where) clear();
    },
    /** The «Espacio liberado» summary: always a fixed letter (9.8.3). */
    finish() {
      clear();
      if (!available || off || !status || status.adFree) return;
      if (!offer('finish')) want('finish');
    },
    shown(where: Placement) {
      if (current.current !== where) return;
      cadence.shown(activeMs.current, where);
    },
  };
}

type Monetization = ReturnType<typeof useMonetization>;
/** Texts of the native letter, in the app's language. */
const letterLabels = () => ({
  stamp: t('Publicidad'), greeting: t('Esta carta mantiene CocoWash gratis'), hint: t('‹  Desliza para seguir  ›'),
  again: t('Una vez más y seguimos'), againSpoken: t('Desliza otra vez para seguir'), spokenDeck: t('Anuncio. Desliza dos veces para volver a tus fotos.'),
  spokenInline: t('Anuncio'), skip: t('Seguir sin el anuncio'),
});
/** Web placeholder under the native letter. It reserves the exact frame the
 * native view covers and looks like a blank letter while the creative arrives.
 * Every frame it measures itself: while it moves (an entrance, a sheet opening,
 * the page scrolling) or is not fully on screen, the native letter is hidden —
 * never dragged behind late — and it comes back on the same frame once still. */
export function AdSlot({ where, money }: { where: Placement; money: Monetization }) {
  const node = useRef<HTMLDivElement>(null);
  const latest = useRef(money);
  const [covered, setCovered] = useState(false);
  latest.current = money;
  useEffect(() => {
    let disposed = false, shown = false, inFlight = false, again = false;
    let sent = '', previous = '', stillSince = performance.now(), frame = 0;
    const deck = where === 'deck';
    const labels = letterLabels();
    const started = performance.now();
    const send = (rect: DOMRect, hidden: boolean) => {
      const coords = { x: rect.x, y: rect.y, width: rect.width, height: rect.height, deck, style: deck ? 'deck' as const : 'inline' as const, hidden };
      const key = JSON.stringify(coords);
      if (key === sent) return;
      if (inFlight) { again = true; return; }
      inFlight = true;
      sent = key;
      void Store.show({ ...coords, labels }).then(result => {
        if (disposed) return;
        // Not active yet (coming back from the background): ask again shortly.
        if (!result.shown && result.retry) { window.setTimeout(() => { if (!disposed) { sent = ''; kick(); } }, 300); return; }
        if (!result.shown) { if (!hidden) latest.current.clear(); return; }
        if (!shown) { shown = true; latest.current.shown(where); setCovered(true); }
      }).catch(() => { if (!disposed) latest.current.clear(); }).finally(() => {
        inFlight = false;
        if (again) { again = false; sent = ''; }
      });
    };
    // Measured every frame only while something may be moving (mount, scroll,
    // resize, a sheet settling); idle once still and placed. A slow interval
    // catches anything else (a transition elsewhere on the page).
    let idleSince = 0;
    const tick = () => {
      frame = 0;
      const rect = node.current?.getBoundingClientRect();
      if (!rect) return;
      const now = performance.now();
      const key = `${Math.round(rect.x)},${Math.round(rect.y)},${Math.round(rect.width)},${Math.round(rect.height)}`;
      if (key !== previous) { previous = key; stillSince = now; idleSince = 0; }
      const onScreen = !document.hidden && rect.top >= 0 && rect.bottom <= window.innerHeight && rect.left >= 0 && rect.right <= window.innerWidth;
      const visible = onScreen && now - stillSince > 120 && now - started > (deck ? 320 : 380);
      if (!shown && !visible) {
        // The deck letter appears right away or not at all; fixed letters wait.
        if (deck && now - started > 1200) { latest.current.clear(); return; }
      } else send(rect, !visible);
      if (visible && !idleSince) idleSince = now;
      if (!idleSince || now - idleSince < 300) frame = requestAnimationFrame(tick);
    };
    const kick = () => { idleSince = 0; if (!frame) frame = requestAnimationFrame(tick); };
    // Back from the background the native letter was taken down (stashCard):
    // send the frame again once the page has settled, even if it did not move.
    const visibility = () => { sent = ''; stillSince = performance.now(); kick(); };
    frame = requestAnimationFrame(tick);
    const observer = new ResizeObserver(kick);
    if (node.current) observer.observe(node.current);
    window.addEventListener('scroll', kick, true);
    window.addEventListener('resize', kick);
    document.addEventListener('visibilitychange', visibility);
    const slow = window.setInterval(kick, 500);
    return () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      window.clearInterval(slow);
      observer.disconnect();
      window.removeEventListener('scroll', kick, true);
      window.removeEventListener('resize', kick);
      document.removeEventListener('visibilitychange', visibility);
      void Store.hide().catch(() => {});
    };
  }, [where]);
  return <div ref={node} className={'cw-ad-slot cw-ad-' + where + (covered ? ' is-covered' : '')} role="region" aria-label={t('Publicidad')}>
    <span className="cw-ad-blank" aria-hidden="true"/>
  </div>;
}

/** The letter's room while its ad is still on the way (no layout jump when it lands). */
export function AdRoom({ where }: { where: Placement }) {
  return <div className={'cw-ad-slot cw-ad-' + where} aria-hidden="true"><span className="cw-ad-blank"/></div>;
}

const offers = [
  { id: 'work.joaquin.mano.noads.year', name: () => t('Un año sin anuncios'), detail: () => t('Pago único. Dura un año y no se renueva solo.'), icon: CalendarCheckIcon, tone: 'year' },
  { id: 'work.joaquin.mano.noads.lifetime', name: () => t('Sin anuncios para siempre'), detail: () => t('Pago único, sin vencimiento.'), icon: InfinityIcon, tone: 'forever' },
  { id: 'work.joaquin.mano.coffee', name: () => t('Invítame un café'), detail: () => t('CocoWash lo hace una sola persona. El café no quita anuncios: es un gracias.'), icon: CoffeeIcon, tone: 'coffee' },
] as const;
/** «Apoyo»: the three purchases as real postage stamps — perforated paper
 * margin, a printed face with its frame and the price as the stamp's value.
 * CocoWash already speaks in stamps (Sellos), so buying one reads as sending
 * something, not a paywall. An active pass carries a postmark. */
export function PurchaseOptions({ money }: { money: Monetization }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const { clear, setStatus } = money;
  const refresh = () => { setFailed(false); void Store.catalog().then(setStatus).catch(() => { setFailed(true); setMessage(t('Los precios no están disponibles ahora. Prueba en un momento.')); }); };
  useEffect(refresh, [setStatus]);
  const perform = async (run: () => Promise<(Status & { outcome?: Outcome }) | void>, success: string) => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await run();
      if (result) {
        if (result.adFree) clear();
        setStatus(previous => ({ ...previous, ...result }));
      }
      setMessage(result?.outcome === 'pending' ? t('Compra pendiente de aprobación.') : result?.outcome === 'cancelled' ? '' : success);
    } catch { setMessage(t('No se pudo completar. Inténtalo de nuevo.')); }
    finally { setBusy(false); }
  };
  const status = money.status;
  const loaded = !!status?.products?.length;
  return <section className="support-panel" aria-labelledby="support-title">
    <header className="support-hero">
      <Character pose="coqui-wave" height={88} motion="still"/>
      <div>
        <h3 id="support-title">{t('CocoWash es gratis')}</h3>
        <p>{status?.adFree
          ? (status.expires ? t('Sin anuncios hasta el {date}. Gracias por apoyarla.', { date: new Date(status.expires).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) }) : t('Sin anuncios para siempre. Gracias por apoyarla.'))
          : t('De vez en cuando aparece un anuncio entre tus fotos. Puedes quitarlos por un año o para siempre.')}</p>
      </div>
    </header>
    <div className="support-stamps">{offers.map(offer => {
      const product = status?.products?.find(item => item.id === offer.id);
      const coffee = offer.tone === 'coffee';
      const owned = !coffee && !!status?.adFree && (!status.expires || offer.tone === 'year');
      const Icon = offer.icon;
      const name = offer.name(), detail = offer.detail();
      return <button key={offer.id} type="button" className={`support-stamp tone-${offer.tone} ${owned ? 'is-owned' : ''} ${!product && !owned ? 'is-unpriced' : ''}`} disabled={busy || !product || owned}
        aria-label={`${name}. ${detail} ${owned ? t('Activo.') : product ? t('Precio {price}.', { price: product.price }) : t('Precio no disponible.')}`}
        onClick={() => void perform(() => Store.buy({ id: offer.id }), coffee ? t('¡Gracias por el café!') : t('Listo: ya no verás anuncios.'))}>
        <span className="stamp-perf" aria-hidden="true"><span className="stamp-face">
          <span className="stamp-art"><Icon size={30} weight={coffee ? 'fill' : 'duotone'}/></span>
          <span className="stamp-text"><strong>{name}</strong><small>{detail}</small></span>
          <span className="stamp-value">{owned ? '' : product ? product.price : loaded || failed ? t('Pronto') : <span className="stamp-value-wait"/>}</span>
          {owned && <span className="stamp-postmark"><span>{t('Activo')}</span></span>}
        </span></span>
      </button>;
    })}</div>
    <div className="support-links">
      {failed && <button type="button" className="text-button" onClick={refresh}><ArrowCounterClockwiseIcon size={16}/>{t('Cargar precios')}</button>}
      <button type="button" className="text-button" disabled={busy} onClick={() => void perform(Store.restore.bind(Store), t('Compras consultadas.'))}><ArrowCounterClockwiseIcon size={16}/>{t('Restaurar compras')}</button>
      <button type="button" className="text-button" disabled={busy} onClick={() => void perform(Store.privacy.bind(Store), '')}><ShieldCheckIcon size={16}/>{t('Privacidad de anuncios')}</button>
    </div>
    <p className="setting-note" aria-live="polite">{message}</p>
  </section>;
}
