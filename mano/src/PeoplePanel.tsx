import { useEffect, useMemo, useState } from 'react';
import { CheckIcon, DeviceMobileIcon, HeartBreakIcon } from '@phosphor-icons/react';
import { Character } from './Characters';
import { PersonMosaic } from './PersonMosaic';
import { canonicalPerson, interruptionNote } from './people';
import { KeyboardInput, useKeyboard } from './mobile';
import { thumbnailInfo, isNative } from './library';
import type { Asset, Filter } from './domain';
import { PeopleImage, usePeopleProtection } from './PeopleMedia';
import type { PersonItems, PeopleStatus } from './people';

function PreviewName({value,change}:{value:string;change:(s:string)=>void}){const keyboard=useKeyboard();return <KeyboardInput value={value} maxLength={60} onChange={e=>change(e.target.value)} onBlur={()=>keyboard.hide()}/>;}
function PersonName({value,change}:{value:string;change:(s:string)=>void}){return isNative?<input value={value} maxLength={60} onChange={e=>change(e.target.value)}/>:<PreviewName value={value} change={change}/>;}

function PersonPreview({ asset }: { asset?: Asset }) {
  const hiddenAsset: Asset = asset ?? { id: '', kind: 'photo', date: 0, width: 1, height: 1, duration: 0 };
  const protectedPhoto = usePeopleProtection();
  const key = `${asset?.id}:${asset?.modified ?? 0}`;
  const [image, setImage] = useState<{ key: string; src: string }>();
  useEffect(() => {
    if (!asset || protectedPhoto) return;
    const controller = new AbortController();
    void thumbnailInfo(asset, 320, false, false, controller.signal).then(t => { if (!controller.signal.aborted) setImage({ key, src: t.src }); }).catch(() => {});
    return () => controller.abort();
  }, [key, protectedPhoto]);
  if (protectedPhoto) return <PeopleImage asset={hiddenAsset} allowReveal={false} size={320}/>;
  return image?.key === key ? <img src={image.src} alt="Fotografía representativa" draggable={false}/> : <span>Vista local no disponible</span>;
}

