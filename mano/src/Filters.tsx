import { useState } from 'react';
import { CalendarBlankIcon, ImagesIcon, StampIcon, ArrowCounterClockwiseIcon } from '@phosphor-icons/react';
import { eligible, initialFilter, LEVELS, type Asset, type Filter, type RecordState } from './domain';
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

export function Filters({filter,assets,state,apply}: {filter:Filter;assets:Asset[];state:RecordState;apply:(f:Filter)=>void}) {
 const [draft,setDraft]=useState<Filter>({...initialFilter,...filter});
 const update=(change:Partial<Filter>)=>{haptic('selection');setDraft(d=>({...d,...change}));};
 const invalid=draft.dateRange==='custom'&&(!draft.from||!draft.to||draft.from>draft.to);
 const count=eligible(assets,state,draft).length;
 return <div className="filters-panel">
  <div className="filter-intro"><button onClick={()=>setDraft({...initialFilter})}><ArrowCounterClockwiseIcon size={16}/>Restablecer</button></div>
  <fieldset><legend><CalendarBlankIcon size={18}/>Fecha</legend><div className="filter-chips">{([['all','Cualquier fecha'],['24h','Últimas 24 h'],['7d','Últimos 7 días'],['30d','Últimos 30 días'],['custom','Elegir fechas']] as const).map(([value,label])=><button key={value} aria-pressed={(draft.dateRange??'all')===value} onClick={()=>update({dateRange:value})}>{label}</button>)}</div>
   {draft.dateRange==='custom'&&<><DateCalendar from={draft.from} to={draft.to} change={update}/>{invalid&&<small className="date-error" role="status">Elige una fecha inicial y una final válidas.</small>}</>}
  </fieldset>
  <fieldset><legend><ImagesIcon size={18}/>Contenido</legend><div className="filter-chips">{([['all','Todo'],['photo','Fotos'],['video','Vídeos'],['live','Live Photos']] as const).map(([value,label])=><button key={value} aria-pressed={draft.media===value} onClick={()=>update({media:value})}>{label}</button>)}</div><div className="field-label" id="order-label">Orden</div><div className="filter-chips" role="group" aria-labelledby="order-label">{([['random','Aleatorio'],['newest','Más recientes'],['oldest','Más antiguas']] as const).map(([value,label])=><button key={value} aria-pressed={draft.order===value} onClick={()=>update({order:value})}>{label}</button>)}</div></fieldset>
  <fieldset><legend><StampIcon size={18}/>Sellos</legend><label className="field">Mostrar<select value={draft.seal} onChange={e=>update({seal:['all','none'].includes(e.target.value)?e.target.value as 'all'|'none':Number(e.target.value)})}><option value="all">Todos los niveles</option><option value="none">Sin sello · pendientes de descubrir</option>{LEVELS.map((l,i)=><option key={l} value={i+1}>Sello {ROMAN[i]} · {sealRest(i+1)}</option>)}</select></label><label className="switch-field"><span>Incluir las que descansan<small>Las conservadas vuelven con menor frecuencia.</small></span><input type="checkbox" role="switch" checked={draft.includeWaiting} onChange={e=>update({includeWaiting:e.target.checked})}/></label></fieldset>
  <div className="filter-apply"><span>{invalid?(!draft.from||!draft.to?'Elige desde y hasta para aplicar':'La fecha inicial debe ir antes de la final'):<><AnimatedNumber value={count}/> {count===1?'foto':'fotos'} en la pila con estos filtros</>}</span><button className="sheet-action" disabled={invalid} onClick={()=>apply(draft)}>Aplicar filtros</button></div>
 </div>;
}
