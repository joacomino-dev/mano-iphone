# Baseline visual — 30 de octubre de 2026

Se renderizó e inspeccionó la **demo web** actual; no un iPhone conectado.
HEAD local `0a6d32d65d273b1408ef79bedc728acf9579fad1` con los cambios previos
sin confirmar descritos en PROJECT_MAP. Nombre visible CocoWash; configuración
nativa 0.4/build 4, manifiesto npm 0.1.0. Estas capturas no corresponden al HEAD
limpio ni acreditan una instalación nativa de esta versión.

## Inventario

Todas las rutas de fuente de la tabla están dentro de `mano/src/`.

| Pantalla/estado | Archivo principal | Componentes | Implementación / dependencias | Evidencia o pendiente |
| --- | --- | --- | --- | --- |
| Bienvenida | ManoApp.tsx, Welcome | Photo, BrandStatus, Motion | Implementada; permisos al montar en iOS; beginSession/precarga | Captura 01; misma imagen en demo y composición estática con reduced motion |
| Preparando / error / reanudar | ManoApp.tsx | progress, spinner, avisos | Implementado; preloader/media/session | No capturado como estado separado; cancelación/iCloud/errores nativos pendientes |
| Sesión de cartas | ManoApp.tsx | Photo, Seal, BrandStatus, InlineVideo, Phosphor | Implementada; domain, act, hand y gestos | 02 y 07; muestra bundle de cinco, botones alternativos; falta variedad real de medios |
| Filtros / calendario | Filters.tsx + Sheet en ManoApp.tsx | DateCalendar, chips, select, switches | Implementado; draft/eligible, callbacks | 03 muestra parte superior; scroll inferior, calendario y Geek aún sin inspección visual completa |
| Álbumes / crear álbum | ManoApp.tsx | Sheet, AlbumInput/KeyboardInput | Implementado; Library.albums/createAlbum/addToAlbum | 04 lista demo; formulario y teclado nativo sin captura |
| Revisión «Una última mirada» | ManoApp.tsx | Sheet, Carousel sin drag, Photo | Implementada; pending/restore/commitDelete | 05 con un descarte demo; recuperación ejecutada, sin borrado real |
| Inspector anclado / Geek | Inspector.tsx | Motion, foto, controles zoom, metadata | Implementado; thumbnail/Library.metadata, foco/pinch | 06 inspector normal; Geek, EXIF/GPS y pellizco físico pendientes |
| Vídeo inline / fallback | InlineVideo.tsx + ManoApp.tsx | video playsInline, poster, controles | Implementado; media/preload/Library.preview | No reproducido/capturado en esta sesión; pendiente validar audio y retorno a poster |
| Vacío / acceso limitado / fallos | ManoApp.tsx | empty-state, avisos, retry | Ramas implementadas; autorización/refresh | Pendiente renderizar todos los casos; demo no prueba permisos PhotoKit |

No se identificó un frontend alternativo completo ni un área experimental
separada. Son provisionales la representación demo de Live Photo, los mismos
thumbnails para veinte assets y operaciones nativas simuladas; no llamarlos
funciones Android ni equivalentes a QA de biblioteca real. La UI es funcional
pero no hay evidencia para declarar todas las pantallas terminadas.

## Recursos reales (sin introducir sistema nuevo)

| Recurso | Definición actual |
| --- | --- |
| Colores | `prototype.css`: variables `--ink/--cream/--muted/--red`, redefiniciones posteriores y literales; `native.css`; array `colors` de sellos en ManoApp; `brand/palette.json` para marca, no importada automáticamente como tokens UI |
| Tipografía | imports fontsource en ManoApp: IBM Plex Sans 400/500/600 y Mono 500; tamaños/pesos en CSS; Roboto y tipografía de status pertenecen al runtime |
| Tamaños/espaciados | CSS literal, media queries de altura 730px, container units; cardWidth/cardHeight desde ResizeObserver + aspecto del asset en ManoApp; fit en Inspector |
| Radios/sombras | Literales distribuidos por selectores en prototype.css y runtime; sin escala global completa |
| Iconos | Phosphor en UI; Radix en runtime; SVGs CocoWash como marca, stamp-red.png para sello |
| Imágenes | public/assets/{paper.png,stamp-red.png,photos/lake.png,demo-video.mp4,cocowash*.svg}; marca editable en brand/README.md |
| Transiciones | Motion en ManoApp e Inspector; springs y AnimatePresence; CSS hover/active/transitions/spin; useReducedMotion y media query CSS |
| Adaptación | `.on-device`, env(safe-area-inset-*), Flex, ResizeObserver, container units y media queries; presets protegidos iPhone/Pixel en src/mobile/geometry.ts |

