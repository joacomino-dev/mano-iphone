import { useEffect, useRef, useState } from 'react';
import { isNative } from './library';
import { PeopleBridge } from './PeopleMedia';
import { NO_PEOPLE, type PeopleStatus, type PersonItems } from './people';

export function usePeople(fingerprint: string, paused: boolean, person?: string) {
  const [status, setStatus] = useState<PeopleStatus>(NO_PEOPLE), [error, setError] = useState('');
  const [revision, setRevision] = useState(0), [members, setMembers] = useState<{ person: string; ids: Set<string> }>();
  const [libraryChanges, setLibraryChanges] = useState(0);
  const refreshed = useRef<string | undefined>(undefined);
  const publicRevision=useRef<number|undefined>(undefined);
  const quietUntil = useRef(0), enabled = useRef(false), busy = useRef(false), serial = useRef(0);
  const pausedRef = useRef(paused); pausedRef.current = paused;
  const call = async (action: string, options: Record<string, unknown> = {}) => PeopleBridge.command({ action, ...options });
  const adopt = (value: unknown) => {
    const result=value as Partial<PeopleStatus>;
    if(typeof result.available!=='boolean')return;
    enabled.current=!!result.running;
    if(result.revision!==undefined&&result.revision!==publicRevision.current){publicRevision.current=result.revision;setRevision(v=>v+1);}
    setStatus(previous=>{
      const next={...previous,...result};
      const keys=['available','consent','running','phase','blocked','hasPublication','revision','protectionRevision','correctionsNeedReview','processed','total','remaining','waiting','skipped','interruptedPhase'] as const;
      return keys.every(k=>previous[k]===next[k])&&previous.guarded?.join()===next.guarded?.join()&&!result.groups?previous:next;
    });
  };
  const fail = (message:string) => {
    enabled.current=false;serial.current++;setError(message);
    setStatus(previous=>({...previous,available:true,consent:true,running:false,phase:'paused'}));
  };
  const idle = async () => {
    const until=performance.now()+8000;
    while(busy.current){if(performance.now()>=until)throw new Error('Analysis still draining');await new Promise(resolve=>setTimeout(resolve,50));}
  };
  useEffect(() => { if (!isNative) return; let alive = true;
    void call('status').then(value => { if (alive) { refreshed.current = fingerprint; adopt(value); } }).catch(() => { if (alive) fail('No se pudo abrir Personas. Reintenta el análisis o borra únicamente su índice local.'); });
    return () => { alive = false; enabled.current = false; void call('pause',{reason:'suspend'}).catch(() => {}); };
  }, []);
  useEffect(() => {
    if (!isNative || !status.available || !status.consent) return;
    let alive = true;
    const listener = PeopleBridge.addListener('libraryChanged', () => { if (alive) setLibraryChanges(v => v + 1); });
    return () => { alive = false; void listener.then(l => l.remove()).catch(() => {}); };
  }, [status.available, status.consent]);
  useEffect(() => { if (!status.available || !status.consent || refreshed.current === fingerprint) return; let alive = true;
    if(enabled.current){refreshed.current=fingerprint;return;}
    enabled.current = false;
    void (async () => { await call('pause',{reason:'suspend'}); await idle();
      const value = await call('refresh'); if (alive) { refreshed.current = fingerprint; adopt(value); setRevision(v => v + 1); }
    })().catch(() => { if (alive) setError('No se pudo actualizar Personas. El análisis sigue pausado.'); });
    return () => { alive = false; };
  }, [fingerprint, status.available, status.consent]);
  useEffect(() => {
    if (!person || !status.available || !status.consent) { setMembers(undefined); return; }
    let alive = true; setMembers(previous => previous?.person === person ? previous : undefined);
    void call('person', { person }).then(value => { if (alive) {
      const ids = new Set((value as PersonItems).ids);
      setMembers(previous => previous?.person === person && previous.ids.size === ids.size && [...ids].every(id => previous.ids.has(id)) ? previous : { person, ids });
    } }).catch(() => { if (alive) setMembers(undefined); });
    return () => { alive = false; };
  }, [person, revision, status.available, status.consent]);
  useEffect(() => {
    if (!status.available) return;
    let stopped = false, timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (stopped) return;
      if (enabled.current && !busy.current && !pausedRef.current && !document.hidden && performance.now() >= quietUntil.current) {
        busy.current = true; const token = serial.current;
        const watchdog = setTimeout(() => {
          if (!stopped && token === serial.current) {
            fail('Una tanda de Personas dejó de responder. Espera a que termine o vuelve a abrir CocoWash para recuperar el progreso guardado.');
            void call('pause', { reason: 'suspend' }).catch(() => {});
          }
        }, 45000);
        try { const value = await call('scan',{sinceRevision:publicRevision.current}); if (!stopped && token === serial.current) { adopt(value); } }
        catch { if (!stopped && token === serial.current) { fail('Análisis pausado por un error. Puedes reintentarlo; tus fotos siguen intactas.'); } }
        finally { clearTimeout(watchdog); busy.current = false; }
      }
      if (!stopped) timer = setTimeout(tick, 1200);
    };
    timer = setTimeout(tick, 1200);
    const recover = async () => {
      enabled.current=false;const token=++serial.current;
      try { await idle();const value=await call('status');if(!stopped&&token===serial.current&&!document.hidden){setError('');adopt(value);} }
      catch { if(!stopped&&token===serial.current)fail('El análisis sigue pausado. Cierra y vuelve a abrir CocoWash si no responde.'); }
    };
    const hide = () => {
      enabled.current=false;const token=++serial.current;
      if(document.hidden){setStatus(previous=>({...previous,running:false,phase:previous.phase==='ready'?'ready':'paused'}));void call('pause',{reason:'suspend'}).then(value=>{if(!stopped&&token===serial.current&&document.hidden)adopt(value);}).catch(()=>{});}
      else void recover();
    };
    const stateListener=PeopleBridge.addListener('stateChanged',()=>{if(!document.hidden)void recover();});
    document.addEventListener('visibilitychange', hide);
    return () => { stopped = true; clearTimeout(timer); document.removeEventListener('visibilitychange', hide);void stateListener.then(l=>l.remove()).catch(()=>{}); };
  }, [status.available]);
  const action = async (name: string, options: Record<string, unknown> = {}) => {
    setError(''); enabled.current = false; serial.current++;
    try {
      if(name==='reset'){try{await call('pause',{reason:'suspend'});}catch{/* A corrupt index must not prevent deleting that index. */}}
      else await call('pause',{reason:'suspend'});
      await idle();
      const value = await call(name, options); if (name === 'consent' || name === 'resume' || name === 'reconcile') refreshed.current = fingerprint; adopt(value); setRevision(v => v + 1); return value;
    } catch { fail('No se pudo completar. El análisis está pausado; tus fotos siguen intactas y puedes reintentar.'); return undefined; }
  };
  return { status:paused&&status.running?{...status,blocked:status.blocked||'media'}:status, error, revision, libraryChanges, action, call, members: members && members.person === person ? members.ids : undefined,
    interact: () => { quietUntil.current = performance.now() + 1000; if (busy.current) void call('yield').catch(()=>{}); } };
}
