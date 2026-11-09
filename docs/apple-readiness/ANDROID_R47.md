# R-47 — carta nativa Android y vídeo

Actualizado 2026-11-08. Implementación candidata; no aceptación visual ni distribución.

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

PENDIENTE: compilación Kotlin y test nativo añadido a los ciclos existentes. Abre
el filtro de vídeo, ancla, reproduce, toca fullscreen con entrada confiable de
DevTools, comprueba `document.fullscreenElement`, sale con Atrás y exige el mismo
reproductor y MediaStore intacto. No añade colectores ni cambia presupuestos.

PENDIENTE: renderización nativa de Fredoka, árabe/Japonés, anuncio real de prueba y
aceptación de Claude. Con estado de compras desconocido no se fuerza la publicidad
para obtener una captura. Licencia Play, catálogo/consentimiento y disponibilidad de
anuncios conservan sus gates comerciales; no equivalen a un fallo de ad fill.

Fuentes: [Capacitor 8.6 WebChromeClient](https://github.com/ionic-team/capacitor/blob/8.6.0/android/capacitor/src/main/java/com/getcapacitor/BridgeWebChromeClient.java),
[Typeface.Builder](https://developer.android.com/reference/android/graphics/Typeface.Builder),
[RTL Android](https://developer.android.com/training/basics/supporting-devices/languages),
[fuente y licencia Fredoka](https://github.com/google/fonts/tree/a60a77e14f28abd4ef243a1b5dfc48df0cec5205/ofl/fredoka).
