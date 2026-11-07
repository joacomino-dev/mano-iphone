import type { Lang } from '../i18n.ts';

/** Android wording for the texts that name iPhone-only things (the Photos app,
 * «Eliminado recientemente», iPhone, Settings paths). Keys are the same Spanish
 * source keys the app already passes to t(); on Android, t() reads this table
 * first, so no screen needs its own platform branch. Every key has all seven
 * languages (i18n test). Android moves deleted items to the trash of the phone's
 * gallery (Google Photos, Samsung Gallery…) for 30 days; CocoWash never opens or
 * empties it. */
type Text = Record<Lang, string>;
export const ANDROID_TEXT: Record<string, Text> = {
  // End of round: deleted items wait 30 days in the gallery's trash.
  'Fotos te pedirá confirmación; lo eliminado queda 30 días en «Eliminado recientemente», también en iCloud.': {
    es: 'Android te pedirá confirmación; lo eliminado queda 30 días en la papelera de tu galería.',
    en: 'Android will ask you to confirm; deleted items stay in your gallery’s trash for 30 days.',
    fr: 'Android te demandera de confirmer ; ce que tu supprimes reste 30 jours dans la corbeille de ta galerie.',
    de: 'Android fragt dich zur Bestätigung; Gelöschtes bleibt 30 Tage im Papierkorb deiner Galerie.',
    it: 'Android ti chiederà conferma; ciò che elimini resta 30 giorni nel cestino della galleria.',
    ar: 'سيطلب منك Android التأكيد؛ يبقى المحذوف 30 يومًا في سلة مهملات المعرض.',
    ja: 'Android が確認します。削除したものはギャラリーのゴミ箱に30日間残ります。',
  },
  'en «Eliminado recientemente»': {
    es: 'en la papelera', en: 'in the trash', fr: 'dans la corbeille', de: 'im Papierkorb',
    it: 'nel cestino', ar: 'في سلة المهملات', ja: 'ゴミ箱へ',
  },
  'Para vaciarlo ya': {
    es: 'Para vaciarla ya', en: 'To empty it now', fr: 'Pour la vider maintenant', de: 'Um ihn jetzt zu leeren',
    it: 'Per svuotarlo subito', ar: 'لإفراغها الآن', ja: '今すぐ空にするには',
  },
  'Abre Fotos.': {
    es: 'Abre tu galería (Google Fotos, Galería…).', en: 'Open your gallery app (Google Photos, Gallery…).',
    fr: 'Ouvre ta galerie (Google Photos, Galerie…).', de: 'Öffne deine Galerie-App (Google Fotos, Galerie…).',
    it: 'Apri la galleria (Google Foto, Galleria…).', ar: 'افتح تطبيق المعرض (صور Google أو المعرض…).',
    ja: 'ギャラリーアプリ（Google フォト、ギャラリーなど）を開きます。',
  },
  'Busca el álbum «Eliminado recientemente».': {
    es: 'Entra en la Papelera.', en: 'Go to Trash.', fr: 'Va dans la Corbeille.', de: 'Öffne den Papierkorb.',
    it: 'Vai nel Cestino.', ar: 'ادخل إلى سلة المهملات.', ja: 'ゴミ箱を開きます。',
  },
  'Toca Seleccionar › Eliminar todo.': {
    es: 'Vacíala desde su menú.', en: 'Empty it from its menu.', fr: 'Vide-la depuis son menu.',
    de: 'Leere ihn über sein Menü.', it: 'Svuotalo dal suo menu.', ar: 'أفرغها من قائمتها.', ja: 'メニューから空にします。',
  },
  'En 30 días, Fotos lo vacía solo.': {
    es: 'En 30 días, Android la vacía solo.', en: 'In 30 days, Android empties it on its own.',
    fr: 'Dans 30 jours, Android la vide tout seul.', de: 'Nach 30 Tagen leert Android ihn von selbst.',
    it: 'Tra 30 giorni Android lo svuota da solo.', ar: 'بعد 30 يومًا يفرغها Android تلقائيًا.',
    ja: '30日後に Android が自動で空にします。',
  },
  'Esperando a Fotos…': {
    es: 'Esperando a Android…', en: 'Waiting for Android…', fr: 'En attente d’Android…', de: 'Warte auf Android…',
    it: 'In attesa di Android…', ar: 'بانتظار Android…', ja: 'Android を待っています…',
  },
  // Access to photos and videos.
  'Permitir acceso a Fotos': {
    es: 'Permitir acceso a fotos y vídeos', en: 'Allow access to photos and videos', fr: 'Autoriser l’accès aux photos et vidéos',
    de: 'Zugriff auf Fotos und Videos erlauben', it: 'Consenti l’accesso a foto e video', ar: 'السماح بالوصول إلى الصور والفيديو',
    ja: '写真と動画へのアクセスを許可',
  },
  'Para empezar, permite el acceso a Fotos. Todo se queda en tu iPhone.': {
    es: 'Para empezar, permite el acceso a tus fotos y vídeos. Todo se queda en tu teléfono.',
    en: 'To start, allow access to your photos and videos. Everything stays on your phone.',
    fr: 'Pour commencer, autorise l’accès à tes photos et vidéos. Tout reste sur ton téléphone.',
    de: 'Erlaube zuerst den Zugriff auf deine Fotos und Videos. Alles bleibt auf deinem Handy.',
    it: 'Per iniziare, consenti l’accesso a foto e video. Tutto resta sul tuo telefono.',
    ar: 'للبدء، اسمح بالوصول إلى صورك ومقاطع الفيديو. كل شيء يبقى على هاتفك.',
    ja: 'まず写真と動画へのアクセスを許可してください。すべてスマホの中に残ります。',
  },
  'CocoWash necesita acceso a Fotos para mostrarte tu carrete. No sube ni comparte nada, y solo se borra lo que confirmes en Fotos.': {
    es: 'CocoWash necesita acceso a tus fotos y vídeos para mostrarte tu galería. No sube ni comparte nada, y solo se borra lo que confirmes en Android.',
    en: 'CocoWash needs access to your photos and videos to show you your gallery. It uploads and shares nothing, and only what you confirm in Android is deleted.',
    fr: 'CocoWash a besoin d’accéder à tes photos et vidéos pour te montrer ta galerie. Rien n’est envoyé ni partagé, et seul ce que tu confirmes dans Android est supprimé.',
    de: 'CocoWash braucht Zugriff auf deine Fotos und Videos, um dir deine Galerie zu zeigen. Nichts wird hochgeladen oder geteilt, und gelöscht wird nur, was du in Android bestätigst.',
    it: 'CocoWash ha bisogno di accedere a foto e video per mostrarti la galleria. Non carica né condivide nulla, e si elimina solo ciò che confermi in Android.',
    ar: 'يحتاج CocoWash إلى الوصول إلى صورك ومقاطع الفيديو ليعرض لك معرضك. لا يرفع أو يشارك أي شيء، ولا يُحذف إلا ما تؤكده في Android.',
    ja: 'ギャラリーを表示するため、CocoWash は写真と動画へのアクセスが必要です。何もアップロード・共有せず、削除されるのは Android で確認したものだけです。',
  },
  'Sin acceso a Fotos no podemos mostrarte tu carrete. Actívalo en Ajustes › CocoWash › Fotos y vuelve aquí.': {
    es: 'Sin acceso a tus fotos y vídeos no podemos mostrarte tu galería. Actívalo en Ajustes › Aplicaciones › CocoWash › Permisos y vuelve aquí.',
    en: 'Without access to your photos and videos we can’t show you your gallery. Turn it on in Settings › Apps › CocoWash › Permissions and come back.',
    fr: 'Sans accès à tes photos et vidéos, on ne peut pas te montrer ta galerie. Active-le dans Paramètres › Applications › CocoWash › Autorisations, puis reviens.',
    de: 'Ohne Zugriff auf deine Fotos und Videos können wir dir deine Galerie nicht zeigen. Aktiviere ihn unter Einstellungen › Apps › CocoWash › Berechtigungen und komm zurück.',
    it: 'Senza accesso a foto e video non possiamo mostrarti la galleria. Attivalo in Impostazioni › App › CocoWash › Autorizzazioni e torna qui.',
    ar: 'بدون الوصول إلى صورك ومقاطع الفيديو لا يمكننا عرض معرضك. فعّله من الإعدادات › التطبيقات › CocoWash › الأذونات ثم عُد إلى هنا.',
    ja: '写真と動画へのアクセスがないとギャラリーを表示できません。設定 › アプリ › CocoWash › 権限 で許可して、ここに戻ってください。',
  },
  'Abre Ajustes › CocoWash › Fotos para permitir el acceso.': {
    es: 'Abre Ajustes › Aplicaciones › CocoWash › Permisos para permitir el acceso.',
    en: 'Open Settings › Apps › CocoWash › Permissions to allow access.',
    fr: 'Ouvre Paramètres › Applications › CocoWash › Autorisations pour autoriser l’accès.',
    de: 'Öffne Einstellungen › Apps › CocoWash › Berechtigungen, um den Zugriff zu erlauben.',
    it: 'Apri Impostazioni › App › CocoWash › Autorizzazioni per consentire l’accesso.',
    ar: 'افتح الإعدادات › التطبيقات › CocoWash › الأذونات للسماح بالوصول.',
    ja: '設定 › アプリ › CocoWash › 権限 を開いてアクセスを許可してください。',
  },
  'Permite acceso a Fotos en Ajustes.': {
    es: 'Permite el acceso a fotos y vídeos en Ajustes.', en: 'Allow access to photos and videos in Settings.',
    fr: 'Autorise l’accès aux photos et vidéos dans les Paramètres.', de: 'Erlaube den Zugriff auf Fotos und Videos in den Einstellungen.',
    it: 'Consenti l’accesso a foto e video nelle Impostazioni.', ar: 'اسمح بالوصول إلى الصور والفيديو من الإعدادات.',
    ja: '設定で写真と動画へのアクセスを許可してください。',
  },
  'No se pudo abrir el selector de Fotos.': {
    es: 'No se pudo abrir el selector de fotos.', en: 'Couldn’t open the photo picker.', fr: 'Impossible d’ouvrir le sélecteur de photos.',
    de: 'Die Fotoauswahl konnte nicht geöffnet werden.', it: 'Impossibile aprire il selettore di foto.', ar: 'تعذّر فتح أداة اختيار الصور.',
    ja: '写真の選択画面を開けませんでした。',
  },
  'Abriendo Fotos…': {
    es: 'Abriendo la galería…', en: 'Opening the gallery…', fr: 'Ouverture de la galerie…', de: 'Galerie wird geöffnet…',
    it: 'Apertura della galleria…', ar: 'جارٍ فتح المعرض…', ja: 'ギャラリーを開いています…',
  },
  // Items that disappeared from the library.
  'Este elemento ya no está disponible en Fotos.': {
    es: 'Este elemento ya no está disponible en la galería.', en: 'This item is no longer in your gallery.',
    fr: 'Cet élément n’est plus dans ta galerie.', de: 'Dieses Element ist nicht mehr in deiner Galerie.',
    it: 'Questo elemento non è più nella galleria.', ar: 'لم يعد هذا العنصر في المعرض.', ja: 'この項目はギャラリーにもうありません。',
  },
  'Este vídeo ya no está en Fotos.': {
    es: 'Este vídeo ya no está en la galería.', en: 'This video is no longer in your gallery.', fr: 'Cette vidéo n’est plus dans ta galerie.',
    de: 'Dieses Video ist nicht mehr in deiner Galerie.', it: 'Questo video non è più nella galleria.', ar: 'لم يعد هذا الفيديو في المعرض.',
    ja: 'この動画はギャラリーにもうありません。',
  },
  'Ya no está\nen Fotos': {
    es: 'Ya no está\nen la galería', en: 'No longer\nin your gallery', fr: 'Plus dans\nta galerie', de: 'Nicht mehr\nin der Galerie',
    it: 'Non è più\nnella galleria', ar: 'لم يعد\nفي المعرض', ja: 'ギャラリーに\nもうありません',
  },
  'Algunas ya no\nestán en Fotos': {
    es: 'Algunas ya no\nestán en la galería', en: 'Some are no longer\nin your gallery', fr: 'Certaines ne sont plus\ndans ta galerie',
    de: 'Einige sind nicht mehr\nin der Galerie', it: 'Alcune non sono più\nnella galleria', ar: 'بعضها لم يعد\nفي المعرض',
    ja: '一部はギャラリーに\nもうありません',
  },
  // Android: hearts reach the gallery together when the round ends (one dialog).
  'Se queda y es favorita en Fotos.': {
    es: 'Se queda y, al terminar, pasa a favoritas de tu galería.', en: 'It stays and joins your gallery’s favorites when you finish.',
    fr: 'Elle reste et rejoint les favoris de ta galerie à la fin.', de: 'Es bleibt und wird am Ende ein Favorit in deiner Galerie.',
    it: 'Resta e, alla fine, passa tra i preferiti della galleria.', ar: 'يبقى، وعند الانتهاء ينضم إلى مفضّلات معرضك.',
    ja: '残して、終了時にギャラリーのお気に入りに加えます。',
  },
  // «iPhone» → the phone.
  'Tus fotos no salen de tu iPhone.': {
    es: 'Tus fotos no salen de tu teléfono.', en: 'Your photos never leave your phone.', fr: 'Tes photos ne quittent jamais ton téléphone.',
    de: 'Deine Fotos verlassen nie dein Handy.', it: 'Le tue foto non lasciano mai il telefono.', ar: 'لا تغادر صورك هاتفك أبدًا.',
    ja: '写真がスマホの外に出ることはありません。',
  },
  'Todo se analiza en tu iPhone.': {
    es: 'Todo se analiza en tu teléfono.', en: 'Everything is analyzed on your phone.', fr: 'Tout est analysé sur ton téléphone.',
    de: 'Alles wird auf deinem Handy analysiert.', it: 'Tutto viene analizzato sul tuo telefono.', ar: 'يُحلَّل كل شيء على هاتفك.',
    ja: 'すべてスマホの中で分析します。',
  },
  'Algunos datos no están disponibles en este iPhone.': {
    es: 'Algunos datos no están disponibles en este teléfono.', en: 'Some details aren’t available on this phone.',
    fr: 'Certaines données ne sont pas disponibles sur ce téléphone.', de: 'Einige Angaben sind auf diesem Handy nicht verfügbar.',
    it: 'Alcuni dati non sono disponibili su questo telefono.', ar: 'بعض البيانات غير متاحة على هذا الهاتف.',
    ja: 'このスマホでは一部の情報を表示できません。',
  },
  'Pantalla completa\nsolo en el iPhone': {
    es: 'Pantalla completa\nsolo en el teléfono', en: 'Full screen\non the phone only', fr: 'Plein écran\nsur le téléphone seulement',
    de: 'Vollbild\nnur auf dem Handy', it: 'Schermo intero\nsolo sul telefono', ar: 'ملء الشاشة\nعلى الهاتف فقط', ja: '全画面表示は\nスマホのみ',
  },
  'Memo revisa tu fototeca en el iPhone: {done} de {total}. Irán apareciendo más.': {
    es: 'Memo revisa tu galería en el teléfono: {done} de {total}. Irán apareciendo más.',
    en: 'Memo is going through your gallery on your phone: {done} of {total}. More will show up.',
    fr: 'Memo parcourt ta galerie sur ton téléphone : {done} sur {total}. D’autres vont apparaître.',
    de: 'Memo geht deine Galerie auf dem Handy durch: {done} von {total}. Es kommen noch mehr.',
    it: 'Memo sta esaminando la galleria sul telefono: {done} di {total}. Ne arriveranno altre.',
    ar: 'يراجع Memo معرضك على الهاتف: {done} من {total}. سيظهر المزيد.',
    ja: 'Memo がスマホのギャラリーを確認中：{total} 件中 {done} 件。まだ増えます。',
  },
  'Se mide lo que está en tu iPhone; lo que solo está en iCloud va al final.': {
    es: 'Se mide el tamaño de cada archivo en tu teléfono.', en: 'Each file’s size is measured on your phone.',
    fr: 'La taille de chaque fichier est mesurée sur ton téléphone.', de: 'Die Größe jeder Datei wird auf deinem Handy gemessen.',
    it: 'La dimensione di ogni file viene misurata sul telefono.', ar: 'يُقاس حجم كل ملف على هاتفك.',
    ja: '各ファイルのサイズをスマホの中で測ります。',
  },
  'Capturas y grabaciones de pantalla, marcadas así por tu iPhone.': {
    es: 'Capturas y grabaciones de pantalla, según la carpeta donde las guarda tu teléfono.',
    en: 'Screenshots and screen recordings, from the folders your phone saves them in.',
    fr: 'Captures et enregistrements d’écran, d’après le dossier où ton téléphone les range.',
    de: 'Screenshots und Bildschirmaufnahmen, nach dem Ordner, in dem dein Handy sie ablegt.',
    it: 'Screenshot e registrazioni dello schermo, in base alla cartella in cui il telefono li salva.',
    ar: 'لقطات وتسجيلات الشاشة، حسب المجلد الذي يحفظها فيه هاتفك.',
    ja: 'スマホが保存するフォルダから見つけたスクリーンショットと画面録画。',
  },
  'Borrosas, muy oscuras o quemadas, según Vision en tu iPhone.': {
    es: 'Borrosas, muy oscuras o quemadas, según el análisis en tu teléfono.',
    en: 'Blurry, too dark or blown out, according to the analysis on your phone.',
    fr: 'Floues, trop sombres ou surexposées, d’après l’analyse sur ton téléphone.',
    de: 'Unscharf, zu dunkel oder überbelichtet, laut der Analyse auf deinem Handy.',
    it: 'Sfocate, troppo scure o bruciate, secondo l’analisi sul telefono.',
    ar: 'ضبابية أو داكنة جدًا أو محترقة، حسب التحليل على هاتفك.',
    ja: 'スマホでの分析でわかった、ブレ・暗すぎ・白飛びの写真。',
  },
};

let previewPlatform: "ios" | "android" | undefined;
/** Browser preview only: the device chosen in the preview picker (iPhone / Pixel 10)
 * decides the platform wording, so the Android texts can be reviewed without a phone. */
export const setPreviewPlatform = (platform: "ios" | "android" | undefined) => { previewPlatform = platform; };

/** True inside the Android app (Capacitor sets window.Capacitor before any script),
 * or in the browser preview with the Pixel selected. */
export const onAndroid = (): boolean => {
  const cap = (globalThis as { Capacitor?: { getPlatform?: () => string; isNativePlatform?: () => boolean } }).Capacitor;
  if (cap?.isNativePlatform?.()) return cap.getPlatform?.() === "android";
  return previewPlatform === "android";
};
