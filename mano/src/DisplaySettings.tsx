import type { ReactNode } from 'react';
import { CameraIcon, FilmStripIcon, HandTapIcon, BooksIcon, ImageSquareIcon, CloudArrowDownIcon, StampIcon, GraduationCapIcon, PlayCircleIcon, FlaskIcon, TranslateIcon } from '@phosphor-icons/react';
import type { Asset } from './domain';
import { DATE_FORMATS, formatDate, formatTime, polaroidCaption, type DateFormat, type DisplaySettings, type OsdSize } from './meta';
import { VhsOverlay } from './Vhs';
import { haptic } from './haptics';
import { PREVIEW_PROFILES, PREVIEW_QUALITIES, type PreviewQuality } from './preview';
import { LANGS, languageChoice, locale, setLanguage, t, type Lang } from './i18n';

// Format samples only: a fixed illustrative moment, never attributed to a real file.
const SAMPLE_DATE = new Date(2021, 5, 17, 14, 25).getTime();
const SAMPLE: Asset = { id: 'sample', kind: 'video', date: SAMPLE_DATE, width: 1000, height: 1500, duration: 84, hasLocation: true, demo: true, bytes: 148_300_000 };
const SAMPLE_PLACE = { locality: 'Quito', country: 'Ecuador' };
const SAMPLE_PHOTO = '/assets/demo/postcard-2.svg';
const QUALITY_COPY: Record<PreviewQuality, [() => string, () => string]> = {
  fast: [() => t('Rápida'), () => t('Ocupa menos espacio y carga antes.')],
  balanced: [() => t('Equilibrada'), () => t('Nitidez de pantalla en la carta.')],
  high: [() => t('Alta calidad'), () => t('Más detalle al anclar y ampliar; usa más espacio y, con iCloud, más datos.')],
};
const OSD_SIZE: [OsdSize, () => string][] = [['s', () => t('Pequeño')], ['m', () => t('Mediano')], ['l', () => t('Grande')]];
const facts = (q: PreviewQuality) => { const p = PREVIEW_PROFILES[q]; return t('Carta hasta {card} px, {zoom} px al ampliar y {cache} MB de caché.', { card: p.cardMax, zoom: p.zoom, cache: p.cacheMB }); };

function Switch({ label, hint, checked, change }: { label: string; hint?: string; checked: boolean; change: (value: boolean) => void }) {
  return <label className="switch-field"><span>{label}{hint && <small>{hint}</small>}</span><input type="checkbox" role="switch" checked={checked} onChange={e => { haptic('selection'); change(e.target.checked); }}/></label>;
}
/** Options laid out as an even grid: every chip the same width, rows complete
 * (2 options → 2 columns, 3 or 6 → 3, 4 → 2 × 2). */