Hay tokens parciales y fuentes de marca; **no existe sistema de diseño
centralizado completo**. Los primeros valores de :root no describen el resultado
final porque la cascada los sobreescribe. No inventar una nueva paleta ni escala
durante esta preparación. Claude puede proponer paletas/escalas alternativas para
revisión; teal/papel/sello describen el baseline, no una obligación permanente.

## Estado de las decisiones visuales

| Clase | Decisión / evidencia | Alcance actual |
| --- | --- | --- |
| APROBADA | «Lo que importa, se queda», iPhone-first, personalidad fresca/cercana/desenfadada/reconocible: misión actual del usuario | Criterios conceptuales para evaluar propuestas, sin diseño nuevo aquí |
| APROBADA HISTÓRICA, REVISABLE | Segundo mock teal/papel/sello: instrucciones de raíz aportadas por el usuario en esta conversación; paleta y mascota constan como aprobadas el 29-10 en mano/AGENTS.md | La misión definitiva autoriza cuestionarlas; no son restricciones artísticas permanentes ni aprobación de una alternativa |
| PROVISIONAL | Tipos/tamaños/espaciados, sombras/radios, composición concreta, estilos de hojas, iconos y animaciones actuales sin evidencia individual de aprobación | Implementado no equivale a aprobado; Claude puede criticarlos/proponer cambios |
| APROBADA | Hojas de preview: cabecero blanco del runtime se acepta; se tematiza solo el cuerpo de la app. Usuario, 2026-10-30, [CLAUDE_AUDIT_CW-HO-001](CLAUDE_AUDIT_CW-HO-001.md) §5 | No modificar ni sobrescribir `styles.css`/BottomSheet; aplica cuando se implemente la Fase 2 |
| APROBADA | Revisión: resumen → fotografías descartadas/recuperación → `Eliminar N` y sus notas → `Deshacer todo` → Continuar / Finalizar y guardar. Usuario, recepción Codex del 2026-10-30; antecedente [CLAUDE_AUDIT_CW-HO-001](CLAUDE_AUDIT_CW-HO-001.md) §5 | Sustituye la instrucción histórica actions-first; mano/AGENTS.md actualizada. Solo orden/jerarquía, no implementado; contrato de borrado intacto; Fase 2 |
| APROBADA E IMPLEMENTADA LOCAL | Dirección «Sello y papel» y rediseño visual completo autorizados por el usuario (2026-10-30). Tokens `--cw-*`, jerarquía de botones, copys y movimiento en [CLAUDE_REDESIGN_CW-CL-002](CLAUDE_REDESIGN_CW-CL-002.md); capturas en [reference/2026-10-30-redesign](reference/2026-10-30-redesign/) | Sin commit; pendiente revisión de diff por Codex y QA nativa. Sustituye a la fila PROPUESTA PENDIENTE anterior (piloto/tokens) |

Conservar comportamientos y contratos sensibles sigue siendo obligatorio. Una
propuesta creativa puede cambiar lenguaje visual o jerarquía, pero no la operación
Photos, persistencia o confirmación nativa sin autorización funcional separada.

## Capturas nuevas y límites

Directorio [reference/2026-10-30](reference/2026-10-30/), metadatos en
[capture.json](reference/2026-10-30/capture.json). Edge headless 156.0.4314.56,
ventana 1100×1100, DPR 1, `prefers-reduced-motion: reduce`; iPhone simulado
393×852 y Pixel 427×952, dentro del marco escalado por el runtime.
No se ocultó ni modificó chrome protegido; incluye reloj real/cursor simulado.
Medios exclusivamente generados; almacenamiento de contexto de navegador nuevo.
Sin errores `pageerror` durante el recorrido.

