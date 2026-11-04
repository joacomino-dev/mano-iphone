import { useEffect, useMemo, useState } from 'react';
import { UsersIcon } from '@phosphor-icons/react';
import { KeyboardInput } from './mobile';
import { thumbnailInfo } from './library';
import type { Asset, Filter } from './domain';
import { PeopleImage, usePeopleProtection } from './PeopleMedia';
import type { PersonItems, PeopleStatus } from './people';

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
  if (protectedPhoto) return <PeopleImage asset={hiddenAsset} allowReveal={false}/>;
  return image?.key === key ? <img src={image.src} alt="Fotografía representativa" draggable={false}/> : <span>Vista local no disponible</span>;
}

export function PeoplePanel({ status, error, assets, draft, change, action, call, revision }: {
  status: PeopleStatus; error: string; assets: Asset[]; draft: Filter; change: (f: Partial<Filter>) => void;
  action: (name: string, options?: Record<string, unknown>) => Promise<unknown>;
  call: (name: string, options?: Record<string, unknown>) => Promise<unknown>; revision: number;
}) {
  const [consenting, setConsenting] = useState(false), [deleting, setDeleting] = useState(false), [working, setWorking] = useState(false);
  const [items, setItems] = useState<PersonItems['items']>([]), [page, setPage] = useState(0), [picked, setPicked] = useState<string[]>([]);
  const [name, setName] = useState(''), [target, setTarget] = useState('');
  const byId = useMemo(()=>new Map(assets.map(a=>[a.id,a])),[assets]);
  const [groupPage,setGroupPage]=useState(0);
  const selected = status.groups.find(g => g.id === draft.person);
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
      <p className="setting-note" role="status">{status.running ? status.blocked === 'thermal' ? 'Esperando a que el iPhone se enfríe.' : status.blocked ? 'Análisis en espera.' : 'Detectando personas.' : status.remaining ? 'Análisis pausado.' : status.waiting ? 'Análisis local terminado.' : 'Biblioteca actualizada.'} {status.processed} de {status.total} fotografías analizadas. {status.groups.length} grupos encontrados.{status.waiting > 0 && <small>{status.waiting} sin vista local; se reintentan al reanudar. No se descargan automáticamente.</small>}<small>Avanza con la app abierta, cede ante gestos y multimedia y espera si el iPhone se calienta.</small></p>
      <div className="filter-chips"><button disabled={working} onClick={() => void run(status.running ? 'pause' : 'resume')}>{status.running ? 'Pausar análisis' : 'Reanudar análisis'}</button><button onClick={() => setDeleting(true)}>Desactivar y borrar índice</button></div>
      {deleting && <div className="people-confirm"><p>Se borrarán agrupaciones, nombres y datos faciales de CocoWash. Tus fotografías y decisiones no se borran.</p><button disabled={working} onClick={async () => { if (await run('reset')) { change({ person: undefined, breakup: undefined }); setDeleting(false); setConsenting(false); } }}>Borrar índice facial</button><button onClick={() => setDeleting(false)}>Cancelar</button></div>}
      <div className="people-groups" role="group" aria-label="Grupos de personas">
        {status.groups.slice(groupPage*20,groupPage*20+20).map(g => <button key={g.id} aria-pressed={draft.person === g.id} onClick={() => change({ person: g.id, breakup: 'normal', smart: 'all', media: 'all', seal: 'all', includeWaiting: true })}>
          <span className="person-portrait"><PersonPreview asset={byId.get(g.representative)}/></span><strong>{g.name}</strong><small>{g.count} fotografías</small>
        </button>)}
      </div>
      {status.groups.length>20&&<div className="filter-chips"><button disabled={groupPage===0} onClick={()=>setGroupPage(p=>p-1)}>Grupos anteriores</button><button disabled={(groupPage+1)*20>=status.groups.length} onClick={()=>setGroupPage(p=>p+1)}>Más personas</button></div>}
      {selected && <>
        <p className="setting-note">Grupo probable: {selected.name}. Aplica los filtros para revisarlo con las decisiones habituales. Las favoritas siguen protegidas.</p>
        <div className="filter-chips" role="group" aria-label="Breakup Mode">
          {([['normal', 'Normal'], ['face', 'Rostro censurado'], ['hidden', 'Fotografía oculta']] as const).map(([mode, label]) => <button key={mode} aria-pressed={draft.breakup === mode} onClick={() => change({ breakup: mode })}>{label}</button>)}
          <button onClick={() => change({ person: undefined, breakup: undefined })}>Quitar filtro Personas</button>
        </div>
        <p className="setting-note">Breakup Mode protege también la revisión y el zoom. Si no hay una coincidencia vigente o no está disponible la vista local, se mantiene oculta. No cambia el original.</p>
        <details><summary>Corregir este grupo</summary>
          <label className="field">Nombre opcional<KeyboardInput value={name} maxLength={60} onChange={e => setName(e.target.value)}/></label>
          <button disabled={working || !name.trim()} onClick={() => void run('correct', { operation: 'rename', person: selected.id, name: name.trim() })}>Guardar nombre</button>
          <label className="field">Unificar con<select value={target} onChange={e => setTarget(e.target.value)}><option value="">Elegir otro grupo</option>{status.groups.filter(g => g.id !== selected.id).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
          <button disabled={working || !target} onClick={async () => { if (await run('correct', { operation: 'merge', person: selected.id, target })) change({ person: target }); }}>Unificar grupos</button>
          <p className="setting-note">Selecciona los rostros asociados por error para excluirlos o separarlos. Las coordenadas indican qué rostro se está corrigiendo.</p>
          <div className="people-corrections">{items.map(item => <div key={item.id} className="people-correction">
            <div className="person-photo" style={{aspectRatio: byId.has(item.id)?`${byId.get(item.id)!.width}/${byId.get(item.id)!.height}`:undefined}}><PersonPreview asset={byId.get(item.id)}/>{item.faces.map((face, i) => <span key={face.id} className="person-face-box" style={{ left: `${face.box[0] * 100}%`, top: `${face.box[1] * 100}%`, width: `${face.box[2] * 100}%`, height: `${face.box[3] * 100}%` }}>{i + 1}</span>)}</div>
            {item.faces.map((face, i) => <label key={face.id}><input type="checkbox" checked={picked.includes(face.id)} onChange={e => setPicked(p => e.target.checked ? [...p, face.id] : p.filter(id => id !== face.id))}/>Rostro {i + 1}</label>)}
          </div>)}</div>
          <div className="filter-chips"><button disabled={working || !picked.length} onClick={() => void run('correct', { operation: 'exclude', person: selected.id, faces: picked })}>Excluir rostros seleccionados</button><button disabled={working || !picked.length} onClick={() => void run('correct', { operation: 'split', person: selected.id, faces: picked })}>Separar en otra persona</button></div>
          <div className="filter-chips"><button disabled={page === 0} onClick={() => { setPage(p => p - 1); setPicked([]); }}>Anteriores</button><span>Página {page + 1}</span><button disabled={(page + 1) * 30 >= selected.count} onClick={() => { setPage(p => p + 1); setPicked([]); }}>Siguientes</button></div>
        </details>
      </>}
    </>}
    {error && <p className="date-error" role="alert">{error}</p>}
  </fieldset>;
}
