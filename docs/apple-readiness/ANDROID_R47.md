# R-47 — carta nativa Android y vídeo

Actualizado 2026-11-09. Candidato `6386f55`; no aceptación visual ni distribución.

## Cambios acotados

- Fredoka variable original de Google Fonts, 159.184 bytes, licencia OFL incluida.
  Origen fijado y SHA256 en `mano/android/app/src/main/assets/fonts/SOURCE.json`.
  Se conserva la familia existente; Android usa fallback del sistema para glifos
  árabes y japoneses ausentes. No se genera ni reemplaza el icono, lettering o arte.
- La carta recibe `direction` del idioma de CocoWash, aunque el idioma de Android
  sea distinto. Inicio de texto y márgenes relativos siguen esa dirección. El SDK
  conserva sus assets, AdChoices, clics y comportamiento de anuncios existentes.
- Capacitor 8.6 cierra inmediatamente `onShowCustomView`. `CocoWebChromeClient`
  hereda sus permisos y diálogos; sustituye únicamente la presentación fullscreen.
  Mantiene el mismo elemento, posición y audio. Atrás primero sale de fullscreen,
  sin cerrar el inspector, y se restauran barras/visibilidad al salir o destruirse
  la actividad. Se mantiene retrato y el fallback nativo existente.

## Evidencia y límites

PASS local: 138 Node, TypeScript, protected28, builds y dos contratos de etiquetas
ES/AR en Edge. Este fixture simula respuesta de SDK: **no demuestra anuncio nativo**.
`codex review` detectó dos errores de preparación de pruebas (control Geek ausente y
ningún emplazamiento de anuncio solicitado); se corrigieron usando Anclar y Revisión.
La selección de filtros y el acuse de cola son independientes del idioma.

**FAIL anterior:** [42549137917](https://github.com/joacomino-dev/mano-iphone/actions/runs/42549137917)
compila Kotlin y pasa 17 checks, pero Atrás no sale de fullscreen. El artefacto
registra el aviso inicial cerrado y el vídeo aún visible. No es un fallo de sonido.

**Corrección candidata R-47b:** un único callback de Atrás en `MainActivity` da
prioridad al custom view; pide salir también del fullscreen DOM y luego restaura
barras/WebView. El siguiente Atrás conserva el cierre del visor. No se modifica
`InlineVideo` ni se incluye el sonido en el efecto de reproducción. `/review`
integrado sin hallazgos. [42620502765](https://github.com/joacomino-dev/mano-iphone/actions/runs/42620502765)
compila y pasa 17 checks, pero vuelve a fallar antes de los ciclos: no aparece
`route=fullscreen`. La tecla no llega al dispatcher de la actividad. La nueva
corrección intercepta la pareja de teclas solo durante fullscreen y registra
`PRIORITY_OVERLAY` en API 33+ para anteponerse al callback de Chromium; retira
ese callback al salir. Segunda revisión integrada sin hallazgos; [42623186603](https://github.com/joacomino-dev/mano-iphone/actions/runs/42623186603) valida el candidato `6386f55`, en curso.

La prueba abre
el filtro de vídeo, ancla, reproduce, toca fullscreen con entrada confiable de
DevTools, comprueba `document.fullscreenElement`, sale con Atrás y exige el mismo
reproductor, fuente, posición, estado de sonido y MediaStore intacto. No añade
colectores ni cambia presupuestos. Su resultado no se sustituye por un build web.

PENDIENTE: renderización nativa de Fredoka, árabe/Japonés, anuncio real de prueba y
aceptación de Claude. Con estado de compras desconocido no se fuerza la publicidad
para obtener una captura. Licencia Play, catálogo/consentimiento y disponibilidad de
anuncios conservan sus gates comerciales; no equivalen a un fallo de ad fill.

Fuentes: [Capacitor 8.6 WebChromeClient](https://github.com/ionic-team/capacitor/blob/8.6.0/android/capacitor/src/main/java/com/getcapacitor/BridgeWebChromeClient.java),
[Typeface.Builder](https://developer.android.com/reference/android/graphics/Typeface.Builder),
[RTL Android](https://developer.android.com/training/basics/supporting-devices/languages),
[fuente y licencia Fredoka](https://github.com/google/fonts/tree/a60a77e14f28abd4ef243a1b5dfc48df0cec5205/ofl/fredoka).

Ruta investigada: [fullscreen de WebView](https://chromium.googlesource.com/chromium/src/+/HEAD/android_webview/docs/full-screen.md), [callback de Chromium](https://chromium.googlesource.com/chromium/src/+/refs/branch-heads/6367/android_webview/java/src/org/chromium/android_webview/FullScreenView.java), [prioridad de overlays](https://developer.android.com/reference/android/window/OnBackInvokedDispatcher#PRIORITY_OVERLAY) y [dispatchKeyEvent](https://developer.android.com/reference/android/app/Activity#dispatchKeyEvent(android.view.KeyEvent)). El test usa KEYCODE_BACK; el gesto físico conserva su QA pendiente.

El emulador fallido carga WebView 124.0.6367.219 (logcat). Se contrastó también su rama 6367: FullScreenView consume Back y registra PRIORITY_DEFAULT al adjuntarse. La ausencia del marcador de actividad y ese código explican por qué reordenar solo callbacks AndroidX no bastaba.
