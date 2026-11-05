import { Capacitor, registerPlugin } from '@capacitor/core';
import { useEffect, useRef, useState } from 'react';
import { ArrowCounterClockwiseIcon, CalendarCheckIcon, CoffeeIcon, InfinityIcon, ShieldCheckIcon } from '@phosphor-icons/react';
import { AdCadence, DEFAULT_RULES, TEST_RULES, INTRO_MS } from './adCadence';
import { Character } from './Characters';
import './monetization.css';

type Placement = 'deck' | 'finish';
type Product = { id: string; price: string };
type Status = { adFree: boolean; expires?: number | null; products?: Product[] };
type Outcome = 'purchased' | 'pending' | 'cancelled';
const native = Capacitor.getPlatform() === 'ios';
const Store = registerPlugin<{
  status(): Promise<Status>;
  catalog(): Promise<Status>;
  buy(input: { id: string }): Promise<Status & { outcome: Outcome }>;
  restore(): Promise<Status>;
  prepare(): Promise<{ ready: boolean }>;
  show(input: { x: number; y: number; width: number; height: number; deck: boolean }): Promise<{ shown: boolean }>;
  hide(): Promise<void>;
  privacy(): Promise<void>;
  addListener(event: 'purchaseChanged' | 'adDismissed', cb: () => void): Promise<{ remove(): Promise<void> }>;
}>('CocoMonetization');
const key = 'cocowash-ad-active-ms-v1';
const finishKey = 'cocowash-finish-ads-v1';

