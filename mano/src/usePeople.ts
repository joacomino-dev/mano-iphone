import { useEffect, useRef, useState } from 'react';
import { isNative } from './library';
import { PeopleBridge } from './PeopleMedia';
import { NO_PEOPLE, type PeopleStatus, type PersonItems } from './people';

export function usePeople(fingerprint: string, paused: boolean, person?: string) {
  const [status, setStatus] = useState<PeopleStatus>(NO_PEOPLE), [error, setError] = useState('');
  const [revision, setRevision] = useState(0), [members, setMembers] = useState<{ person: string; ids: Set<string> }>();
  const [libraryChanges, setLibraryChanges] = useState(0);
  const refreshed = useRef<string | undefined>(undefined);
  const quietUntil = useRef(0), enabled = useRef(false), busy = useRef(false), serial = useRef(0);
  const call = async (action: string, options: Record<string, unknown> = {}) => PeopleBridge.command({ action, ...options });
  const adopt = (value: unknown) => { const result = value as PeopleStatus; if (typeof result.available === 'boolean') { enabled.current = !!result.running; setStatus({ ...NO_PEOPLE, ...result }); } };
  useEffect(() => { if (!isNative) return; let alive = true;
    void call('status').then(value => { if (alive) { refreshed.current = fingerprint; adopt(value); } }).catch(() => { if (alive) setStatus(NO_PEOPLE); });
    return () => { alive = false; enabled.current = false; void call('pause').catch(() => {}); };
  }, []);
  useEffect(() => {
    if (!isNative || !status.available || !status.consent) return;
    let alive = true;
    const listener = PeopleBridge.addListener('libraryChanged', () => { if (alive) setLibraryChanges(v => v + 1); });
    return () => { alive = false; void listener.then(l => l.remove()).catch(() => {}); };
  }, [status.available, status.consent]);
  useEffect(() => { if (!status.available || !status.consent || refreshed.current === fingerprint) return; let alive = true;
    enabled.current = false;
    void (async () => { await call('pause'); while (busy.current) await new Promise(resolve => setTimeout(resolve, 100));
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
      if (enabled.current && !busy.current && !paused && !document.hidden && performance.now() >= quietUntil.current) {
        busy.current = true; const token = serial.current;
        try { const value = await call('scan'); if (!stopped && token === serial.current) { adopt(value); setRevision(v => v + 1); } }
        catch { if (!stopped) { enabled.current = false; setError('Análisis pausado. Reintenta cuando el iPhone esté disponible.'); } }
        finally { busy.current = false; }
      }
      if (!stopped) timer = setTimeout(tick, 1200);
    };
    timer = setTimeout(tick, 1200);
    const hide = () => { if (document.hidden) void call('pause').then(adopt).catch(() => {}); };
    document.addEventListener('visibilitychange', hide);
    return () => { stopped = true; clearTimeout(timer); document.removeEventListener('visibilitychange', hide); };
  }, [status.available, paused]);
  const action = async (name: string, options: Record<string, unknown> = {}) => {
    setError(''); enabled.current = false; serial.current++;
    try {
      await call('pause'); while (busy.current) await new Promise(resolve => setTimeout(resolve, 100));
      const value = await call(name, options); if (name === 'consent' || name === 'resume') refreshed.current = fingerprint; adopt(value); setRevision(v => v + 1); return value;
    } catch { setError('No se pudo completar. Tus fotos siguen intactas; puedes reintentar.'); return undefined; }
  };
  return { status, error, revision, libraryChanges, action, call, members: members && members.person === person ? members.ids : undefined,
    interact: () => { quietUntil.current = performance.now() + 1000; if (busy.current) void call('yield').catch(()=>{}); } };
}
