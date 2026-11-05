import { useEffect, useMemo, useState } from 'react';
import { UsersIcon } from '@phosphor-icons/react';
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
  const [consenting, setConsenting] = useState(false), [deleting, setDeleting] = useState(false), [working, setWorking] = useState(false);
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
  return <fieldset className="people-panel"><legend><UsersIcon size={18}/>Personas</legend>
    {!status.consent ? <>
      <p className="setting-note">Encuentra fotografías de una misma persona. El análisis facial y sus datos se quedan en este iPhone, sin subidas ni nombres automáticos. Los grupos pueden equivocarse y puedes corregirlos o borrar el índice.</p>
      <label className="switch-field"><span>Permitir el análisis facial local<small>Solo fotos accesibles. No se descargan originales de iCloud ni se analizan vídeos.</small></span><input type="checkbox" checked={consenting} onChange={e => setConsenting(e.target.checked)}/></label>
      <button className="sheet-action secondary" disabled={!consenting || working} onClick={() => void run('consent')}>Activar Personas</button>
    </> : <>
      <div className="people-analysis">
        <Character className="people-mascot" pose="coqui-photos" height={56} motion="still"/>
        <div>
          <p role="status"><strong>{error ? 'El análisis necesita un nuevo intento' :
            status.phase === 'ready' ? 'Personas está actualizada' :
            !status.running ? 'Análisis pausado' :
            status.blocked ? 'Análisis en espera' :
            status.phase === 'reconciling' ? 'Organizando los grupos…' : 'Buscando caras conocidas'}</strong></p>
          {status.running && <p>Puedes seguir organizando tus fotos mientras tanto.</p>}
          {status.running && !status.total && status.phase !== 'reconciling' && <progress aria-label="Preparando el análisis"/>}
          {status.total > 0 && <>
            <progress aria-label="Fotos revisadas" value={status.processed} max={status.total}/>
            <p>{status.processed.toLocaleString('es-EC')} de {status.total.toLocaleString('es-EC')} fotos revisadas</p>
          </>}
          {status.waiting > 0 && <p className="setting-note">{status.waiting} sin vista local</p>}
          {!!status.skipped && <p className="setting-note">{status.skipped === 1 ? '1 foto apartada' : `${status.skipped} fotos apartadas`} porque la app se cerró dos veces al revisarla. Siguen en Fotos y en CocoWash.</p>}
          {!!status.blocked && <p className="setting-note">{status.blocked === 'interrupted' ? interruptionNote(status) : status.blocked === 'thermal' ? 'Esperando a que el iPhone se enfríe.' : status.blocked === 'permission' ? 'CocoWash necesita acceso a Fotos.' : 'El análisis seguirá cuando haya recursos disponibles.'}</p>}
        </div>
      </div>
      <div className="filter-chips"><button disabled={working} onClick={()=>void run(status.running?'pause':status.phase==='ready'?'reconcile':'resume')}>{status.running?'Pausar análisis':status.phase==='ready'?'Revisar agrupaciones':'Reanudar análisis'}</button><button onClick={()=>setDeleting(true)}>Desactivar y borrar índice</button>
        <button disabled={working} onClick={()=>{setDiagnostic('');void call('shareDiagnostics').catch(()=>setDiagnostic('No se pudo abrir la hoja para compartir el diagnóstico.'));}}>Compartir diagnóstico</button></div>
      {diagnostic&&<p className="setting-note" role="alert">{diagnostic}</p>}
      {!initial&&!groups.length&&<p className="setting-note">Todavía no hay grupos con al menos {status.minimumPhotos??'varias'} fotos distintas. Los grupos pequeños se conservan para futuras coincidencias. Las fotos sin vista local no detienen el análisis.</p>}
      {deleting && <div className="people-confirm"><p>Se borrarán agrupaciones, nombres y datos faciales de CocoWash, y se desactivará Breakup Mode. Tus fotografías y decisiones no se borran.</p><button disabled={working} onClick={async () => { if (await run('reset')) { change({ person: undefined, breakup: undefined }); setDeleting(false); setConsenting(false); } }}>Borrar índice facial</button><button onClick={() => setDeleting(false)}>Cancelar</button></div>}
      <div className="people-groups" role="group" aria-label="Grupos de personas">
        {groups.slice(groupPage*20,groupPage*20+20).map(g => <button key={g.id} aria-pressed={draft.person === g.id} onClick={() => change({ person: g.id, breakup: draft.breakup??'normal', censorStyle:draft.censorStyle??'oval', smart: 'all', media: 'all', seal: 'all', includeWaiting: true })}>
          <PersonMosaic group={g} revision={revision}/><strong>{g.name}</strong><small>{g.count} fotografías</small>
        </button>)}
      </div>
      {groups.length>20&&<div className="filter-chips"><button disabled={groupPage===0} onClick={()=>setGroupPage(p=>p-1)}>Grupos anteriores</button><button disabled={(groupPage+1)*20>=groups.length} onClick={()=>setGroupPage(p=>p+1)}>Más personas</button></div>}
      {selected && <>
        <p className="setting-note">Grupo probable: {selected.name}. Aplica los filtros para revisarlo con las decisiones habituales. Las favoritas siguen protegidas.</p>
        <button className="sheet-action" disabled={working} onClick={()=>review?.(draft)}>Revisar estas fotografías</button>
        <button className="sheet-action secondary" onClick={settings}>Ajustar Breakup Mode</button>
        <p className="setting-note">La censura se configura en Ajustes y se aplica a esta persona. Las favoritas siguen protegidas.</p>
        <details><summary>Corregir este grupo</summary>
          <label className="field">Nombre opcional<PersonName value={name} change={setName}/></label>
          <button disabled={working || !name.trim()} onClick={() => void run('correct', { operation: 'rename', person: selected.id, name: name.trim() })}>Guardar nombre</button>
          <label className="field">Unificar con<select value={target} onChange={e => setTarget(e.target.value)}><option value="">Elegir otro grupo</option>{status.groups.filter(g => g.id !== selected.id).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
          <button disabled={working || !target} onClick={async () => { if (await run('correct', { operation: 'merge', person: selected.id, target })) change({ person: target }); }}>Unificar grupos</button>
          <p className="setting-note">Selecciona los rostros asociados por error para excluirlos o separarlos. Cada número señala un rostro de esta foto.</p>
          <div className="people-corrections">{items.map(item => <div key={item.id} className="people-correction">
            <div className="person-photo" style={{aspectRatio: byId.has(item.id)?`${byId.get(item.id)!.width}/${byId.get(item.id)!.height}`:undefined}}><PersonPreview asset={byId.get(item.id)}/>{item.faces.map((face, i) => <span key={face.id} className="person-face-box" style={{ left: `${face.box[0] * 100}%`, top: `${face.box[1] * 100}%`, width: `${face.box[2] * 100}%`, height: `${face.box[3] * 100}%` }}>{i + 1}</span>)}</div>
            {item.faces.map((face, i) => <label key={face.id}><input type="checkbox" checked={picked.includes(face.id)} onChange={e => setPicked(p => e.target.checked ? [...p, face.id] : p.filter(id => id !== face.id))}/>Rostro {i + 1}</label>)}
          </div>)}</div>
          <div className="filter-chips"><button disabled={working || !picked.length} onClick={() => void run('correct', { operation: 'exclude', person: selected.id, faces: picked })}>Excluir rostros seleccionados</button><button disabled={working || !picked.length} onClick={() => void run('correct', { operation: 'split', person: selected.id, faces: picked })}>Separar en otra persona</button></div>
          <div className="filter-chips"><button disabled={page === 0} onClick={() => { setPage(p => p - 1); setPicked([]); }}>Anteriores</button><span>Página {page + 1}</span><button disabled={(page + 1) * 30 >= selected.count} onClick={() => { setPage(p => p + 1); setPicked([]); }}>Siguientes</button></div>
        </details>
      </>}
    </>}
    {status.correctionsNeedReview&&<p className="setting-note">Hay correcciones de fotos editadas que requieren revisión. Se conservan y no se trasladan a otro rostro sin suficiente certeza.</p>}
    {error && <p className="date-error" role="alert">{error}</p>}
  </fieldset>;
}
