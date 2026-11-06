import { useEffect, useState } from 'react';
import { HeartIcon, CalendarBlankIcon, ImagesIcon, StampIcon, ArrowCounterClockwiseIcon, BroomIcon, SortAscendingIcon, ClockCountdownIcon, DeviceMobileIcon, ImageBrokenIcon, ReceiptIcon, SparkleIcon } from '@phosphor-icons/react';
import { initialFilter, pileCount, favoritesTotal, LEVELS, type Asset, type Filter, type Order, type RecordState, type Smart } from './domain';
import { AnimatedNumber } from './Loader';
import { haptic } from './haptics';
import { ROMAN, sealRest, Stamp } from './Stamp';
import { formatNumber, locale, t, tn } from './i18n';

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

const SMART: { value: Smart; label: () => string; icon: typeof BroomIcon; hint: () => string }[] = [
 { value: 'all', label: () => t('Todo'), icon: SparkleIcon, hint: () => t('Sin atajos: todo lo que eligen los demás filtros.') },
 { value: 'later', label: () => t('Más tarde'), icon: ClockCountdownIcon, hint: () => t('Lo que dejaste para después. Fuera de este atajo, espera al final de la pila.') },
 { value: 'screenshots', label: () => t('Capturas'), icon: DeviceMobileIcon, hint: () => t('Capturas y grabaciones de pantalla, marcadas así por tu iPhone.') },
 { value: 'lowQuality', label: () => t('Baja calidad'), icon: ImageBrokenIcon, hint: () => t('Borrosas, muy oscuras o quemadas, según Vision en tu iPhone.') },
 { value: 'text', label: () => t('Texto y documentos'), icon: ReceiptIcon, hint: () => t('Facturas, recibos, transferencias y chats. Las que tienen caras van al final.') },
 { value: 'favorites', label: () => t('Favoritas'), icon: HeartIcon, hint: () => t('Solo tus favoritas. Aquí el corazón las quita de Favoritas; no se eliminan.') },
];
/** «Al azar» on its own row, then the pairs that read as opposites. */
const ORDER: [Order, () => string][] = [['random', () => t('Al azar')], ['oldest', () => t('Más antiguas')], ['newest', () => t('Más recientes')], ['largest', () => t('Más pesadas')], ['smallest', () => t('Más ligeras')]];
const ORDER_HINT: Record<Order, () => string> = {
 oldest: () => t('Cronológico: de tu primera foto a la última. Sabes siempre por dónde vas.'),
 newest: () => t('Cronológico inverso: empieza por lo último que guardaste.'),
 largest: () => t('Primero lo que más espacio ocupa: el camino corto para liberar memoria.'),
 smallest: () => t('Primero lo más ligero.'),
 random: () => t('Una mezcla distinta cada ronda.'),
};
const MEDIA = [['all', () => t('Todo')], ['photo', () => t('Fotos')], ['video', () => t('Vídeos')], ['live', () => t('Live Photos')]] as const;
/** Six ranges, two columns: the four quick ones, then «Último año» and «Elegir fechas». */
const RANGES = [['all', () => t('Cualquier fecha')], ['24h', () => t('Últimas 24 h')], ['7d', () => t('Últimos 7 días')], ['30d', () => t('Últimos 30 días')], ['1y', () => t('Último año')], ['custom', () => t('Elegir fechas')]] as const;

/** What enters the pile. Grouped from the quickest decision to the finest:
 * clean-up shortcut → content → dates → order → seals. Changes are a draft
 * until «Aplicar filtros»; every shortcut shows how many files it holds now. */
