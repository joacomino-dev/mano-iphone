import { useEffect, useState } from 'react';
import { HeartIcon, ArrowCounterClockwiseIcon, BroomIcon, ClockCountdownIcon, DeviceMobileIcon, ImageBrokenIcon, ReceiptIcon, SparkleIcon, CaretRightIcon, CaretLeftIcon, CheckIcon } from '@phosphor-icons/react';
import { initialFilter, pileCount, favoritesTotal, LEVELS, type Asset, type Filter, type Order, type RecordState, type Smart } from './domain';
import { AnimatedNumber } from './Loader';
import { haptic } from './haptics';
import { LevelStar, levelStars, sealRest, Stamp, withStars } from './Stamp';
import { formatNumber, locale, t, tn } from './i18n';
import { onAndroid } from './locales/android';

/** Week days from Monday, in the app's language (narrow forms: L M X J V S D). */
const weekDays = () => Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(new Date(2024, 0, 1 + i)));
function DateCalendar({from,to,change}:{from?:string;to?:string;change:(value:Partial<Filter>)=>void}) {
 const [month,setMonth]=useState(()=>{const date=from?new Date(`${from}T12:00:00`):new Date();return new Date(date.getFullYear(),date.getMonth(),1);});
 const [target,setTarget]=useState<'from'|'to'>(from?'to':'from');
 const days=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();const offset=(month.getDay()+6)%7;
 const display=(value?:string)=>value?new Date(`${value}T12:00:00`).toLocaleDateString(locale,{day:'numeric',month:'short',year:'numeric'}):t('Elegir fecha');
 return <div className="range-calendar"><div className="range-endpoints"><button aria-pressed={target==='from'} onClick={()=>setTarget('from')}>{t('Desde')}<strong>{display(from)}</strong></button><button aria-pressed={target==='to'} onClick={()=>setTarget('to')}>{t('Hasta')}<strong>{display(to)}</strong></button></div><div className="calendar-heading"><button aria-label={t('Mes anterior')} onClick={()=>setMonth(m=>new Date(m.getFullYear(),m.getMonth()-1,1))}><span className="flip-rtl">‹</span></button><span aria-live="polite">{month.toLocaleDateString(locale,{month:'long',year:'numeric'})}</span><button aria-label={t('Mes siguiente')} onClick={()=>setMonth(m=>new Date(m.getFullYear(),m.getMonth()+1,1))}><span className="flip-rtl">›</span></button></div><div className="calendar-days" role="group" aria-label={t('Calendario')}>{weekDays().map((day,i)=><span key={i} aria-hidden="true">{day}</span>)}{Array.from({length:offset},(_,i)=><span key={`empty-${i}`}/>)}{Array.from({length:days},(_,i)=>{const date=new Date(month.getFullYear(),month.getMonth(),i+1,12);const value=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`;return <button key={value} className={from&&to&&value>from&&value<to?'in-range':''} aria-label={date.toLocaleDateString(locale,{day:'numeric',month:'long',year:'numeric'})} aria-pressed={value===from||value===to} onClick={()=>{if(target==='from'){change({from:value,...(to&&to<value?{to:undefined}:{})});setTarget('to');}else if(from&&value<from){change({from:value,to:from});}else change({to:value});}}>{formatNumber(i+1)}</button>;})}</div></div>;
}

/** Background measuring state shown next to the sets that depend on it. */
export type IndexProgress = { sized: number; total: number; analyzed: number; photos: number; measuring: boolean; analyzing: boolean };

const SMART: { value: Smart; label: () => string; icon: typeof BroomIcon; hint?: () => string }[] = [
 { value: 'all', label: () => t('Todo'), icon: SparkleIcon },
 { value: 'later', label: () => t('Más tarde'), icon: ClockCountdownIcon, hint: () => t('Lo que dejaste para después. Fuera de este atajo, espera al final de la pila.') },
 { value: 'screenshots', label: () => t('Capturas'), icon: DeviceMobileIcon, hint: () => t('Capturas y grabaciones de pantalla, marcadas así por tu iPhone.') },
 { value: 'lowQuality', label: () => t('Baja calidad'), icon: ImageBrokenIcon, hint: () => t('Borrosas, muy oscuras o quemadas, según Vision en tu iPhone.') },
 { value: 'text', label: () => t('Texto y documentos'), icon: ReceiptIcon, hint: () => t('Facturas, recibos, transferencias y chats. Las que tienen caras van al final.') },
 { value: 'favorites', label: () => t('Favoritas'), icon: HeartIcon, hint: () => t('Solo tus favoritas. Aquí el corazón las quita de Favoritas; no se eliminan.') },
];
/** «Al azar» on its own row, then the pairs that read as opposites. */
const ORDER: [Order, () => string][] = [['random', () => t('Al azar')], ['oldest', () => t('Más antiguas')], ['newest', () => t('Más recientes')], ['largest', () => t('Más pesadas')], ['smallest', () => t('Más ligeras')]];
const ORDER_HINT: Partial<Record<Order, () => string>> = {
 oldest: () => t('Cronológico: de tu primera foto a la última. Sabes siempre por dónde vas.'),
 newest: () => t('Cronológico inverso: empieza por lo último que guardaste.'),
 largest: () => t('Primero lo que más espacio ocupa: el camino corto para liberar memoria.'),
 smallest: () => t('Primero lo más ligero.'),
};
const MEDIA = [['all', () => t('Todo')], ['photo', () => t('Fotos')], ['video', () => t('Vídeos')], ['live', () => t('Live Photos')]] as const;
/** Android has no Live Photos, and no on-device text detector yet: those two choices
 * would always be empty there, so they are not offered (ROADMAP_PLAYSTORE, P0). */
const media = () => onAndroid() ? MEDIA.filter(([value]) => value !== 'live') : MEDIA;
const smarts = () => onAndroid() ? SMART.filter(({ value }) => value !== 'text') : SMART;
/** Six ranges, two columns: the four quick ones, then «Último año» and «Elegir fechas». */
const RANGES = [['all', () => t('Cualquier fecha')], ['24h', () => t('Últimas 24 h')], ['7d', () => t('Últimos 7 días')], ['30d', () => t('Últimos 30 días')], ['1y', () => t('Último año')], ['custom', () => t('Elegir fechas')]] as const;

/** What enters the pile. Grouped from the quickest decision to the finest:
 * clean-up shortcut → content → dates → order → seals. Changes are a draft
 * until «Aplicar filtros»; every shortcut shows how many files it holds now. */
/** The legend's level mark: the mini keep stamp and its stars in a row. */
function Level({ level }: { level: number }) {
  return <strong className="seal-level" aria-label={withStars(stars => t('Sello {level}: {rest}', { level: stars, rest: '' }), level).replace(/[:：]\s*$/, '')}>
    <Stamp kind="keep" className="seal-level-stamp"/>{Array.from({ length: levelStars(level) }, (_, k) => <LevelStar key={k}/>)}
  </strong>;
}
/** What each clean-up shortcut is for, in a few words (user, 2026-11-20: intentions first,
 * less text). The longer explanation shows only for the chosen one. */
const INTENT: Record<Smart, { title: () => string; line: () => string; tone: string }> = {
 all: { title: () => t('Un poco de todo'), line: () => t('Tu carrete, como venga'), tone: 'teal' },
 later: { title: () => t('Lo que dejé para luego'), line: () => t('Tus «más tarde»'), tone: 'amber' },
 screenshots: { title: () => t('Capturas de pantalla'), line: () => t('Lo que más se acumula sin querer'), tone: 'blue' },
 lowQuality: { title: () => t('Fotos borrosas u oscuras'), line: () => t('Para decidir rápido'), tone: 'coffee' },
 text: { title: () => t('Tickets y documentos'), line: () => t('Recibos, facturas y chats'), tone: 'slate' },
 favorites: { title: () => t('Repasar favoritas'), line: () => t('Aquí el corazón las quita de Favoritas'), tone: 'pink' },
};
type Detail = 'date' | 'order' | 'seal';
/** One row of «Afinar»: the name, the current value, and a way into its own screen. */
function TuneRow({ label, value, open }: { label: string; value: string; open: () => void }) {
 return <button type="button" className="tune-row" onClick={() => { haptic('selection'); open(); }}><span>{label}</span><span className="tune-value">{value}</span><CaretRightIcon size={14} weight="bold" className="flip-rtl"/></button>;
}
/** A list where one option is chosen: rows with a check, one decision per screen. */
function PickList<T extends string | number>({ label, value, options, change }: { label: string; value: T; options: [T, string][]; change: (value: T) => void }) {
 return <div className="pick-list" role="group" aria-label={label}>{options.map(([option, text]) => <button key={String(option)} type="button" aria-pressed={value === option} onClick={() => change(option)}><span>{text}</span>{value === option && <CheckIcon size={16} weight="bold"/>}</button>)}</div>;
}

/** What enters the pile (user, 2026-11-20: the sheet overwhelmed). First a few
 * intentions, each with how many files it holds now; then «Afinar»: type inline, and
 * one row each for date, order and seals that opens its own short screen. Changes are a
 * draft until «Aplicar filtros». */
export function Filters({filter,assets,state,apply,index,preview}: {filter:Filter;assets:Asset[];state:RecordState;apply:(f:Filter)=>void;index:IndexProgress;preview?:(draft:Filter)=>void}) {
 const [draft,setDraft]=useState<Filter>({...initialFilter,...filter});
 const [detail,setDetail]=useState<Detail|null>(null);
 // While choosing, the first cards of the draft warm up in the background, so
 // «Aplicar» opens on ready previews.
 useEffect(()=>{if(!preview)return;const t=setTimeout(()=>preview(draft),350);return()=>clearTimeout(t);},[JSON.stringify(draft)]);
 const update=(change:Partial<Filter>)=>{haptic('selection');setDraft(d=>({...d,...change}));};
 const invalid=draft.dateRange==='custom'&&(!draft.from||!draft.to||draft.from>draft.to);
 const count=pileCount(assets,state,draft);
 const smart=draft.smart??'all';
 // «Favoritas» shows how many favourites there are (as in Photos), not how many are left to review.
 const counts=Object.fromEntries(smarts().map(({value})=>[value,value==='favorites'?favoritesTotal(assets,state,draft):value===smart?count:pileCount(assets,state,{...draft,smart:value})])) as Record<Smart,number>;
 const visionPending=(smart==='lowQuality'||smart==='text')&&index.analyzing&&index.analyzed<index.photos;
 const sizePending=(draft.order==='largest'||draft.order==='smallest')&&index.measuring&&index.sized<index.total;
 const rangeLabel=RANGES.find(([value])=>value===(draft.dateRange??'all'))![1]();
 const orderLabel=ORDER.find(([value])=>value===draft.order)![1]();
 const sealLabel=draft.seal==='all'?t('Todos los niveles'):draft.seal==='none'?t('Sin sello'):withStars(stars=>t('Sello {level}',{level:stars}),draft.seal);
 const footer=<div className="filter-apply"><span>{invalid?(!draft.from||!draft.to?t('Elige desde y hasta para aplicar'):t('La fecha inicial debe ir antes de la final')):<><AnimatedNumber value={count}/> {tn('pileTail',count)}</>}</span><button className="sheet-action" disabled={invalid} onClick={()=>apply({...draft,v:2})}>{t('Aplicar filtros')}</button></div>;
 if(detail) return <div className="filters-panel is-detail">
  <button type="button" className="detail-back" onClick={()=>{haptic('selection');setDetail(null);}}><CaretLeftIcon size={16} weight="bold" className="flip-rtl"/>{t('Volver a los filtros')}</button>
  {detail==='date'&&<section className="detail-section"><h3>{t('Fecha')}</h3>
   <PickList label={t('Fecha')} value={draft.dateRange??'all'} options={RANGES.map(([value,label])=>[value,label()] as [typeof value,string])} change={dateRange=>update({dateRange})}/>
   {draft.dateRange==='custom'&&<><DateCalendar from={draft.from} to={draft.to} change={update}/>{invalid&&<small className="date-error" role="status">{t('Elige una fecha inicial y una final válidas.')}</small>}</>}
  </section>}
  {detail==='order'&&<section className="detail-section"><h3>{t('Orden')}</h3>
   <PickList label={t('Orden')} value={draft.order} options={ORDER.map(([value,label])=>[value,label()] as [Order,string])} change={order=>update({order})}/>
   {(ORDER_HINT[draft.order]||draft.order==='largest'||draft.order==='smallest')&&<p className="setting-note" role="status">{ORDER_HINT[draft.order]?.()}{(draft.order==='largest'||draft.order==='smallest')&&<small>{sizePending?t('Midiendo el peso: {done} de {total}.',{done:index.sized,total:index.total})+' ':''}{t('Se mide lo que está en tu iPhone; lo que solo está en iCloud va al final.')}</small>}</p>}
  </section>}
  {detail==='seal'&&<section className="detail-section"><h3>{t('Sellos')}</h3>
   <PickList label={t('Mostrar')} value={String(draft.seal)} options={[['all',t('Todos los niveles')],['none',t('Sin sello: pendientes de descubrir')],...LEVELS.map((_,i)=>[String(i+1),withStars(stars=>t('Sello {level}: {rest}',{level:stars,rest:sealRest(i+1)}),i+1)] as [string,string])]} change={value=>update({seal:value==='all'||value==='none'?value:Number(value)})}/>
   <div className="settings-group"><label className="switch-field"><span>{t('Incluir las que descansan')}<small>{t('Las conservadas vuelven con menor frecuencia.')}</small></span><input type="checkbox" role="switch" checked={draft.includeWaiting} onChange={e=>update({includeWaiting:e.target.checked})}/></label></div>
   {/* How seals work: one tap away, so the screen itself stays short. */}
   <details className="seal-details"><summary>{t('Cómo funcionan los sellos')}</summary>
   <div className="seal-explainer">
    <span className="seal-sample" aria-hidden="true"><Stamp kind="keep" level={2}/></span>
    <p>{t('Cuando conservas una foto, recibe un sello y descansa: no vuelve a aparecer en un tiempo. Si la conservas otra vez, el sello sube de nivel y descansa más, hasta quedarse para siempre. Así cada ronda trae lo que aún no has decidido.')}</p>
   </div>
   <ul className="seal-levels" aria-label={t('Niveles de sello')}>{LEVELS.map((label, i) => i + 1 === LEVELS.length
     ? <li key={label} className="is-forever"><Level level={i + 1}/><span>{sealRest(i + 1)}</span><small>{withStars(stars => t('Para volver a verlas, elige «Sello {level}» en Mostrar.',{level:stars}), i + 1)}</small></li>
     : <li key={label}><Level level={i + 1}/>{sealRest(i + 1)}</li>)}</ul></details>
  </section>}
  {footer}
 </div>;
 const chosen=SMART.find(s=>s.value===smart)!;
 return <div className="filters-panel">
  <section className="intent-section" aria-labelledby="intent-title">
   <h3 id="intent-title" className="list-label">{t('¿Qué revisamos hoy?')}</h3>
   <div className="intent-list" role="group" aria-labelledby="intent-title">{smarts().map(({value,icon:Icon})=><button key={value} type="button" className={`intent-card tone-${INTENT[value].tone}`} aria-pressed={smart===value} onClick={()=>update({smart:value})}>
    <span className="intent-art" aria-hidden="true"><Icon size={20} weight="fill"/></span>
    <span className="intent-text"><strong>{INTENT[value].title()}</strong><span>{INTENT[value].line()}</span></span>
    <span className="intent-count" aria-label={t('{n} en la pila',{n:counts[value]})}>{formatNumber(counts[value])}</span>
   </button>)}</div>
   {(chosen.hint||visionPending)&&smart!=='all'&&<p className="setting-note" role="status">{chosen.hint?.()}{visionPending&&<small>{t('Revisando tu fototeca en el iPhone: {done} de {total}. Irán apareciendo más.',{done:index.analyzed,total:index.photos})}</small>}</p>}
  </section>
  <section className="tune-section" aria-labelledby="tune-title">
   <div className="list-head"><h3 id="tune-title" className="list-label">{t('Afinar')}</h3><button type="button" className="text-reset" onClick={()=>{haptic('selection');setDraft({...initialFilter});}}><ArrowCounterClockwiseIcon size={14} weight="bold"/>{t('Restablecer')}</button></div>
   <div className="tune-group">
    <div className="tune-inline"><span>{t('Tipo')}</span><div className="seg" role="group" aria-label={t('Contenido')}>{media().map(([value,label])=><button key={value} type="button" aria-pressed={draft.media===value} onClick={()=>update({media:value})}>{label()}</button>)}</div></div>
    <TuneRow label={t('Fecha')} value={rangeLabel} open={()=>setDetail('date')}/>
    <TuneRow label={t('Orden')} value={orderLabel} open={()=>setDetail('order')}/>
    <TuneRow label={t('Sellos')} value={sealLabel} open={()=>setDetail('seal')}/>
   </div>
  </section>
  {footer}
 </div>;
}
