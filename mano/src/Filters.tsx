import { useState } from 'react';
import { CalendarBlankIcon, ImagesIcon, StampIcon, ArrowCounterClockwiseIcon, BroomIcon, SortAscendingIcon, ClockCountdownIcon, DeviceMobileIcon, ImageBrokenIcon, ReceiptIcon, SparkleIcon } from '@phosphor-icons/react';
import { initialFilter, pileCount, LEVELS, type Asset, type Filter, type Order, type RecordState, type Smart } from './domain';
import { AnimatedNumber } from './Loader';
import { haptic } from './haptics';
import { ROMAN, sealRest } from './Stamp';

function DateCalendar({from,to,change}:{from?:string;to?:string;change:(value:Partial<Filter>)=>void}) {
 const [month,setMonth]=useState(()=>{const date=from?new Date(`${from}T12:00:00`):new Date();return new Date(date.getFullYear(),date.getMonth(),1);});
 const [target,setTarget]=useState<'from'|'to'>(from?'to':'from');
 const days=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();const offset=(month.getDay()+6)%7;
 const display=(value?:string)=>value?new Date(`${value}T12:00:00`).toLocaleDateString('es',{day:'numeric',month:'short',year:'numeric'}):'Elegir fecha';
 return <div className="range-calendar"><div className="range-endpoints"><button aria-pressed={target==='from'} onClick={()=>setTarget('from')}>Desde<strong>{display(from)}</strong></button><button aria-pressed={target==='to'} onClick={()=>setTarget('to')}>Hasta<strong>{display(to)}</strong></button></div><div className="calendar-heading"><button aria-label="Mes anterior" onClick={()=>setMonth(m=>new Date(m.getFullYear(),m.getMonth()-1,1))}>‹</button><span aria-live="polite">{month.toLocaleDateString('es',{month:'long',year:'numeric'})}</span><button aria-label="Mes siguiente" onClick={()=>setMonth(m=>new Date(m.getFullYear(),m.getMonth()+1,1))}>›</button></div><div className="calendar-days" role="group" aria-label="Calendario">{['L','M','X','J','V','S','D'].map((day,i)=><span key={i} aria-hidden="true">{day}</span>)}{Array.from({length:offset},(_,i)=><span key={`empty-${i}`}/>)}{Array.from({length:days},(_,i)=>{const date=new Date(month.getFullYear(),month.getMonth(),i+1,12);const value=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`;return <button key={value} className={from&&to&&value>from&&value<to?'in-range':''} aria-label={date.toLocaleDateString('es',{day:'numeric',month:'long',year:'numeric'})} aria-pressed={value===from||value===to} onClick={()=>{if(target==='from'){change({from:value,...(to&&to<value?{to:undefined}:{})});setTarget('to');}else if(from&&value<from){change({from:value,to:from});}else change({to:value});}}>{i+1}</button>;})}</div></div>;
}

/** Background measuring state shown next to the sets that depend on it. */
export type IndexProgress = { sized: number; total: number; analyzed: number; photos: number; measuring: boolean; analyzing: boolean };

const SMART: { value: Smart; label: string; icon: typeof BroomIcon; hint: string }[] = [
 { value: 'all', label: 'Todo', icon: SparkleIcon, hint: 'Sin atajos: todo lo que eligen los demás filtros.' },
 { value: 'later', label: 'Más tarde', icon: ClockCountdownIcon, hint: 'Lo que dejaste para después. Fuera de este atajo, espera al final de la pila.' },
 { value: 'screenshots', label: 'Capturas', icon: DeviceMobileIcon, hint: 'Capturas y grabaciones de pantalla, marcadas así por tu iPhone.' },
 { value: 'lowQuality', label: 'Baja calidad', icon: ImageBrokenIcon, hint: 'Borrosas, muy oscuras o quemadas, según Vision en tu iPhone.' },
 { value: 'text', label: 'Texto y documentos', icon: ReceiptIcon, hint: 'Facturas, recibos, transferencias y chats. Las que tienen caras van al final.' },
];
const ORDER: [Order, string][] = [['oldest', 'Más antiguas'], ['newest', 'Más recientes'], ['largest', 'Más pesadas'], ['smallest', 'Más ligeras'], ['random', 'Al azar']];
const ORDER_HINT: Record<Order, string> = {
 oldest: 'Cronológico: de tu primera foto a la última. Sabes siempre por dónde vas.',
 newest: 'Cronológico inverso: empieza por lo último que guardaste.',
 largest: 'Primero lo que más espacio ocupa: el camino corto para liberar memoria.',
 smallest: 'Primero lo más ligero.',
 random: 'Una mezcla distinta cada ronda.',
};
const number = (n: number) => n.toLocaleString('es');

/** What enters the pile. Grouped from the quickest decision to the finest:
 * clean-up shortcut → content → dates → order → seals. Changes are a draft
 * until «Aplicar filtros»; every shortcut shows how many files it holds now. */
export function Filters({filter,assets,state,apply,index}: {filter:Filter;assets:Asset[];state:RecordState;apply:(f:Filter)=>void;index:IndexProgress}) {
 const [draft,setDraft]=useState<Filter>({...initialFilter,...filter});
 const update=(change:Partial<Filter>)=>{haptic('selection');setDraft(d=>({...d,...change}));};
 const invalid=draft.dateRange==='custom'&&(!draft.from||!draft.to||draft.from>draft.to);
 const count=pileCount(assets,state,draft);
 const smart=draft.smart??'all';
 const counts=Object.fromEntries(SMART.map(({value})=>[value,value===smart?count:pileCount(assets,state,{...draft,smart:value})])) as Record<Smart,number>;
 const visionPending=(smart==='lowQuality'||smart==='text')&&index.analyzing&&index.analyzed<index.photos;
 const sizePending=(draft.order==='largest'||draft.order==='smallest')&&index.measuring&&index.sized<index.total;
 return <div className="filters-panel">
  <div className="filter-intro"><button onClick={()=>{haptic('selection');setDraft({...initialFilter});}}><ArrowCounterClockwiseIcon size={16}/>Restablecer</button></div>
  <fieldset><legend><BroomIcon size={18}/>Limpieza rápida</legend>
   <div className="smart-chips" role="group" aria-label="Limpieza rápida">{SMART.map(({value,label,icon:Icon})=><button key={value} aria-pressed={smart===value} onClick={()=>update({smart:value})}><Icon size={20} weight={smart===value?'fill':'regular'}/><span>{label}</span><span className="chip-count" aria-label={`${counts[value]} en la pila`}>{number(counts[value])}</span></button>)}</div>
   <p className="setting-note" role="status">{SMART.find(s=>s.value===smart)!.hint}{visionPending&&<small>Memo revisa tu fototeca en el iPhone: {number(index.analyzed)} de {number(index.photos)}. Irán apareciendo más.</small>}</p>
  </fieldset>
  <fieldset><legend><ImagesIcon size={18}/>Contenido</legend><div className="filter-chips">{([['all','Todo'],['photo','Fotos'],['video','Vídeos'],['live','Live Photos']] as const).map(([value,label])=><button key={value} aria-pressed={draft.media===value} onClick={()=>update({media:value})}>{label}</button>)}</div></fieldset>
  <fieldset><legend><CalendarBlankIcon size={18}/>Fecha</legend><div className="filter-chips">{([['all','Cualquier fecha'],['24h','Últimas 24 h'],['7d','Últimos 7 días'],['30d','Últimos 30 días'],['custom','Elegir fechas']] as const).map(([value,label])=><button key={value} aria-pressed={(draft.dateRange??'all')===value} onClick={()=>update({dateRange:value})}>{label}</button>)}</div>
   {draft.dateRange==='custom'&&<><DateCalendar from={draft.from} to={draft.to} change={update}/>{invalid&&<small className="date-error" role="status">Elige una fecha inicial y una final válidas.</small>}</>}
  </fieldset>
  <fieldset><legend><SortAscendingIcon size={18}/>Orden</legend><div className="filter-chips" role="group" aria-label="Orden">{ORDER.map(([value,label])=><button key={value} aria-pressed={draft.order===value} onClick={()=>update({order:value})}>{label}</button>)}</div>
   <p className="setting-note" role="status">{ORDER_HINT[draft.order]}{sizePending&&<small>Midiendo el peso de tu fototeca: {number(index.sized)} de {number(index.total)}. Las que falten van al final.</small>}</p>
  </fieldset>
  <fieldset><legend><StampIcon size={18}/>Sellos</legend><label className="field">Mostrar<select value={draft.seal} onChange={e=>update({seal:['all','none'].includes(e.target.value)?e.target.value as 'all'|'none':Number(e.target.value)})}><option value="all">Todos los niveles</option><option value="none">Sin sello · pendientes de descubrir</option>{LEVELS.map((l,i)=><option key={l} value={i+1}>Sello {ROMAN[i]} · {sealRest(i+1)}</option>)}</select></label><label className="switch-field"><span>Incluir las que descansan<small>Las conservadas vuelven con menor frecuencia.</small></span><input type="checkbox" role="switch" checked={draft.includeWaiting} onChange={e=>update({includeWaiting:e.target.checked})}/></label></fieldset>
  <div className="filter-apply"><span>{invalid?(!draft.from||!draft.to?'Elige desde y hasta para aplicar':'La fecha inicial debe ir antes de la final'):<><AnimatedNumber value={count}/> {count===1?'archivo':'archivos'} en la pila con estos filtros</>}</span><button className="sheet-action" disabled={invalid} onClick={()=>apply({...draft,v:2})}>Aplicar filtros</button></div>
 </div>;
}