export function Filters({filter,assets,state,apply,index,preview}: {filter:Filter;assets:Asset[];state:RecordState;apply:(f:Filter)=>void;index:IndexProgress;preview?:(draft:Filter)=>void}) {
 const [draft,setDraft]=useState<Filter>({...initialFilter,...filter});
 // While choosing, the first cards of the draft warm up in the background, so
 // «Aplicar» opens on ready previews.
 useEffect(()=>{if(!preview)return;const t=setTimeout(()=>preview(draft),350);return()=>clearTimeout(t);},[JSON.stringify(draft)]);
 const update=(change:Partial<Filter>)=>{haptic('selection');setDraft(d=>({...d,...change}));};
 const invalid=draft.dateRange==='custom'&&(!draft.from||!draft.to||draft.from>draft.to);
 const count=pileCount(assets,state,draft);
 const smart=draft.smart??'all';
 // «Favoritas» shows how many favourites there are (as in Photos), not how many are left to review.
 const counts=Object.fromEntries(SMART.map(({value})=>[value,value==='favorites'?favoritesTotal(assets,state,draft):value===smart?count:pileCount(assets,state,{...draft,smart:value})])) as Record<Smart,number>;
 const visionPending=(smart==='lowQuality'||smart==='text')&&index.analyzing&&index.analyzed<index.photos;
 const sizePending=(draft.order==='largest'||draft.order==='smallest')&&index.measuring&&index.sized<index.total;
 return <div className="filters-panel">
  <fieldset><legend><BroomIcon size={18}/>{t('Limpieza rápida')}</legend>
   <div className="smart-chips" role="group" aria-label={t('Limpieza rápida')}>{SMART.map(({value,label,icon:Icon})=><button key={value} aria-pressed={smart===value} onClick={()=>update({smart:value})}><Icon size={20} weight={smart===value?'fill':'regular'}/><span>{label()}</span><span className="chip-count" aria-label={t('{n} en la pila',{n:counts[value]})}>{formatNumber(counts[value])}</span></button>)}</div>
   <p className="setting-note" role="status">{SMART.find(s=>s.value===smart)!.hint()}{visionPending&&<small>{t('Memo revisa tu fototeca en el iPhone: {done} de {total}. Irán apareciendo más.',{done:index.analyzed,total:index.photos})}</small>}</p>
  </fieldset>
  <fieldset><legend><ImagesIcon size={18}/>{t('Contenido')}</legend><div className="filter-chips chip-grid cols-2" role="group" aria-label={t('Contenido')}>{MEDIA.map(([value,label])=><button key={value} aria-pressed={draft.media===value} onClick={()=>update({media:value})}>{label()}</button>)}</div></fieldset>
  <fieldset><legend><CalendarBlankIcon size={18}/>{t('Fecha')}</legend><div className="filter-chips chip-grid cols-2" role="group" aria-label={t('Fecha')}>{RANGES.map(([value,label])=><button key={value} aria-pressed={(draft.dateRange??'all')===value} onClick={()=>update({dateRange:value})}>{label()}</button>)}</div>
   {draft.dateRange==='custom'&&<><DateCalendar from={draft.from} to={draft.to} change={update}/>{invalid&&<small className="date-error" role="status">{t('Elige una fecha inicial y una final válidas.')}</small>}</>}
  </fieldset>
  <fieldset><legend><SortAscendingIcon size={18}/>{t('Orden')}</legend><div className="filter-chips chip-grid cols-2 lead-row" role="group" aria-label={t('Orden')}>{ORDER.map(([value,label])=><button key={value} aria-pressed={draft.order===value} onClick={()=>update({order:value})}>{label()}</button>)}</div>
   <p className="setting-note" role="status">{ORDER_HINT[draft.order]()}{(draft.order==='largest'||draft.order==='smallest')&&<small>{sizePending?t('Midiendo el peso: {done} de {total}.',{done:index.sized,total:index.total})+' ':''}{t('Se mide lo que está en tu iPhone; lo que solo está en iCloud va al final.')}</small>}</p>
  </fieldset>
  <fieldset><legend><StampIcon size={18}/>{t('Sellos')}</legend>
   {/* How seals work: one tap away, so the filter itself stays short. */}
   <details className="seal-details"><summary>{t('Cómo funcionan los sellos')}</summary>
   <div className="seal-explainer">
    <span className="seal-sample" aria-hidden="true"><Stamp kind="keep" level={2}/></span>
    <p>{t('Cuando conservas una foto, recibe un sello y descansa: no vuelve a aparecer en un tiempo. Si la conservas otra vez, el sello sube de nivel y descansa más, hasta quedarse para siempre. Así cada ronda trae lo que aún no has decidido.')}</p>
   </div>
   <ul className="seal-levels" aria-label={t('Niveles de sello')}>{LEVELS.map((label, i) => i + 1 === LEVELS.length
     ? <li key={label} className="is-forever"><strong>{ROMAN[i]}</strong><span>{sealRest(i + 1)}</span><small>{t('Para volver a verlas, elige «Sello {level}» en Mostrar.',{level:ROMAN[i]})}</small></li>
     : <li key={label}><strong>{ROMAN[i]}</strong>{sealRest(i + 1)}</li>)}</ul></details>
   <div className="settings-group">
   <label className="field">{t('Mostrar')}<select value={draft.seal} onChange={e=>update({seal:['all','none'].includes(e.target.value)?e.target.value as 'all'|'none':Number(e.target.value)})}><option value="all">{t('Todos los niveles')}</option><option value="none">{t('Sin sello: pendientes de descubrir')}</option>{LEVELS.map((l,i)=><option key={l} value={i+1}>{t('Sello {level}: {rest}',{level:ROMAN[i],rest:sealRest(i+1)})}</option>)}</select></label><label className="switch-field"><span>{t('Incluir las que descansan')}<small>{t('Las conservadas vuelven con menor frecuencia.')}</small></span><input type="checkbox" role="switch" checked={draft.includeWaiting} onChange={e=>update({includeWaiting:e.target.checked})}/></label></div></fieldset>
  {/* 9.8.6: back to the base filters — centred, quiet, after the choices. */}
  <div className="filter-reset"><button type="button" onClick={()=>{haptic('selection');setDraft({...initialFilter});}}><ArrowCounterClockwiseIcon size={16}/>{t('Restablecer')}</button></div>
  <div className="filter-apply"><span>{invalid?(!draft.from||!draft.to?t('Elige desde y hasta para aplicar'):t('La fecha inicial debe ir antes de la final')):<><AnimatedNumber value={count}/> {tn('pileTail',count)}</>}</span><button className="sheet-action" disabled={invalid} onClick={()=>apply({...draft,v:2})}>{t('Aplicar filtros')}</button></div>
 </div>;
}
