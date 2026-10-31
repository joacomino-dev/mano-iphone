import type { ReactNode } from 'react';
import { CameraIcon, FilmStripIcon, HandTapIcon, BooksIcon } from '@phosphor-icons/react';
import type { Asset } from './domain';
import { DATE_FORMATS, formatDate, formatTime, polaroidCaption, type DateFormat, type DisplaySettings } from './meta';
import { VhsOverlay } from './Vhs';
import { haptic } from './haptics';

// Format samples only: a fixed illustrative moment, never attributed to a real file.
const SAMPLE_DATE = new Date(2021, 5, 17, 14, 25).getTime();
const SAMPLE: Asset = { id: 'sample', kind: 'video', date: SAMPLE_DATE, width: 1000, height: 1500, duration: 84, hasLocation: true, demo: true };
const SAMPLE_PLACE = { locality: 'Quito', country: 'Ecuador' };
const locale = typeof navigator !== 'undefined' ? navigator.language || 'es' : 'es';

function Switch({ label, hint, checked, change }: { label: string; hint?: string; checked: boolean; change: (value: boolean) => void }) {
  return <label className="switch-field"><span>{label}{hint && <small>{hint}</small>}</span><input type="checkbox" role="switch" checked={checked} onChange={e => { haptic('selection'); change(e.target.checked); }}/></label>;
}
function Choice<T extends string | boolean>({ label, value, options, change }: { label: string; value: T; options: [T, string][]; change: (value: T) => void }) {
  return <div className="setting-choice"><div className="field-label">{label}</div><div className="filter-chips" role="group" aria-label={label}>
    {options.map(([option, text]) => <button key={String(option)} aria-pressed={value === option} onClick={() => { haptic('selection'); change(option); }}>{text}</button>)}
  </div></div>;
}
const dateOptions = (upper: boolean) => DATE_FORMATS.map(format => [format, formatDate(SAMPLE_DATE, format, locale, upper)!] as [DateFormat, string]);

/** How information looks on cards. Applied live and saved; it never affects
 * which files the filters put in the pile. */
export function DisplaySettingsPanel({ display, change, geek, setGeek, library }: {
  display: DisplaySettings; change: (next: DisplaySettings) => void; geek: boolean; setGeek: (value: boolean) => void;
  library: ReactNode;
}) {
  const photo = display.photo, video = display.video;
  const setPhoto = (patch: Partial<typeof photo>) => change({ ...display, photo: { ...photo, ...patch } });
  const setVideo = (patch: Partial<typeof video>) => change({ ...display, video: { ...video, ...patch } });
  const caption = polaroidCaption(SAMPLE, SAMPLE_PLACE, photo, locale);
  return <div className="settings-panel">
    <p className="settings-intro">Cambia cómo se ven tus recuerdos. No cambia qué fotos entran en la pila.</p>
    <fieldset>
      <legend><CameraIcon size={18}/>Fotos · Polaroid</legend>
      <div className="setting-preview" aria-hidden="true"><div className="mini-polaroid paper"><img src="/assets/photos/lake.png" alt="" draggable={false}/>
        <span className="polaroid-caption">{caption.where && <span className="caption-where">{caption.where}</span>}{caption.when && <span className="caption-when">{caption.when}</span>}</span></div>
        <small>Vista previa</small></div>
      <Switch label="Ubicación" hint="Ciudad donde se tomó, si la foto la guarda." checked={photo.location} change={location => setPhoto({ location })}/>
      <Switch label="Fecha" checked={photo.date} change={date => setPhoto({ date })}/>
      {photo.date && <Choice label="Formato de fecha" value={photo.dateFormat} options={dateOptions(false)} change={dateFormat => setPhoto({ dateFormat })}/>}
      <Switch label="Hora" checked={photo.time} change={time => setPhoto({ time })}/>
      {photo.time && <Choice label="Formato de hora" value={photo.hour12} options={[[false, formatTime(SAMPLE_DATE, false)!], [true, formatTime(SAMPLE_DATE, true)!]]} change={hour12 => setPhoto({ hour12 })}/>}
    </fieldset>
    <fieldset>
      <legend><FilmStripIcon size={18}/>Vídeos · VHS</legend>
      <div className="setting-preview" aria-hidden="true"><div className="mini-vhs"><img src="/assets/photos/lake.png" alt="" draggable={false}/><VhsOverlay asset={SAMPLE} place={SAMPLE_PLACE} settings={video} label={false}/></div>
        <small>Vista previa</small></div>
      <Switch label="Fecha" checked={video.date} change={date => setVideo({ date })}/>
      {video.date && <Choice label="Formato de fecha" value={video.dateFormat} options={dateOptions(true)} change={dateFormat => setVideo({ dateFormat })}/>}
      <Switch label="Hora" checked={video.time} change={time => setVideo({ time })}/>
      {video.time && <Choice label="Formato horario" value={video.hour12} options={[[true, `12 h · ${formatTime(SAMPLE_DATE, true, true)}`], [false, `24 h · ${formatTime(SAMPLE_DATE, false)}`]]} change={hour12 => setVideo({ hour12 })}/>}
      <Switch label="Ubicación" checked={video.location} change={location => setVideo({ location })}/>
      <Switch label="Duración" checked={video.duration} change={duration => setVideo({ duration })}/>
    </fieldset>
    <fieldset>
      <legend><HandTapIcon size={18}/>Experiencia</legend>
      <Switch label="Vibración" hint="Respuestas táctiles breves al decidir y anclar." checked={display.haptics} change={haptics => change({ ...display, haptics })}/>
      <Switch label="Modo Geek" hint="Al anclar una foto, muestra los datos del archivo." checked={geek} change={setGeek}/>
    </fieldset>
    <fieldset>
      <legend><BooksIcon size={18}/>Biblioteca</legend>
      {library}
    </fieldset>
  </div>;
}
