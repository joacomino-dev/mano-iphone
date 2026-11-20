import { useState, type ReactNode } from 'react';
import { CameraIcon, FilmStripIcon, HandTapIcon, BooksIcon, ImageSquareIcon, CloudArrowDownIcon, GraduationCapIcon, PlayCircleIcon, CaretLeftIcon, CaretRightIcon, CoffeeIcon, LightbulbIcon, StackIcon, MagnifyingGlassPlusIcon, PushPinIcon, FolderSimplePlusIcon, ArrowCounterClockwiseIcon, FlaskIcon, TranslateIcon, LifebuoyIcon, QuestionIcon, ShieldCheckIcon } from '@phosphor-icons/react';
import { helpUrl, openLink, privacyUrl } from './links';
import type { Asset } from './domain';
import { DATE_FORMATS, formatDate, formatTime, polaroidCaption, type DateFormat, type DisplaySettings, type OsdSize } from './meta';
import { VhsOverlay } from './Vhs';
import { haptic } from './haptics';
import { PREVIEW_QUALITIES, type PreviewQuality } from './preview';
import { LANGS, languageChoice, locale, setLanguage, t, type Lang } from './i18n';
import { onAndroid } from './locales/android';
import { readTips, resetSeen, saveTips } from './tips';

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

/** One section: a title in the brand's coffee and one grouped block of rows. */
function Section({ icon, title, children, note, className = '' }: { icon: ReactNode; title: string; children: ReactNode; note?: ReactNode; className?: string }) {
  return <section className={`settings-section ${className}`}>
    <h3 className="settings-title">{icon}{title}</h3>
    {children}
    {note && <p className="settings-note">{note}</p>}
  </section>;
}
function Switch({ label, hint, checked, change }: { label: string; hint?: string; checked: boolean; change: (value: boolean) => void }) {
  return <label className="switch-field"><span>{label}{hint && <small>{hint}</small>}</span><input type="checkbox" role="switch" checked={checked} onChange={e => { haptic('selection'); change(e.target.checked); }}/></label>;
}
/** Options as an even grid: every chip the same width, rows complete
 * (2 options → 2 columns, 3 or 6 → 3, 4 → 2 × 2). Inside a group it sits
 * under the row it belongs to. */
function Choice<T extends string | boolean>({ label, value, options, change, columns }: { label: string; value: T; options: [T, string][]; change: (value: T) => void; columns?: number }) {
  const cols = columns ?? (options.length % 3 === 0 ? 3 : 2);
  return <div className={`filter-chips chip-grid cols-${cols}`} role="group" aria-label={label}>
    {options.map(([option, text]) => <button key={String(option)} aria-pressed={value === option} onClick={() => { haptic('selection'); change(option); }}>{text}</button>)}
  </div>;
}
const dateOptions = (upper: boolean) => DATE_FORMATS.map(format => [format, formatDate(SAMPLE_DATE, format, locale, upper)!] as [DateFormat, string]);

/** How information looks on cards. Applied live and saved; it never affects
 * which files the filters put in the pile. 9.8.5: grouped rows, one line of
 * help at most, the Polaroid and VHS previews as the only ornament. */
