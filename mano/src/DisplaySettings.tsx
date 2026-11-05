import type { ReactNode } from 'react';
import { CameraIcon, FilmStripIcon, HandTapIcon, BooksIcon, ImageSquareIcon, CloudArrowDownIcon, StampIcon, GraduationCapIcon, PlayCircleIcon, FlaskIcon } from '@phosphor-icons/react';
import type { Asset } from './domain';
import { DATE_FORMATS, formatDate, formatTime, polaroidCaption, type CloudMode, type DateFormat, type DisplaySettings, type OsdSize } from './meta';
import { VhsOverlay } from './Vhs';
import { haptic } from './haptics';
import { PREVIEW_PROFILES, PREVIEW_QUALITIES, type PreviewQuality } from './preview';

// Format samples only: a fixed illustrative moment, never attributed to a real file.
const SAMPLE_DATE = new Date(2021, 5, 17, 14, 25).getTime();
const SAMPLE: Asset = { id: 'sample', kind: 'video', date: SAMPLE_DATE, width: 1000, height: 1500, duration: 84, hasLocation: true, demo: true, bytes: 148_300_000 };
const SAMPLE_PLACE = { locality: 'Quito', country: 'Ecuador' };
const SAMPLE_PHOTO = '/assets/demo/postcard-2.svg';
const QUALITY_COPY: Record<PreviewQuality, [string, string]> = {
  fast: ['Rápida', 'Ocupa menos espacio y carga antes.'],
  balanced: ['Equilibrada', 'Nitidez de pantalla en la carta.'],
  high: ['Alta calidad', 'Más detalle al anclar y ampliar; usa más espacio y, con iCloud, más datos.'],
};
const QUALITY = PREVIEW_QUALITIES.map(q => [q, ...QUALITY_COPY[q]] as const);
const CLOUD: [CloudMode, string, string][] = [
  ['save', 'Ahorrar iCloud', 'Decides con la vista que ya está en tu iPhone. Solo se descarga al anclar, ampliar o pulsar «Descargar y ver»: no gastas datos ni espacio en lo que vas a borrar.'],
  ['always', 'Descargar siempre', 'Cada carta se descarga con nitidez completa. Más cómodo con buena conexión y espacio libre.'],
];
const OSD_SIZE: [OsdSize, string][] = [['s', 'Pequeño'], ['m', 'Mediano'], ['l', 'Grande']];
const facts = (q: PreviewQuality) => { const p = PREVIEW_PROFILES[q]; return `Carta hasta ${p.cardMax} px, ${p.zoom} px al ampliar y ${p.cacheMB} MB de caché.`; };
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
export function DisplaySettingsPanel({ display, change, geek, setGeek, library, replayIntro, testing }: {
  display: DisplaySettings; change: (next: DisplaySettings) => void; geek: boolean; setGeek: (value: boolean) => void;
  library: ReactNode; replayIntro: () => void;
  /** iPhone only, until 1.0: «Modo de prueba» (testMode.ts). */
  testing?: { on: boolean; set: (on: boolean) => void };
}) {
  const photo = display.photo, video = display.video;
  const setPhoto = (patch: Partial<typeof photo>) => change({ ...display, photo: { ...photo, ...patch } });
  const setVideo = (patch: Partial<typeof video>) => change({ ...display, video: { ...video, ...patch } });
  const caption = polaroidCaption(SAMPLE, SAMPLE_PLACE, photo, locale);
  return <div className="settings-panel">
    <p className="settings-intro">Cambia cómo se ven tus recuerdos. No cambia qué fotos entran en la pila.</p>
    <fieldset>
      <legend><CameraIcon size={18}/>Fotos</legend>
      <p className="settings-intro">Lo que se escribe en el pie de cada Polaroid.</p>
      <div className="setting-preview" aria-hidden="true"><div className="mini-polaroid paper"><img src={SAMPLE_PHOTO} alt="" draggable={false}/>
        <span className="polaroid-caption"><span className="caption-where">{caption.where}</span>{caption.when && <span className="caption-when">{caption.when}</span>}</span></div>
        <small>Vista previa</small></div>
      <Switch label="Ubicación" hint="Ciudad donde se tomó, si la foto la guarda." checked={photo.location} change={location => setPhoto({ location })}/>
      <Switch label="Fecha" checked={photo.date} change={date => setPhoto({ date })}/>
      {photo.date && <Choice label="Formato de fecha" value={photo.dateFormat} options={dateOptions(false)} change={dateFormat => setPhoto({ dateFormat })}/>}
      <Switch label="Hora" checked={photo.time} change={time => setPhoto({ time })}/>
      {photo.time && <Choice label="Formato de hora" value={photo.hour12} options={[[false, formatTime(SAMPLE_DATE, false)!], [true, formatTime(SAMPLE_DATE, true)!]]} change={hour12 => setPhoto({ hour12 })}/>}
    </fieldset>
    <fieldset>
      <legend><FilmStripIcon size={18}/>Vídeos</legend>
      <p className="settings-intro">Las letras de cinta VHS sobre cada vídeo.</p>
      {/* A true miniature: the tape is laid out at a real card's width (the OSD
          fit depends on it) and only drawn smaller, so Pequeño / Mediano / Grande
          compare exactly as they will on the card. */}
      <div className="setting-preview" aria-hidden="true"><div className="mini-vhs-frame"><div className="mini-vhs"><img src={SAMPLE_PHOTO} alt="" draggable={false}/><VhsOverlay asset={SAMPLE} place={SAMPLE_PLACE} settings={video} label={false}/></div></div>
        <small>Vista previa</small></div>
      <Switch label="Letras VHS" hint="También con el ojo sobre cada vídeo." checked={video.osd} change={osd => setVideo({ osd })}/>
      {video.osd && <Choice label="Tamaño de las letras" value={video.osdSize} options={OSD_SIZE} change={osdSize => setVideo({ osdSize })}/>}
      <Switch label="Fecha" checked={video.date} change={date => setVideo({ date })}/>
      {video.date && <Choice label="Formato de fecha" value={video.dateFormat} options={dateOptions(true)} change={dateFormat => setVideo({ dateFormat })}/>}
      <Switch label="Hora" checked={video.time} change={time => setVideo({ time })}/>
      {video.time && <Choice label="Formato horario" value={video.hour12} options={[[true, `12 h · ${formatTime(SAMPLE_DATE, true, true)}`], [false, `24 h · ${formatTime(SAMPLE_DATE, false)}`]]} change={hour12 => setVideo({ hour12 })}/>}
      <Switch label="Ubicación" checked={video.location} change={location => setVideo({ location })}/>
      <Switch label="Duración" checked={video.duration} change={duration => setVideo({ duration })}/>
      <Switch label="Peso" hint="Lo que liberas si lo eliminas." checked={video.size} change={size => setVideo({ size })}/>
    </fieldset>
    <fieldset>
      <legend><StampIcon size={18}/>Sellos</legend>
      <p className="settings-intro">Qué es cada sello y cuánto descansa, en Filtros › Sellos.</p>
      <Switch label="Mostrar el sello en las fotos" hint="Tócalo sobre una foto para ocultarlos al momento." checked={photo.seal} change={seal => setPhoto({ seal })}/>
    </fieldset>
    <fieldset>
      <legend><ImageSquareIcon size={18}/>Nitidez de las cartas</legend>
      <p className="settings-intro">Solo cambia cómo se ve la vista previa en CocoWash. Tus originales no se tocan. Se aplica a las siguientes fotos.</p>
      <div className="filter-chips quality-chips" role="group" aria-label="Calidad de vista previa">
        {QUALITY.map(([value, label]) => <button key={value} aria-pressed={display.quality === value} onClick={() => { haptic('selection'); change({ ...display, quality: value }); }}>{label}</button>)}
      </div>
      {QUALITY.filter(([value]) => value === display.quality).map(([value, , text]) => <p key={value} className="setting-note" role="status">{text}<small>{facts(value)}</small></p>)}
    </fieldset>
    <fieldset>
      <legend><CloudArrowDownIcon size={18}/>Fotos en iCloud</legend>
      <div className="filter-chips" role="group" aria-label="Fotos en iCloud">
        {CLOUD.map(([value, label]) => <button key={value} aria-pressed={display.cloud === value} onClick={() => { haptic('selection'); change({ ...display, cloud: value }); }}>{label}</button>)}
      </div>
      {CLOUD.filter(([value]) => value === display.cloud).map(([value, , text]) => <p key={value} className="setting-note" role="status">{text}</p>)}
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
    {testing && <fieldset className="test-mode-field">
      <legend><FlaskIcon size={18}/>Modo de prueba</legend>
      <Switch label="Practicar sin tocar Fotos" hint="Usa las postales de ejemplo e imita cada acción: nada se borra ni se guarda en tu biblioteca. Los anuncios de prueba salen cada pocas fotos para que los revises. Al cambiarlo, CocoWash se reinicia." checked={testing.on} change={testing.set}/>
    </fieldset>}
    <fieldset>
      <legend><GraduationCapIcon size={18}/>Introducción</legend>
      <button className="sheet-action secondary replay-intro" onClick={replayIntro}><PlayCircleIcon size={20} weight="bold"/>Ver la introducción de nuevo</button>
      <p className="settings-intro">Las tarjetas del primer día: los gestos, anclar, ampliar y la privacidad.</p>
    </fieldset>
  </div>;
}