function Choice<T extends string | boolean>({ label, value, options, change, columns }: { label?: string; value: T; options: [T, string][]; change: (value: T) => void; columns?: number }) {
  const cols = columns ?? (options.length % 3 === 0 ? 3 : 2);
  return <div className="setting-choice">{label && <div className="field-label">{label}</div>}<div className={`filter-chips chip-grid cols-${cols}`} role="group" aria-label={label}>
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
  const language = languageChoice();
  return <div className="settings-panel">
    <p className="settings-intro">{t('Cambia cómo se ven tus recuerdos. No cambia qué fotos entran en la pila.')}</p>
    <fieldset>
      <legend><CameraIcon size={18}/>{t('Fotos')}</legend>
      <p className="settings-intro">{t('Lo que se escribe en el pie de cada Polaroid.')}</p>
      <div className="setting-preview" aria-hidden="true"><div className="mini-polaroid paper"><img src={SAMPLE_PHOTO} alt="" draggable={false}/>
        <span className="polaroid-caption"><span className="caption-where">{caption.where}</span>{caption.when && <span className="caption-when">{caption.when}</span>}</span></div>
        <small>{t('Vista previa')}</small></div>
      <Switch label={t('Ubicación')} hint={t('Ciudad donde se tomó, si la foto la guarda.')} checked={photo.location} change={location => setPhoto({ location })}/>
      <Switch label={t('Fecha')} checked={photo.date} change={date => setPhoto({ date })}/>
      {photo.date && <Choice label={t('Formato de fecha')} value={photo.dateFormat} options={dateOptions(false)} change={dateFormat => setPhoto({ dateFormat })}/>}
      <Switch label={t('Hora')} checked={photo.time} change={time => setPhoto({ time })}/>
      {photo.time && <Choice label={t('Formato de hora')} value={photo.hour12} options={[[false, formatTime(SAMPLE_DATE, false)!], [true, formatTime(SAMPLE_DATE, true)!]]} change={hour12 => setPhoto({ hour12 })}/>}
    </fieldset>
    <fieldset>
      <legend><FilmStripIcon size={18}/>{t('Vídeos')}</legend>
      <p className="settings-intro">{t('Las letras de cinta VHS sobre cada vídeo.')}</p>
      {/* A true miniature: the tape is laid out at a real card's width (the OSD
          fit depends on it) and only drawn smaller, so Pequeño / Mediano / Grande
          compare exactly as they will on the card. */}
      <div className="setting-preview" aria-hidden="true"><div className="mini-vhs-frame"><div className="mini-vhs"><img src={SAMPLE_PHOTO} alt="" draggable={false}/><VhsOverlay asset={SAMPLE} place={SAMPLE_PLACE} settings={video} label={false}/></div></div>
        <small>{t('Vista previa')}</small></div>
      <Switch label={t('Letras VHS')} hint={t('También con el ojo sobre cada vídeo.')} checked={video.osd} change={osd => setVideo({ osd })}/>
      {video.osd && <Choice label={t('Tamaño de las letras')} value={video.osdSize} options={OSD_SIZE.map(([size, text]) => [size, text()])} change={osdSize => setVideo({ osdSize })}/>}
      <Switch label={t('Fecha')} checked={video.date} change={date => setVideo({ date })}/>
      {video.date && <Choice label={t('Formato de fecha')} value={video.dateFormat} options={dateOptions(true)} change={dateFormat => setVideo({ dateFormat })}/>}
      <Switch label={t('Hora')} checked={video.time} change={time => setVideo({ time })}/>
      {video.time && <Choice label={t('Formato de hora')} value={video.hour12} options={[[true, formatTime(SAMPLE_DATE, true, true)!], [false, formatTime(SAMPLE_DATE, false)!]]} change={hour12 => setVideo({ hour12 })}/>}
      <Switch label={t('Ubicación')} checked={video.location} change={location => setVideo({ location })}/>
      <Switch label={t('Duración')} checked={video.duration} change={duration => setVideo({ duration })}/>
      <Switch label={t('Peso')} hint={t('Lo que liberas si lo eliminas.')} checked={video.size} change={size => setVideo({ size })}/>
    </fieldset>
    <fieldset>
      <legend><StampIcon size={18}/>{t('Sellos')}</legend>
      <p className="settings-intro">{t('Qué es cada sello y cuánto descansa, en Filtros › Sellos.')}</p>
      <Switch label={t('Mostrar el sello en las fotos')} hint={t('Tócalo sobre una foto para ocultarlos al momento.')} checked={photo.seal} change={seal => setPhoto({ seal })}/>
    </fieldset>
    <fieldset>
      <legend><ImageSquareIcon size={18}/>{t('Nitidez de las cartas')}</legend>
      <p className="settings-intro">{t('Solo cambia cómo se ve la vista previa en CocoWash. Tus originales no se tocan. Se aplica a las siguientes fotos.')}</p>
      <Choice value={display.quality} options={PREVIEW_QUALITIES.map(q => [q, QUALITY_COPY[q][0]()])} change={quality => change({ ...display, quality })}/>
      <p className="setting-note" role="status">{QUALITY_COPY[display.quality][1]()}<small>{facts(display.quality)}</small></p>
    </fieldset>
    <fieldset>
      <legend><CloudArrowDownIcon size={18}/>{t('Fotos en iCloud')}</legend>
      <p className="settings-intro">{t('Las fotos que solo están en iCloud se descargan en cuanto llegan a la pila, y las siguientes de la fila también, para que siempre se vean nítidas.')}</p>
      <Switch label={t('Ahorrar datos de iCloud')} hint={t('Decides con la vista ligera que ya está en tu iPhone y solo se descarga al anclar o ampliar.')} checked={display.cloud === 'save'} change={save => change({ ...display, cloud: save ? 'save' : 'always' })}/>
    </fieldset>
    <fieldset>
      <legend><HandTapIcon size={18}/>{t('Experiencia')}</legend>
      <Switch label={t('Vibración')} hint={t('Respuestas táctiles breves al decidir y anclar.')} checked={display.haptics} change={haptics => change({ ...display, haptics })}/>
      <Switch label={t('Modo Geek')} hint={t('Al anclar una foto, muestra los datos del archivo.')} checked={geek} change={setGeek}/>
    </fieldset>
    <fieldset>
      <legend><TranslateIcon size={18}/>{t('Idioma')}</legend>
      <Choice<Lang | 'auto'> value={language} columns={2} options={[['auto', t('Automático')], ...LANGS.map(l => [l.id, l.name] as [Lang, string])]} change={setLanguage}/>
      <p className="setting-note">{t('Automático sigue el idioma de tu iPhone. Al cambiarlo, CocoWash se reinicia.')}</p>
    </fieldset>
    <fieldset>
      <legend><BooksIcon size={18}/>{t('Biblioteca')}</legend>
      {library}
    </fieldset>
    {testing && <fieldset className="test-mode-field">
      <legend><FlaskIcon size={18}/>{t('Modo de prueba')}</legend>
      <Switch label={t('Practicar sin tocar Fotos')} hint={t('Postales de ejemplo sin fin: cada acción se imita y nada se borra ni se guarda en tu biblioteca. Los anuncios de prueba salen cada pocas fotos. Al cambiarlo, CocoWash se reinicia.')} checked={testing.on} change={testing.set}/>
    </fieldset>}
    <fieldset>
      <legend><GraduationCapIcon size={18}/>{t('Introducción')}</legend>
      <button className="sheet-action secondary replay-intro" onClick={replayIntro}><PlayCircleIcon size={20} weight="bold"/>{t('Ver la introducción de nuevo')}</button>
      <p className="settings-intro">{t('Las tarjetas del primer día: los gestos, el zoom y la privacidad.')}</p>
    </fieldset>
  </div>;
}
