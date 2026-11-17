type TouchPoint = { clientX: number; clientY: number };
type LastTouch = TouchPoint & { time: number };

/** Detect WebKit's second tap-and-hold without interfering with pinch gestures. */
export function repeatedPress(previous: LastTouch | undefined, point: TouchPoint, time: number): boolean {
  return !!previous && time >= previous.time && time - previous.time < 400
    && Math.hypot(point.clientX - previous.clientX, point.clientY - previous.clientY) < 44;
}

/** Cards own their pointer gestures. Suppress native text selection on a second
 * touch there using DOM events, leaving controls and editable fields untouched.
 * The grid has its own equivalent guard alongside its scroll/selection routing.
 * Install it on the photo surfaces' own containers (the card stage, the anchored
 * view), never on the document: a non-passive touchstart there makes WebKit wait for
 * the main thread before every scroll and pinch anywhere in the app (CW-CL-085). */
export function guardPhotoTextInteraction(root: Document | HTMLElement): () => void {
  let previous: LastTouch | undefined;
  let multiple = false;
  const editable = 'button,a,input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="slider"]';
  const surface = '.photo-card,.inspection-photo,.inspection-shade';
  const start = (event: Event) => {
    if (!(event instanceof TouchEvent)) return;
    if (event.touches.length !== 1) { multiple = true; previous = undefined; return; }
    multiple = false;
    const target = event.target;
    if (!(target instanceof Element) || target.closest(editable) || !target.closest(surface)) { previous = undefined; return; }
    if (repeatedPress(previous, event.touches[0], event.timeStamp)) event.preventDefault();
  };
  const end = (event: Event) => {
    if (!(event instanceof TouchEvent)) return;
    if (multiple || event.touches.length) return;
    const target = event.target, point = event.changedTouches[0];
    previous = point && target instanceof Element && !target.closest(editable) && target.closest(surface)
      ? { clientX: point.clientX, clientY: point.clientY, time: event.timeStamp } : undefined;
  };
  const cancel = () => { previous = undefined; multiple = false; };
  root.addEventListener('touchstart', start, { passive: false });
  root.addEventListener('touchend', end, { passive: true });
  root.addEventListener('touchcancel', cancel, { passive: true });
  return () => {
    root.removeEventListener('touchstart', start);
    root.removeEventListener('touchend', end);
    root.removeEventListener('touchcancel', cancel);
  };
}
