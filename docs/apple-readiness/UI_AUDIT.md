# Auditoría de interfaz adaptable

2026-11-07 · `frontend-craft`, modo revisión; identidad Coco Cream, Coqui/Memo,
Polaroid/VHS, cartas, tipografías y gestos actuales conservados.

**Método:** fuente actual + Edge headless, `native.html` sin marco simulado, puente
Capacitor ficticio con postales. Capturas [web](evidence/web/), resultados en
[final-web.json](evidence/final-web.json). No son capturas de iPhone, simulador
Apple o una biblioteca personal. Ads/IAP nativos se sustituyen en el fixture.

| Superficie | Hallazgo / evidencia | Estado |
| --- | --- | --- |
| Shell, cabecera, Island y barras | Root contentInset=never y CSS manejan sus insets. Faltaban left/right: corregidos shell/hojas | VERIFICADO CSS con 10/70 px sintéticos. NO VERIFICABLE Island/barras reales |
| Foto/Polaroid | cardBox ajusta al stage medido por ResizeObserver; imagen contain y proporción conservada | VERIFICADO tests de geometría y renders compactos/anchos. Pendiente 48 MP/panoramas reales |
| Vídeo/VHS | Un vídeo por mano; tamaño y OSD adaptables; overlay y controles propios | Render fixture capturado; continuidad/codec/iCloud/HDR nativos PENDIENTES |
| Cartas y gestos | Mano bloqueada; orden no depende de descarga. Resize no cambió carta ni registro en fixture | VERIFICADO Edge. Gestos táctiles multi-dedo y cancelación durante cambio de pose PENDIENTES |
| Botones inferiores / sellos | Conservados iconos, color y disposición; render compacto y estrés 320 px sin scroll horizontal de documento | VERIFICADO renders; tamaños/alcance VoiceOver y texto accesible PENDIENTES |
| Coqui/Memo / resumen | Arte actual sin modificaciones; resumen después del resultado confirmado, no antes | Capturas success/partial. Resumen con anuncio nativo y tamaños accesibles PENDIENTES |
| Filtros y ajustes | Hoja scrollable con contenido y pie; fuente tiene chips y container queries | Capturas compacta/ancha y Ajustes. Fecha/teclado/pseudolocalización completas PENDIENTES |
| Apoyo / anuncios | Pantalla de soporte abre en fixture; nativo recibe coordenadas del slot y escucha resize/scroll | Captura sin anuncios/compras reales. Creatividades, AdChoices y cambios de pose PENDIENTES |
| Álbum / selección | Hoja nativa y botón de crear conservados; captura de lista | Teclado real, nombres largos, selección múltiple y permiso cambiado durante guardar PENDIENTES |
| Revisión / confirmación | Rejilla virtualizada, recuperación antes de borrar; revocación ahora cierra la hoja | VERIFICADO fixture cancel/error/parcial/success; diálogo del sistema PENDIENTE |
| Inspector / zoom | Medición propia y dock; apertura por control Anclar ejecutada | Captura; geometría de insets y texto ampliado requieren más trabajo/QA |
| Onboarding | Cuatro tarjetas capturadas en 375×667; la tercera conserva espera demostrativa | VERIFICADO capturas, no todo gesto de la demo. VoiceOver/reduced-motion real PENDIENTES |
| Vacíos / errores / cargas | Fuente contiene Preparing/Access/LoadError/empty y aviso persistente | Revocación/error de borrado ejecutados; catálogo completo de estados PENDIENTE |
| Animación y accesibilidad | Motion/CSS reduced-motion presentes; prueba web ejecutada con reduce | No se midieron FPS, energía ni equivalencia total de todas las animaciones |

Dimensiones web ejercitadas: 375×667 es, 375×812 en, 440×956 de, 890×626 es,
360×626 ar y 320×568 ja; base de contratos 390×844. Los tres últimos son pruebas
de estrés, **no presets oficiales Duo**. La aserción de overflow se limita al
documento: no certifica que cada etiqueta quepa ni que no haya clipping interno.

## Duo requiere una validación específica

Apple documenta interior regular/regular, safe areas asimétricas, regiones
reservadas y cambios de tamaño. Las barras web de CocoWash son propias: compilar
con SDK 27.1 no las convierte en barras UIKit adaptables. El interior tampoco
queda validado por declarar solo orientación portrait.

La fuente actualmente centra onboarding/sesión/status en un máximo de 520 px y
las hojas en 560 px a partir de 600 px. La captura ancha confirma esa columna.
No deforma la foto, pero desaprovecha espacio: **P2 de composición**, y P1 si se
promete una experiencia Duo optimizada sin resolverlo. No se implementa una nueva
composición sin evidencia de poses y revisión visual.

Pendientes concretos: geometría del inspector (márgenes constantes), dock y cierre
de Live Photo (trailing de la vista, no safeArea); cámara interior activa; controles
que crucen la bisagra; anclaje de menús/confirmaciones; frame del anuncio nativo
durante cambio de display; Split View y cambio de escala de pantalla.

Propuesta para evaluar, no implementada: mantener el área de revisión de fotos
con proporción y tamaño cómodos y dedicar el espacio amplio a herramientas o
revisión contextual. La elección depende de la región disponible, no de escalar
todo ni de detectar un nombre de modelo.

## Herramientas oficiales

[Prepare your app for iPhone Duo](https://developer.apple.com/videos/play/tech-talks/111461/)
presenta Device Hub y la skill **App Resizability** de Xcode 27.1. Revisar la
envoltura UIKit/WKWebView con esa herramienta en macOS; sus sugerencias no
sustituyen QA del CSS, los gestos ni el puente Capacitor.
[Strike a pose](https://developer.apple.com/videos/play/tech-talks/111463/)
explica adaptación a regiones reservadas; solo introducir API específica tras
validar disponibilidad/fallback y el contrato de los dos displays.

No se ejecutó App Resizability ni Device Hub en Windows. No se usaron opciones
ocultas del simulador ni se asumieron insets a partir de resolución física.
