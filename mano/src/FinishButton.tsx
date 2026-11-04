import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { AnimatedNumber } from './Loader';
import { EmptyFinishPresses } from './finish';

export function FinishButton({ pending, busy, finish, announce }: { pending: number; busy: boolean; finish: () => void; announce: (text: string) => void }) {
  const reduced = useReducedMotion(), burst = useRef(new EmptyFinishPresses());
  const button = useRef<HTMLButtonElement>(null), shake = useRef<Animation | null>(null);
  const [message, setMessage] = useState(false);
  useEffect(() => { if (!message) return; const timer = setTimeout(() => setMessage(false), 2400); return () => clearTimeout(timer); }, [message]);
  useEffect(() => { burst.current.clear(); setMessage(false); shake.current?.cancel(); shake.current = null; }, [pending]);
  useEffect(() => () => { shake.current?.cancel(); }, []);
  return <>
    <button ref={button} id="review-trigger" className="header-action finish" disabled={busy} aria-disabled={pending === 0}
      onClick={() => { if (pending > 0) { burst.current.clear(); finish(); return; }
        if (shake.current?.playState !== 'running' && !reduced && button.current) {
          shake.current = button.current.animate([0, -4, 4, -3, 3, 0].map(x => ({ transform: `translateX(${x}px)` })), { duration: 280, easing: 'ease-out' });
        }
        if (burst.current.press(performance.now())) { setMessage(true); announce('No hay elementos seleccionados'); }
      }}>
      <span>Terminar</span>{pending > 0 && <><span className="finish-count" aria-hidden="true"><AnimatedNumber value={pending}/></span><span className="sr-only">, {pending} para eliminar</span></>}
    </button>
    {message && <div className="empty-finish-message" role="status">No hay elementos seleccionados</div>}
  </>;
}