export function DisplaySettingsPanel({ display, change, stampWordsAuto = true, geek, setGeek, library, replayIntro, testing, support }: {
  display: DisplaySettings; change: (next: DisplaySettings) => void; stampWordsAuto?: boolean; geek: boolean; setGeek: (value: boolean) => void;
  library: ReactNode; replayIntro: () => void;
  /** «Apoyo» (purchases), when the store is available. */
  support?: () => void;
  /** iPhone only, until 1.0: «Modo de prueba» (testMode.ts). */
  testing?: { on: boolean; set: (on: boolean) => void; ads: boolean; setAds: (on: boolean) => void };
}) {
  const photo = display.photo, video = display.video;
  const setPhoto = (patch: Partial<typeof photo>) => change({ ...display, photo: { ...photo, ...patch } });
  const setVideo = (patch: Partial<typeof video>) => change({ ...display, video: { ...video, ...patch } });
  const caption = polaroidCaption(SAMPLE, SAMPLE_PLACE, photo, locale);
  const language = languageChoice();
  const [page, setPage] = useState<'home' | 'photos' | 'videos' | 'quality' | 'language' | 'help'>('home');
  const go = (next: typeof page) => { haptic('selection'); setPage(next); };
  // A short front page; each heavier group has its own screen (user, 2026-11-20).
  if (page !== 'home') return <div className="settings-panel is-detail">
    <button type="button" className="detail-back" onClick={() => go('home')}><CaretLeftIcon size={16} weight="bold" className="flip-rtl"/>{t('Volver a Ajustes')}</button>
    {page === 'photos' && <>
    <Section icon={<CameraIcon size={18}/>} title={t('Fotos')}>
      <div className="setting-preview" aria-hidden="true"><div className={`mini-polaroid paper ${photo.polaroid ? '' : 'is-plain'}`}><img src={SAMPLE_PHOTO} alt="" draggable={false}/>
        {photo.polaroid && <span className="polaroid-caption"><span className="caption-where">{caption.where}</span>{caption.when && <span className="caption-when">{caption.when}</span>}</span>}</div></div>
      <div className="settings-group">
        <Switch label={t('Modo Polaroid')} hint={t('Marco de papel con lugar y fecha. Sin él, la foto se ve más grande.')} checked={photo.polaroid} change={polaroid => setPhoto({ polaroid })}/>
        {photo.polaroid && <>
        <Switch label={t('Ubicación')} checked={photo.location} change={location => setPhoto({ location })}/>
        <Switch label={t('Fecha')} checked={photo.date} change={date => setPhoto({ date })}/>
        {photo.date && <div className="group-sub"><Choice label={t('Formato de fecha')} value={photo.dateFormat} options={dateOptions(false)} change={dateFormat => setPhoto({ dateFormat })}/></div>}
        <Switch label={t('Hora')} checked={photo.time} change={time => setPhoto({ time })}/>
        {photo.time && <div className="group-sub"><Choice label={t('Formato de hora')} value={photo.hour12} options={[[false, formatTime(SAMPLE_DATE, false)!], [true, formatTime(SAMPLE_DATE, true)!]]} change={hour12 => setPhoto({ hour12 })}/></div>}
        </>}
        <Switch label={t('Mostrar el sello en las fotos')} checked={photo.seal} change={seal => setPhoto({ seal })}/>
      </div>
    </Section>
    </>}
    {page === 'videos' && <>
    <Section icon={<FilmStripIcon size={18}/>} title={t('Vídeos')}>
      {/* A true miniature: the tape is laid out at a real card's width (the OSD
          fit depends on it) and only drawn smaller. */}
      <div className="setting-preview" aria-hidden="true"><div className="mini-vhs-frame"><div className="mini-vhs"><img src={SAMPLE_PHOTO} alt="" draggable={false}/><VhsOverlay asset={SAMPLE} place={SAMPLE_PLACE} settings={video} label={false}/></div></div></div>
      <div className="settings-group">
        <Switch label={t('Letras VHS')} checked={video.osd} change={osd => setVideo({ osd })}/>
        {video.osd && <>
        <div className="group-sub"><Choice label={t('Tamaño de las letras')} value={video.osdSize} options={OSD_SIZE.map(([size, text]) => [size, text()])} change={osdSize => setVideo({ osdSize })}/></div>
        <Switch label={t('Fecha')} checked={video.date} change={date => setVideo({ date })}/>
        {video.date && <div className="group-sub"><Choice label={t('Formato de fecha')} value={video.dateFormat} options={dateOptions(true)} change={dateFormat => setVideo({ dateFormat })}/></div>}
        <Switch label={t('Hora')} checked={video.time} change={time => setVideo({ time })}/>
        {video.time && <div className="group-sub"><Choice label={t('Formato de hora')} value={video.hour12} options={[[true, formatTime(SAMPLE_DATE, true, true)!], [false, formatTime(SAMPLE_DATE, false)!]]} change={hour12 => setVideo({ hour12 })}/></div>}
        <Switch label={t('Ubicación')} checked={video.location} change={location => setVideo({ location })}/>
        <Switch label={t('Duración')} checked={video.duration} change={duration => setVideo({ duration })}/>
        <Switch label={t('Peso')} hint={t('Lo que liberas si lo eliminas.')} checked={video.size} change={size => setVideo({ size })}/>
        </>}
      </div>
    </Section>
    </>}
    {page === 'quality' && <>
    <Section icon={<ImageSquareIcon size={18}/>} title={t('Nitidez de las cartas')} note={QUALITY_COPY[display.quality][1]()}>
      <Choice label={t('Nitidez de las cartas')} value={display.quality} options={PREVIEW_QUALITIES.map(q => [q, QUALITY_COPY[q][0]()])} change={quality => change({ ...display, quality })}/>
    </Section>
    {/* Android's MediaStore has no cloud-only items: nothing to save there. */}
    {!onAndroid() && <Section icon={<CloudArrowDownIcon size={18}/>} title={t('Fotos en iCloud')}>
      <div className="settings-group">
        <Switch label={t('Ahorrar datos de iCloud')} hint={t('Solo descarga al anclar o ampliar.')} checked={display.cloud === 'save'} change={save => change({ ...display, cloud: save ? 'save' : 'always' })}/>
      </div>
    </Section>}
    </>}
    {page === 'language' && <>
    <Section icon={<TranslateIcon size={18}/>} title={t('Idioma')} note={t('Al cambiarlo, CocoWash se reinicia.')}>
      <Choice<Lang | 'auto'> label={t('Idioma')} value={language} columns={2} options={[['auto', t('Automático')], ...LANGS.map(l => [l.id, l.name] as [Lang, string])]} change={setLanguage}/>
    </Section>
    </>}
    {page === 'help' && <>
    <Section icon={<GraduationCapIcon size={18}/>} title={t('Introducción')}>
      <div className="settings-actions"><button className="sheet-action secondary replay-intro" onClick={replayIntro}><PlayCircleIcon size={20} weight="bold"/>{t('Ver la introducción de nuevo')}</button></div>
    </Section>
    <Section icon={<LightbulbIcon size={18}/>} title={t('Trucos')} note={t('Coqui los enseña la primera vez que te sirven.')}>
      <TipsList/>
    </Section>
    <Section icon={<LifebuoyIcon size={18}/>} title={t('Ayuda')}>
      <div className="support-links help-links">
        <button type="button" className="text-button" onClick={() => void openLink(helpUrl()).catch(() => {})}><QuestionIcon size={16}/>{t('Preguntas frecuentes')}</button>
        <button type="button" className="text-button" onClick={() => void openLink(privacyUrl()).catch(() => {})}><ShieldCheckIcon size={16}/>{t('Política de privacidad')}</button>
      </div>
    </Section>
    </>}
  </div>;
  const languageName = language === 'auto' ? t('Automático') : LANGS.find(l => l.id === language)?.name ?? '';
  return <div className="settings-panel">
    <div className="nav-group">
      <NavRow icon={<CameraIcon size={18} weight="bold"/>} tone="teal" title={t('Cómo se ven tus fotos')} open={() => go('photos')}/>
      <NavRow icon={<FilmStripIcon size={18} weight="bold"/>} tone="blue" title={t('Vídeos')} open={() => go('videos')}/>
      <NavRow icon={<ImageSquareIcon size={18} weight="bold"/>} tone="coffee" title={t('Calidad e iCloud')} value={QUALITY_COPY[display.quality][0]()} open={() => go('quality')}/>
      <NavRow icon={<TranslateIcon size={18} weight="bold"/>} tone="violet" title={t('Idioma')} value={languageName} open={() => go('language')}/>
    </div>
    <Section icon={<HandTapIcon size={18}/>} title={t('Experiencia')}>
      <div className="settings-group">
        <Switch label={t('Vibración')} checked={display.haptics} change={haptics => change({ ...display, haptics })}/>
        <Switch label={t('Palabras en los sellos')} hint={t('Al principio se ven; después queda solo el sello.')} checked={display.stampWords ?? stampWordsAuto} change={stampWords => change({ ...display, stampWords })}/>
        <Switch label={t('Modo Geek')} hint={t('Al anclar una foto, muestra los datos del archivo.')} checked={geek} change={setGeek}/>
      </div>
    </Section>
    <Section icon={<BooksIcon size={18}/>} title={t('Biblioteca')}>
      <div className="settings-actions">{library}</div>
    </Section>
    <div className="nav-group">
      <NavRow icon={<LifebuoyIcon size={18} weight="bold"/>} tone="pink" title={t('Ayuda y trucos')} open={() => go('help')}/>
      {support && <NavRow icon={<CoffeeIcon size={18} weight="bold"/>} tone="amber" title={t('Apoyo')} open={support}/>}
    </div>
    {testing && <Section icon={<FlaskIcon size={18}/>} title={t('Modo developer')} className="test-mode-field">
      <div className="settings-group">
        <Switch label={t('Modo de prueba')} hint={t('Postales de ejemplo: nada toca tu biblioteca. Anuncios de prueba frecuentes.')} checked={testing.on} change={testing.set}/>
        <Switch label={t('Anuncios')} hint={t('Apágalos para ver la app como quien pagó por quitarlos.')} checked={testing.ads} change={testing.setAds}/>
      </div>
    </Section>}
  </div>;
}