| Imagen | Qué se inspeccionó |
| --- | --- |
| [01-welcome-iphone.png](reference/2026-10-30/01-welcome-iphone.png) | Bienvenida, marca, fotografías estáticas, CTA |
| [02-session-iphone.png](reference/2026-10-30/02-session-iphone.png) | Cartas, acciones, cabecera, pie |
| [03-filters-iphone.png](reference/2026-10-30/03-filters-iphone.png) | Hoja filtros, chips y selects superiores |
| [04-albums-iphone.png](reference/2026-10-30/04-albums-iphone.png) | Hoja de lista de álbumes demo |
| [05-review-iphone.png](reference/2026-10-30/05-review-iphone.png) | Cola demo de un elemento y recuperación |
| [06-inspector-iphone.png](reference/2026-10-30/06-inspector-iphone.png) | Inspector anclado, foto completa, controles |
| [07-session-pixel.png](reference/2026-10-30/07-session-pixel.png) | Misma sesión adaptada al preset Pixel; sin plugin Android |

Observaciones verificables: las hojas preview muestran fondo blanco, mientras
los botones/cartas usan papel; revisar coherencia sin cambiar BottomSheet
protegido. Álbum y revisión incluyen descripción genérica compartida. Filtros
necesita scroll y su CTA no aparece en la captura superior, aunque Playwright
pudo localizarlo, desplazar y activarlo. Revisión presenta recuperación después
de la acción destructiva: evaluar jerarquía visual sin alterar el contrato funcional.
Hay avisos transitorios en 04/07; no son estados permanentes de marca.
La demo repite el lago y no permite evaluar lectura de bundles visualmente
distintos. No se midió contraste ni se probó VoiceOver, Dynamic Type o animación
normal; estos son pendientes, no fallos demostrados.

`mano/docs/qa/*` y design-reference.png se conservan como histórico; no se
presentan como capturas actuales. El render web no prueba Sheet Radix nativo,
safe areas reales, permisos, Live Photos, iCloud, iPad ni rendimiento físico.

## Repetición manual sin cambiar código

1. Desde mano iniciar el dev server con comando de PROJECT_MAP y abrir
   `http://127.0.0.1:4183/` en un perfil/contexto nuevo; no limpiar datos de otro
   perfil. Ajustar ventana 1100×1100, DPR 1 y reduced motion si se busca comparar.
2. Elegir iPhone en picker. Esperar fuentes e imágenes y guardar bienvenida.
   «Empezar a revisar» (antes «Iniciar sesión»), esperar preparación y guardar cartas.
3. Abrir Filtros; capturar arriba y, adicionalmente, abajo/calendario/Geek.
   Aplicar filtros para volver; abrir Álbum, capturar lista y formulario si procede.
   Cerrar con Escape o botón de cierre antes del siguiente paso.
4. En **demo web** pulsar Descartar (solo cola; antes «Eliminar»), Terminar (antes «Finalizar sesión»),
   capturar revisión. Recuperar el elemento y «Seguir revisando». No hace falta
   pulsar Eliminar N. Abrir botón ampliar foto, capturar inspector y Cerrar.
5. Cambiar picker a Pixel 10 y capturar. Para animaciones usar además movimiento
   normal en un recorrido separado. Guardar fecha, HEAD **y estado dirty**, viewport,
   preset, DPR, navegador y escenario. Nunca sustituir estas referencias por fotos personales.

Para nativo: instalar una compilación verificada con el flujo existente autorizado
y comparar en dispositivo; no confirmar borrados en biblioteca personal. La
instalación y las capturas físicas quedan fuera de esta preparación.

## Pantalla piloto recomendada

**Sesión de cartas**, después del diagnóstico aprobado: representa marca, foto,
jerarquía de acciones, progreso, estados, iconos, espaciado, accesibilidad y
adaptación. Comenzar por CSS y composición sin tocar act/gestos/precarga; mantener
callbacks intactos. Permite medir el sistema propuesto antes de extenderlo a
filtros y hojas. Su mezcla con lógica exige revisión de diff por Codex; no es
una autorización para refactorizar o cambiar el flujo de eliminación.

## Revisión definitiva de estas referencias

30-10-2026: las siete PNG existentes se abrieron e inspeccionaron de nuevo;
corresponden a las filas 01–07. No se generaron capturas nuevas. capture.json
contiene fecha, SHA base dirty, huella de fuentes, navegador, viewport, DPR,
presets, reduced motion y medios demo. La revisión compara bytes de imágenes y
fuentes de aplicación con el inventario inicial; instrucciones actualizadas no
significan un nuevo render. No hubo nuevo recorrido ni prueba nativa en esta fase.
