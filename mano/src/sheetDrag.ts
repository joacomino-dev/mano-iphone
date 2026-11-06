import { useEffect, useRef } from 'react';

/** Swipe a sheet down from its top — the grabber, the header or the
 * Filtros/Ajustes/Apoyo tabs — to close it, like an iOS sheet. It follows the
 * finger; let go far enough (a quarter of its height, at most 140 px) or fast
 * enough and it leaves, otherwise it settles back. The body keeps scrolling as
 * usual: only those top areas start the drag. A drag never ends in a tap. */
/** `sheet` comes from a callback ref: the dialog mounts its content a moment
 * after `open` turns true, so the effect waits for the element itself. */
export function useSheetDrag(sheet: HTMLElement | null, open: boolean, close: () => void) {
  const latest = useRef(close);
  latest.current = close;
  useEffect(() => {
    if (!open || !sheet) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const shade = sheet.previousElementSibling instanceof HTMLElement && sheet.previousElementSibling.classList.contains('native-shade') ? sheet.previousElementSibling : null;
    let start: { x: number; y: number; id: number } | null = null;
    let dragging = false, dy = 0, lastY = 0, lastT = 0, speed = 0, swallow = 0, leaving = 0;
    const zone = (target: EventTarget | null) => target instanceof Element && !!target.closest('.sheet-grabber, .native-sheet>header, .sheet-tabs');
    const place = (y: number, animate: boolean) => {
      sheet.style.transition = animate && !reduced ? 'transform .24s cubic-bezier(.2,.8,.2,1)' : 'none';
      sheet.style.transform = y ? `translateY(${y}px)` : '';
      if (shade) { shade.style.transition = sheet.style.transition.replace('transform', 'opacity'); shade.style.opacity = y ? String(Math.max(0, 1 - y / sheet.offsetHeight)) : ''; }
    };
    const down = (e: PointerEvent) => {
      if (!e.isPrimary || !zone(e.target)) return;
      start = { x: e.clientX, y: e.clientY, id: e.pointerId };
      dragging = false; dy = 0; speed = 0; lastY = e.clientY; lastT = performance.now();
    };
    const move = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return;
      const dx = e.clientX - start.x, d = e.clientY - start.y;
      if (!dragging) {
        if (d > 8 && d > Math.abs(dx)) { dragging = true; try { sheet.setPointerCapture(e.pointerId); } catch { /* optional */ } }
        else { if (Math.abs(dx) > 10 || d < -10) start = null; return; }
      }
      e.preventDefault();
      const now = performance.now();
      speed = (e.clientY - lastY) / Math.max(1, now - lastT);
      lastY = e.clientY; lastT = now;
      dy = Math.max(0, d);
      place(dy, false);
    };
    const up = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return;
      start = null;
      if (!dragging) return;
      dragging = false;
      swallow = performance.now() + 400;
      if (e.type !== 'pointercancel' && (dy > Math.min(140, sheet.offsetHeight / 4) || speed > .6)) {
        place(sheet.offsetHeight, true);
        leaving = window.setTimeout(() => latest.current(), reduced ? 0 : 200);
      } else place(0, true);
    };
    // The click that follows a drag (on a tab or the close button) is not a tap.
    const click = (e: MouseEvent) => { if (performance.now() < swallow) { e.preventDefault(); e.stopPropagation(); } };
    sheet.addEventListener('pointerdown', down);
    sheet.addEventListener('pointermove', move, { passive: false });
    sheet.addEventListener('pointerup', up);
    sheet.addEventListener('pointercancel', up);
    sheet.addEventListener('click', click, true);
    return () => {
      window.clearTimeout(leaving);
      sheet.removeEventListener('pointerdown', down);
      sheet.removeEventListener('pointermove', move);
      sheet.removeEventListener('pointerup', up);
      sheet.removeEventListener('pointercancel', up);
      sheet.removeEventListener('click', click, true);
      place(0, false);
    };
  }, [sheet, open]);
}
