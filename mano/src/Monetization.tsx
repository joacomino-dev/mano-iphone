import { Capacitor, registerPlugin } from '@capacitor/core';
import { useEffect, useRef, useState } from 'react';
import { AdCadence, INTRO_MS } from './adCadence';
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

export function useMonetization(enabled: boolean, cleaning: boolean) {
  const available = native && enabled;
  const [status, setStatus] = useState<Status>();
  const [placement, setPlacement] = useState<Placement>();
  const [cadence] = useState(() => {
    try { return new AdCadence(Math.random, JSON.parse(localStorage.getItem(finishKey) ?? 'null')); }
    catch { return new AdCadence(); }
  });
  const saveFinishes = () => {
    try { localStorage.setItem(finishKey, JSON.stringify(cadence.finishSnapshot())); } catch { /* optional */ }
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
      if (document.hidden || !status || status.adFree || activeMs.current < INTRO_MS || ready.current || loading.current || current.current || now < nextAttempt.current) return;
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
export function AdSlot({ where, money }: { where: Placement; money: Monetization }) {
  const node = useRef<HTMLDivElement>(null);
  const latest = useRef(money);
  latest.current = money;
  useEffect(() => {
    let disposed = false;
    let shown = false;
    let inFlight = false;
    let frame = '';
    const draw = () => {
      if (disposed || inFlight) return;
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
        if (!shown) latest.current.shown(where);
        shown = true;
      }).catch(() => { if (!disposed) latest.current.clear(); }).finally(() => { inFlight = false; });
    };
    const observer = new ResizeObserver(draw);
    if (node.current) observer.observe(node.current);
    window.addEventListener('scroll', draw, true);
    window.addEventListener('resize', draw);
    document.addEventListener('visibilitychange', draw);
    const settle = window.setTimeout(() => {
      draw();
      if (where === 'deck' && !shown && !inFlight) latest.current.clear();
    }, 500);
    const track = window.setInterval(draw, 250);
    draw();
    return () => {
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
  return <div ref={node} className={'cw-ad-slot cw-ad-' + where} />;
}

const offers = [
  { id: 'work.joaquin.mano.noads.year', name: 'Un aÃ±o sin anuncios', detail: 'Pago Ãºnico. Vence al aÃ±o y no se renueva automÃ¡ticamente.' },
  { id: 'work.joaquin.mano.noads.lifetime', name: 'Sin anuncios de por vida', detail: 'Pago Ãºnico, sin vencimiento.' },
  { id: 'work.joaquin.mano.coffee', name: 'CÃ³mprame un cafÃ©', detail: 'CocoWash lo desarrolla y mantiene una sola persona. Este aporte no desbloquea funciones ni quita anuncios.' },
];
export function PurchaseOptions({ money }: { money: Monetization }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const { clear, setStatus } = money;
  const refresh = () => { void Store.catalog().then(setStatus).catch(() => setMessage('Los precios no estÃ¡n disponibles ahora.')); };
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
      setMessage(result?.outcome === 'pending' ? 'Compra pendiente de aprobaciÃ³n.' : result?.outcome === 'cancelled' ? '' : success);
    } catch { setMessage('No se pudo completar. IntÃ©ntalo de nuevo.'); }
    finally { setBusy(false); }
  };
  return <section className="cw-purchases" aria-label="Compras y privacidad">
    <h3>Sin anuncios</h3>
    <p>Todas las funciones de CocoWash son gratuitas.</p>
    {money.status?.adFree && <p>{money.status.expires ? 'Sin anuncios hasta el ' + new Date(money.status.expires).toLocaleDateString('es') : 'Tienes el pase de por vida.'}</p>}
    {offers.map(offer => {
      const product = money.status?.products?.find(item => item.id === offer.id);
      const owned = money.status?.adFree && (!money.status.expires || offer === offers[0]) && offer !== offers[2];
      return <div key={offer.id} className="cw-offer">
        <div><strong>{offer.name}</strong><small>{offer.detail}</small></div>
        <button type="button" disabled={busy || !product || owned} onClick={() => void perform(() => Store.buy({ id: offer.id }), offer === offers[2] ? 'Gracias por el cafÃ©.' : 'Tu pase estÃ¡ activo.')}>{owned ? 'Activo' : product?.price ?? 'â€”'}</button>
      </div>;
    })}
    {!money.status?.products?.length && <button type="button" onClick={refresh}>Volver a cargar precios</button>}
    <button type="button" disabled={busy} onClick={() => void perform(Store.restore.bind(Store), 'Compras consultadas.')}>Restaurar compras</button>
    <button type="button" disabled={busy} onClick={() => void perform(Store.privacy.bind(Store), '')}>Privacidad de anuncios</button>
    <p aria-live="polite">{message}</p>
  </section>;
}