export function PeoplePanel({ status, error, assets, draft, change, action, call, revision, review, settings }: {
  status: PeopleStatus; error: string; assets: Asset[]; draft: Filter; change: (f: Partial<Filter>) => void;
  action: (name: string, options?: Record<string, unknown>) => Promise<unknown>;
  call: (name: string, options?: Record<string, unknown>) => Promise<unknown>; revision: number;review?:(f:Filter)=>void;settings?:()=>void;
}) {
  const [deleting, setDeleting] = useState(false), [working, setWorking] = useState(false);
  const [diagnostic, setDiagnostic] = useState('');
  const [items, setItems] = useState<PersonItems['items']>([]), [page, setPage] = useState(0), [picked, setPicked] = useState<string[]>([]);
  const [name, setName] = useState(''), [target, setTarget] = useState('');
  const byId = useMemo(()=>new Map(assets.map(a=>[a.id,a])),[assets]);
  const [groupPage,setGroupPage]=useState(0);
  const initial=status.hasPublication===false||(!status.hasPublication&&(status.phase==='indexing'||status.phase==='reconciling'));
  const groups=initial?[]:status.groups;
  const selected = groups.find(g => g.id === canonicalPerson(draft.person,status.aliases));
  useEffect(() => { setName(selected?.name ?? ''); setPicked([]); setPage(0); setTarget(''); }, [selected?.id]);
  useEffect(() => {
    setItems([]); if (!selected) return; let alive = true;
    void call('person', { person: selected.id, offset: page * 30 }).then(value => { if (alive) setItems((value as PersonItems).items); }).catch(() => {});
    return () => { alive = false; };
  }, [selected?.id, page, revision]);
  const run = async (command: string, options: Record<string, unknown> = {}) => {
    if (working) return; setWorking(true);
    try { const result = await action(command, options); if (result) setPicked([]); return result; } finally { setWorking(false); }
  };
  if (!status.available) return null;
  const reconciling = status.phase === 'reconciling';
  // After the first pass (nothing left to read locally) the work is grouping, even while paused.
  const step = status.phase === 'ready' ? 3 : reconciling || (status.total > 0 && status.remaining === 0) ? 2 : 1;
  const working_ = status.running && !status.blocked && !error;
  const title = error ? 'El análisis necesita un nuevo intento' :
    status.phase === 'ready' ? 'Personas está al día' :
    !status.running ? (status.blocked === 'interrupted' ? 'El análisis se interrumpió' : 'Análisis en pausa') :
    status.blocked ? 'Análisis en espera' :
    reconciling ? 'Agrupando a las personas…' : 'Buscando rostros en tus fotos';
  const primary = status.running ? 'Pausar análisis' : status.phase === 'ready' ? 'Revisar agrupaciones' : 'Reanudar análisis';
  return <fieldset className="people-panel"><legend className="sr-only">Personas</legend>
    {!status.consent ? <div className="people-off">
      <Character className="people-mascot" pose="coqui-photos" height={72} motion="still"/>
      <p><strong>Personas está apagada</strong>Al activarla, CocoWash busca rostros y agrupa a las personas de tus fotos. Todo ocurre en este iPhone: nada se sube.</p>
      <button className="sheet-action" disabled={working} onClick={() => void run('consent')}>Activar Personas</button>
    </div> : <>
      <section className={`people-status${working_ ? ' is-working' : ''}`} aria-label="Estado del análisis">
        <Character className="people-mascot" pose="coqui-photos" height={64} motion={working_ ? 'sway' : 'still'}/>
        <div className="people-status-text">
          <p className="people-title" role="status">{title}</p>
          {error && <p className="date-error" role="alert">{error}</p>}
          {status.running && <p className="people-lede"><DeviceMobileIcon size={15} weight="bold" aria-hidden="true"/>Todo ocurre en este iPhone. Sigue decidiendo; si sales de CocoWash, se pausa y continúa al volver.</p>}
        </div>
      </section>
      {status.phase !== 'ready' && <ol className="people-steps" aria-label="Etapas del análisis">
        <li className={step > 1 ? 'is-done' : ''} aria-current={step === 1 ? 'step' : undefined}>{step > 1 && <CheckIcon size={13} weight="bold" aria-hidden="true"/>}Buscar rostros</li>
        <li aria-current={step === 2 ? 'step' : undefined}>Agrupar personas</li>
      </ol>}
      {status.running && !status.total && !reconciling && <progress className="people-progress" aria-label="Preparando el análisis"/>}
      {reconciling && status.running ? <progress className="people-progress" aria-label="Agrupando a las personas"/> :
        status.total > 0 && step === 1 && <progress className="people-progress" aria-label="Fotos revisadas" value={status.processed} max={status.total}/>}
      {status.total > 0 && <p className="people-count"><strong>{status.processed.toLocaleString('es-EC')}</strong>{step >= 2 ? ' fotos revisadas' : ` de ${status.total.toLocaleString('es-EC')} fotos revisadas`}</p>}
      {status.waiting > 0 && <p className="setting-note">{status.waiting === 1 ? '1 foto está' : `${status.waiting.toLocaleString('es-EC')} fotos están`} solo en iCloud; se revisarán cuando estén en el iPhone.</p>}
      {!!status.skipped && <p className="setting-note">{status.skipped === 1 ? '1 foto apartada' : `${status.skipped} fotos apartadas`} porque la app se cerró dos veces al revisarla. Siguen en Fotos y en CocoWash.</p>}
      {!!status.blocked && <p className="setting-note">{status.blocked === 'interrupted' ? interruptionNote(status) : status.blocked === 'thermal' ? 'Esperando a que el iPhone se enfríe.' : status.blocked === 'permission' ? 'CocoWash necesita acceso a Fotos.' : 'Seguirá en cuanto el iPhone tenga recursos libres.'}</p>}
      <button className={`sheet-action${status.running ? ' secondary' : ''}`} disabled={working} onClick={()=>void run(status.running?'pause':status.phase==='ready'?'reconcile':'resume')}>{primary}</button>
      {!initial&&!groups.length&&<p className="setting-note">Todavía no hay grupos con al menos {status.minimumPhotos??'varias'} fotos distintas. Los grupos pequeños se guardan para futuras coincidencias.</p>}
      {groups.length > 0 && <h4 className="people-section">Grupos <small>{groups.length}</small></h4>}
      <div className="people-groups" role="group" aria-label="Grupos de personas">
        {groups.slice(groupPage*20,groupPage*20+20).map(g => {const on=selected?.id===g.id;return <button key={g.id} aria-pressed={on} onClick={() => change({ person: g.id, breakup: draft.breakup??'normal', censorStyle:draft.censorStyle??'oval', smart: 'all', media: 'all', seal: 'all', includeWaiting: true })}>
          <PersonMosaic group={g} revision={revision}/><strong>{g.name}</strong><small>{g.count} fotos</small>
          {on && <span className="people-picked" aria-hidden="true"><CheckIcon size={14} weight="bold"/></span>}
        </button>;})}
      </div>
      {groups.length>20&&<div className="people-pages"><button disabled={groupPage===0} onClick={()=>setGroupPage(p=>p-1)}>Anteriores</button><span>{groupPage+1} de {Math.ceil(groups.length/20)}</span><button disabled={(groupPage+1)*20>=groups.length} onClick={()=>setGroupPage(p=>p+1)}>Más personas</button></div>}
      {selected && <>
        <p className="setting-note">Grupo probable: puede equivocarse. Si ves a otra persona, corrígelo abajo. Las favoritas siguen protegidas.</p>
        <details><summary>Corregir el grupo de {selected.name}</summary>
          <label className="field">Nombre opcional<PersonName value={name} change={setName}/></label>
          <button disabled={working || !name.trim()} onClick={() => void run('correct', { operation: 'rename', person: selected.id, name: name.trim() })}>Guardar nombre</button>
          <label className="field">Unificar con<select value={target} onChange={e => setTarget(e.target.value)}><option value="">Elegir otro grupo</option>{status.groups.filter(g => g.id !== selected.id).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
          <button disabled={working || !target} onClick={async () => { if (await run('correct', { operation: 'merge', person: selected.id, target })) change({ person: target }); }}>Unificar grupos</button>
          <p className="setting-note">Marca los rostros asociados por error para excluirlos o separarlos. Cada número señala un rostro de esa foto.</p>
          <div className="people-corrections">{items.map(item => <div key={item.id} className="people-correction">
            <div className="person-photo" style={{aspectRatio: byId.has(item.id)?`${byId.get(item.id)!.width}/${byId.get(item.id)!.height}`:undefined}}><PersonPreview asset={byId.get(item.id)}/>{item.faces.map((face, i) => <span key={face.id} className="person-face-box" style={{ left: `${face.box[0] * 100}%`, top: `${face.box[1] * 100}%`, width: `${face.box[2] * 100}%`, height: `${face.box[3] * 100}%` }}>{i + 1}</span>)}</div>
            {item.faces.map((face, i) => <label key={face.id}><input type="checkbox" checked={picked.includes(face.id)} onChange={e => setPicked(p => e.target.checked ? [...p, face.id] : p.filter(id => id !== face.id))}/>Rostro {i + 1}</label>)}
          </div>)}</div>
          <div className="filter-chips"><button disabled={working || !picked.length} onClick={() => void run('correct', { operation: 'exclude', person: selected.id, faces: picked })}>Excluir rostros</button><button disabled={working || !picked.length} onClick={() => void run('correct', { operation: 'split', person: selected.id, faces: picked })}>Separar en otra persona</button></div>
          <div className="people-pages"><button disabled={page === 0} onClick={() => { setPage(p => p - 1); setPicked([]); }}>Anteriores</button><span>Página {page + 1}</span><button disabled={(page + 1) * 30 >= selected.count} onClick={() => { setPage(p => p + 1); setPicked([]); }}>Siguientes</button></div>
        </details>
        <div className="people-selected-bar">
          <button className="sheet-action" disabled={working} onClick={()=>review?.(draft)} aria-label={`Revisar las fotos de ${selected.name}`}><span className="people-bar-label">Revisar sus fotos</span></button>
          <button className="sheet-action secondary" onClick={settings}><HeartBreakIcon size={18} weight="fill" aria-hidden="true"/>Breakup Mode</button>
        </div>
      </>}
      {status.correctionsNeedReview&&<p className="setting-note">Hay correcciones de fotos editadas que requieren revisión. Se conservan y no se trasladan a otro rostro sin suficiente certeza.</p>}
      <div className="people-quiet">
        <button className="text-button" disabled={working} onClick={()=>{setDiagnostic('');void call('shareDiagnostics').catch(()=>setDiagnostic('No se pudo abrir la hoja para compartir el diagnóstico.'));}}>Compartir diagnóstico</button>
        <button className="text-button is-danger" onClick={()=>setDeleting(true)}>Desactivar y borrar índice</button>
      </div>
      {diagnostic&&<p className="setting-note" role="alert">{diagnostic}</p>}
      {deleting && <div className="people-confirm" role="alertdialog" aria-label="Borrar índice facial"><p>Se borrarán agrupaciones, nombres y datos faciales de CocoWash, y Personas quedará apagada hasta que la actives. Breakup Mode se desactiva. Tus fotografías y decisiones no se borran.</p><div className="filter-chips"><button className="is-danger" disabled={working} onClick={async () => { if (await run('reset')) { change({ person: undefined, breakup: undefined }); setDeleting(false); } }}>Borrar índice facial</button><button onClick={() => setDeleting(false)}>Cancelar</button></div></div>}
    </>}
    {!status.consent && error && <p className="date-error" role="alert">{error}</p>}
  </fieldset>;
}