/** testing: «Modo de prueba» — same placements, much shorter cadence, separate counters. */
export function useMonetization(enabled: boolean, cleaning: boolean, testing = false) {
  const rules = testing ? TEST_RULES : DEFAULT_RULES;
  const finishStore = testing ? finishKey + '-test' : finishKey;
  const available = native && enabled;
  const [status, setStatus] = useState<Status>();
  const [placement, setPlacement] = useState<Placement>();
  const [cadence] = useState(() => {
    try { return new AdCadence(Math.random, JSON.parse(localStorage.getItem(finishStore) ?? 'null'), rules); }
    catch { return new AdCadence(Math.random, undefined, rules); }
  });
  const saveFinishes = () => {
    try { localStorage.setItem(finishStore, JSON.stringify(cadence.finishSnapshot())); } catch { /* optional */ }
  };
  const activeMs = useRef(0);
  const ready = useRef(false);
  const loading = useRef(false);
  const nextAttempt = useRef(0);
  const current = useRef<Placement | undefined>(undefined);
  const [loadedTime, setLoadedTime] = useState(false);

  const finishShown = useRef(false);
  const clear = () => {
    if (current.current === 'finish' && !finishShown.current) {
      cadence.missedFinish();
      saveFinishes();
    }
    current.current = undefined;
    setPlacement(undefined);
  };
  useEffect(() => {
    if (!available) return;
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
    if (!available || !loadedTime || !cleaning) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      if (!document.hidden && !current.current) {
        const previous = activeMs.current;
        activeMs.current += Math.min(now - last, 1500);
        if (previous < INTRO_MS) try { localStorage.setItem(key, String(Math.floor(activeMs.current))); } catch { /* optional */ }
      }
      last = now;
      if (document.hidden || !status || status.adFree || activeMs.current < rules.introMs || ready.current || loading.current || current.current || now < nextAttempt.current) return;
      loading.current = true;
      nextAttempt.current = now + 30_000;
      void Store.prepare().then(value => { ready.current = value.ready; }).catch(() => {}).finally(() => { loading.current = false; });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [available, cleaning, loadedTime, status]);

  const offer = (where: Placement) => {
    if (!ready.current || current.current || !status || status.adFree) return false;
    ready.current = false;
    current.current = where;
    finishShown.current = false;
    setPlacement(where);
    return true;
  };
  return {
    available, placement, status, setStatus, clear,
    review(ids: string[]) {
      if (!available || status?.adFree) return;
      cadence.review(ids);
      if (cadence.between(activeMs.current) && !offer('deck')) cadence.skipDeck();
    },
    finish() {
      clear();
      if (!available || !status || status.adFree) return;
      if (cadence.finish(activeMs.current, new Date().toLocaleDateString('sv')) && !offer('finish')) cadence.missedFinish();
      saveFinishes();
    },
    shown(where: Placement) {
      if (current.current !== where) return;
      cadence.shown(activeMs.current, where);
      if (where === 'finish') {
        finishShown.current = true;
        saveFinishes();
      }
    },
  };
}

type Monetization = ReturnType<typeof useMonetization>;
/** Web placeholder under the native ad card. It reserves the exact frame the
 * native view covers, looks like a blank Polaroid while the creative arrives
 * and only asks for the native view once its entrance has settled, so the
 * card never jumps between frames. */
export function AdSlot({ where, money }: { where: Placement; money: Monetization }) {
  const node = useRef<HTMLDivElement>(null);
  const latest = useRef(money);
  const [covered, setCovered] = useState(false);
  latest.current = money;
  useEffect(() => {
    let disposed = false;
    let shown = false;
    let inFlight = false;
    let started = false;
    let frame = '';
    const draw = () => {
      if (disposed || inFlight || !started) return;
      const rect = node.current?.getBoundingClientRect();
      if (!rect || document.hidden || rect.top < 0 || rect.bottom > window.innerHeight || rect.width < 220 || rect.height < 220) {
        if (shown || document.hidden) latest.current.clear();
        return;
      }
      const coords = { x: rect.x, y: rect.y, width: rect.width, height: rect.height, deck: where === 'deck' };
      const next = JSON.stringify(coords);
      if (next === frame) return;
      frame = next;
      inFlight = true;
      void Store.show(coords).then(result => {
        if (disposed) return;
        if (!result.shown) { latest.current.clear(); return; }
        if (!shown) { latest.current.shown(where); setCovered(true); }
        shown = true;
      }).catch(() => { if (!disposed) latest.current.clear(); }).finally(() => { inFlight = false; });
    };
    const observer = new ResizeObserver(draw);
    if (node.current) observer.observe(node.current);
    window.addEventListener('scroll', draw, true);
    window.addEventListener('resize', draw);
    document.addEventListener('visibilitychange', draw);
    // Wait for the web entrance (ad-stage in ManoApp, 300 ms) before the native frame is placed.
    const begin = window.setTimeout(() => { started = true; draw(); }, where === 'deck' ? 320 : 0);
    const settle = window.setTimeout(() => {
      draw();
      if (where === 'deck' && !shown && !inFlight) latest.current.clear();
    }, 900);
    const track = window.setInterval(draw, 250);
    return () => {
      window.clearTimeout(begin);
      window.clearTimeout(settle);
      window.clearInterval(track);
      disposed = true;
      observer.disconnect();
      window.removeEventListener('scroll', draw, true);
      window.removeEventListener('resize', draw);
      document.removeEventListener('visibilitychange', draw);
      void Store.hide().catch(() => {});
    };
  }, [where]);
  return <div ref={node} className={'cw-ad-slot cw-ad-' + where + (covered ? ' is-covered' : '')} role="region" aria-label="Publicidad">
    <span className="cw-ad-blank" aria-hidden="true"/>
  </div>;
}

const offers = [
  { id: 'work.joaquin.mano.noads.year', name: 'Un año sin anuncios', detail: 'Pago único. Dura un año y no se renueva solo.', icon: CalendarCheckIcon, tone: 'year' },
  { id: 'work.joaquin.mano.noads.lifetime', name: 'Sin anuncios para siempre', detail: 'Pago único, sin vencimiento.', icon: InfinityIcon, tone: 'forever' },
  { id: 'work.joaquin.mano.coffee', name: 'Invítame un café', detail: 'CocoWash lo hace una sola persona. El café no quita anuncios: es un gracias.', icon: CoffeeIcon, tone: 'coffee' },
] as const;
/** «Apoyo»: the three purchases as postage stamps — CocoWash already speaks in
 * stamps (Sellos), so buying one reads as sending something, not a paywall. */
export function PurchaseOptions({ money }: { money: Monetization }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const { clear, setStatus } = money;
  const refresh = () => { void Store.catalog().then(setStatus).catch(() => setMessage('Los precios no están disponibles ahora. Prueba en un momento.')); };
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
      setMessage(result?.outcome === 'pending' ? 'Compra pendiente de aprobación.' : result?.outcome === 'cancelled' ? '' : success);
    } catch { setMessage('No se pudo completar. Inténtalo de nuevo.'); }
    finally { setBusy(false); }
  };
  const status = money.status;
  return <section className="support-panel" aria-labelledby="support-title">
    <header className="support-hero">
      <Character pose="coqui-wave" height={88} motion="still"/>
      <div>
        <h3 id="support-title">CocoWash es gratis</h3>
        <p>{status?.adFree
          ? (status.expires ? `Sin anuncios hasta el ${new Date(status.expires).toLocaleDateString('es')}. Gracias por apoyarla.` : 'Sin anuncios para siempre. Gracias por apoyarla.')
          : 'De vez en cuando llega un anuncio entre tus fotos. Con un pase dejan de llegar.'}</p>
      </div>
    </header>
    <div className="support-stamps">{offers.map(offer => {
      const product = status?.products?.find(item => item.id === offer.id);
      const coffee = offer.tone === 'coffee';
      const owned = !coffee && !!status?.adFree && (!status.expires || offer.tone === 'year');
      const Icon = offer.icon;
      return <button key={offer.id} type="button" className={`support-stamp tone-${offer.tone}`} disabled={busy || !product || owned}
        aria-label={`${offer.name}. ${offer.detail} ${owned ? 'Activo.' : product ? `Precio ${product.price}.` : 'Precio no disponible.'}`}
        onClick={() => void perform(() => Store.buy({ id: offer.id }), coffee ? '¡Gracias por el café!' : 'Listo: tu pase está activo.')}>
        <span className="stamp-art" aria-hidden="true"><Icon size={34} weight={coffee ? 'fill' : 'duotone'}/></span>
        <span className="stamp-text"><strong>{offer.name}</strong><small>{offer.detail}</small></span>
        <span className="stamp-value" aria-hidden="true">{owned ? 'Activo' : product?.price ?? '—'}</span>
      </button>;
    })}</div>
    <div className="support-links">
      {!status?.products?.length && <button type="button" className="text-button" onClick={refresh}>Cargar precios</button>}
      <button type="button" className="text-button" disabled={busy} onClick={() => void perform(Store.restore.bind(Store), 'Compras consultadas.')}><ArrowCounterClockwiseIcon size={16}/>Restaurar compras</button>
      <button type="button" className="text-button" disabled={busy} onClick={() => void perform(Store.privacy.bind(Store), '')}><ShieldCheckIcon size={16}/>Privacidad de anuncios</button>
    </div>
    <p className="setting-note" aria-live="polite">{message}</p>
  </section>;
}