/** A row of the front page: icon, name, current value, and a way into its screen. */
function NavRow({ icon, tone, title, value, open }: { icon: ReactNode; tone: string; title: string; value?: string; open: () => void }) {
  return <button type="button" className="nav-row" onClick={() => { haptic('selection'); open(); }}>
    <span className={`nav-icon tone-${tone}`} aria-hidden="true">{icon}</span><span className="nav-title">{title}</span>{value && <span className="nav-value">{value}</span>}<CaretRightIcon size={14} weight="bold" className="flip-rtl" aria-hidden="true"/>
  </button>;
}

/** Ajustes › Trucos: every advanced gesture in one place (the pile teaches each one the
 * first time it helps: ContextTips.tsx), and a way to see them on the pile again. */
function TipsList() {
  const [again, setAgain] = useState(false);
  const rows: [ReactNode, string, string][] = [
    [<StackIcon size={22} weight="bold"/>, t('Grupos de fotos'), t('Toca la foto para ver la siguiente.')],
    [<MagnifyingGlassPlusIcon size={22} weight="bold"/>, t('Ampliar'), t('Pellizca la foto para verla de cerca.')],
    [<PushPinIcon size={22} weight="bold"/>, t('Anclar'), t('Mantén pulsada la foto y arrástrala hasta Anclar.')],
    ...(onAndroid() ? [] : [[<FolderSimplePlusIcon size={22} weight="bold"/>, t('Álbum'), t('Guarda la foto en un álbum sin salir de la pila.')] as [ReactNode, string, string]]),
  ];
  return <>
    <ul className="tips-list">{rows.map(([icon, title, text]) => <li key={title}><span className="tips-icon" aria-hidden="true">{icon}</span><span><strong>{title}</strong><span>{text}</span></span></li>)}</ul>
    <div className="settings-actions"><button className="sheet-action secondary" disabled={again} onClick={() => { saveTips(resetSeen(readTips())); setAgain(true); haptic('selection'); }}>
      <ArrowCounterClockwiseIcon size={20} weight="bold"/>{again ? t('Volverán a aparecer mientras revisas') : t('Mostrar los trucos otra vez')}</button></div>
  </>;
}
