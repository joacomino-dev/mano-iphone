# Arquitectura de interfaz y superficie de intervención

Rutas relativas a raíz. Inventario visual y evidencia en UI_BASELINE; comandos,
stack y colaboración Git en PROJECT_MAP. No reorganizar la app en esta fase.

## Composición y navegación

`ManoApp.tsx` contiene `Photo`, `PolaroidCaption`, `Seal`, `Sheet`, `AlbumInput`,
`BrandStatus` y la composición principal (CW-CL-013: sin `Welcome`; pantallas en
`Onboarding.tsx`, `Screens.tsx`, ajustes en `DisplaySettings.tsx`, OSD en `Vhs.tsx`). No hay carpeta screens ni componentes
extraídos para cada pantalla. `session=false` muestra bienvenida; iniciar prepara
media y activa sesión; `sheet` abre filtros, álbumes o revisión; `inspect` añade
overlay, con `pinnedInspect` para zoom. Fin de sesión puede guardar pendientes
sin borrar. No se está utilizando FlowStack como router de la app.

`Filters.tsx` mantiene draft y calendario local y llama callbacks del padre.
`Inspector.tsx` incluye medición, zoom/pan, foco y lecturas metadata, no solo JSX.
`InlineVideo.tsx` maneja ciclo de vida HTMLVideoElement, poster y fallback.
`Sheet` usa BottomSheet/teclado del runtime en preview y Dialog Radix en iOS.
El grid de revisión reutiliza Carousel con dragging deshabilitado. Las cartas
poseen sus gestos bidireccionales propios por decisión expresa del usuario.

## READ / WRITE / PROTECTED

WRITE: superficie visual tras aprobar un cambio; READ: consultar normalmente;
PROTECTED: cambio solo con justificación y autorización explícita. Si se mezcla
contenido, la regla más restrictiva aplica al comportamiento, no basta la ruta.

| Archivos/área | Clase | Límite concreto |
| --- | --- | --- |
| `mano/src/prototype.css` | WRITE | Tema app, tamaño, espaciado, radios, sombra, layout, transiciones; revisar cascada completa y ambas entradas |
| `mano/src/ManoApp.tsx`: JSX de Welcome/Photo/Seal/BrandStatus/Sheet/sesión/revisión/álbum | WRITE delicado | Presentación y accesibilidad; no cambiar callbacks, props funcionales, IDs, disabled, condiciones, roles o semántica de acciones sin revisar contrato |
| `mano/src/ManoApp.tsx`: estado/efectos, connect/beginSession/act/undoLast/commitDelete/analyze y start/move/end/cancel | PROTECTED | Fotos, persistencia, cancelación, selección y gestos; no alterar lógica para acomodar una animación |
| `mano/src/Filters.tsx` | WRITE delicado | Estilos/markup; READ draft, validación de fechas, eligible y callbacks de aplicar/analizar/refrescar |
| `mano/src/Inspector.tsx` | WRITE delicado | Presentación; PROTECTED llamadas metadata, efectos de foco, medición y handlers de pinch/pan |
| `mano/src/InlineVideo.tsx` | WRITE delicado | Controles visibles; PROTECTED reproducción, limpieza src, playsInline/poster y fallback |
| `mano/src/Prototype.tsx` | READ | Wrapper de preview y restauración de scroll/foco; no es la pantalla principal ni objetivo ordinario del rediseño |
| `mano/src/native.css` | READ | Base de entrada instalada, reset y selectores Carousel; cambios requieren revisar límites nativos explícitamente |
| `mano/brand/README.md`, `palette.json`, `generate-assets.mjs` | READ | Identidad/fuentes existentes; proponer cambios de marca antes. Generador también escribe icono iOS y exports |
| `mano/public/assets/cocowash*.svg`, `paper.png`, `stamp-red.png` | WRITE condicionado | Assets para diseño aprobado; identidad actual revisable según UI_BASELINE. No aplicar filtros a fotos personales |
| `mano/public/assets/photos/lake.png`, `demo-video.mp4` | READ | Fixtures generadas; no sustituir por biblioteca personal |
| `mano/public/assets/app-icon.png`, `mano/ios/**/Assets.xcassets/` | PROTECTED | Icono instalado y packaging; no editar vía generador durante auditoría |
| `mano/src/domain.ts`, `session.ts` | PROTECTED | Elegibilidad, filtros, decisiones, cola, undo, serialización, claves y migraciones |
| `mano/src/library.ts`, `media.ts`, `preload.ts` | PROTECTED | Plugin, lectura/URLs, precarga, liberación/cancelación y caché |
| `mano/ios/` entero | PROTECTED | PhotoKit/Vision, permisos, favoritos, borrado, caché, tests, configuración y dependencias SPM |
| `mano/src/App.tsx`, `main.tsx`, `styles.css`, `src/mobile/` | PROTECTED | Runtime Product Design, safe areas, teclado, marco, foco, scroll y componentes; leer COMPONENTS.md |
| `mano/public/assets/{iphone,android,status}/` | PROTECTED | Chrome simulado, no iconos de negocio |
| `mano/mobile-runtime.lock.json`, `scripts/check-mobile-runtime.mjs`, `scripts/update-mobile-runtime-lock.mjs` | PROTECTED | No debilitar ni regenerar hashes para hacer pasar un cambio visual |
| `mano/package*.json`, `tsconfig.json`, `capacitor.config.ts`, `vite*.config.ts`, `index.html`, `native.html` | PROTECTED | Dependencias, bundle, entradas y compilación; Vite preview está además protegido por hash |
| `mano/scripts/`, `worker/`, `.openai/`, `.github/`, `mano/tools/` | PROTECTED | Build, sync, hosting, CI y distribución; sin despliegue ni instalación |
| `mano/tests/`, `playwright.config.ts` | READ | Contratos y fixtures; proponer checks conductuales si cambian interacciones, nunca ajustar aserciones para ocultar regresiones |
| `AGENTS.md`, `mano/AGENTS.md`, `CLAUDE.md` | READ | Reglas compartidas; no suavizar límites durante rediseño |
| `docs/ai-handoff/` | WRITE | Evidencia y diagnóstico solo con medios demo, sin datos privados |
| `docs/ai-collaboration/` | WRITE condicionado | Estado/bitácora propia según PROTOCOL; auditoría estrictamente de lectura no escribe |
| `CURRENT.md`, `mano/README.md`, `design-qa.md`, `mano/docs/` | READ | Historial y referencias existentes; distinguir diseños antiguos |

## Contrato de acciones sensibles

1. Botón Eliminar de sesión y swipe izquierdo → `act('discard')` → `decide` →
   `state.pending`. Es cola reversible, no borrado PhotoKit.
2. `Finalizar sesión` abre revisión. `Recuperar`/gesto sostenido derecho usan
   `restore`; `Deshacer todo` vacía pendientes; `Regresar` usa undo y contexto.
3. Solo botón `Eliminar N` en revisión → `commitDelete` → `Library.deleteAssets`.
   En demo devuelve IDs simulados. En nativo Swift `deleteAssets` reconsulta
   `PHAsset` y excluye favoritos/ocultos, y `performChanges` solicita confirmación
   de Fotos. Tras éxito solo IDs devueltos pasan a removed; error/cancelación no
   vacía la cola. No añadir una segunda confirmación propia ni saltarse la de Apple.
4. Favorita **sí** escribe PhotoKit desde `act`, incluso mediante gesto arriba;
   undo puede desmarcar. Crear/añadir álbum también escribe y no forma parte de
   ese undo. Una acción aparentemente visual puede modificar Fotos.
5. Bienvenida nativa solicita permisos al montar. Filtros pueden refrescar o
   analizar. No disparar callbacks durante animación, mount extra o render.

Permisos/ficheros: `authorize/assets/thumbnail/metadata/prepareVideo` viven en
Library y Swift; Info.plist/PrivacyInfo describen el acceso. No hay módulo de
autenticación de app que rediseñar. Identificadores, EXIF/GPS, thumbnails y
estado del usuario no deben entrar en capturas compartidas ni servicios externos.

## Riesgos y reutilización

### Índice concreto de dependencias sensibles

Referencias verificadas el 30-10-2026 en el árbol local; líneas pueden cambiar.
Antes de editar, buscar el símbolo además de consultar la línea.

| Operación | Referencia de código | Componentes dependientes / límite |
| --- | --- | --- |
| Acceso Fotos y refresh | [ManoApp:122](../../mano/src/ManoApp.tsx#L122), connect:153; [Swift authorize:81](../../mano/ios/App/App/PhotoLibrary.swift#L81), assets:84 | Welcome/beginSession, Filtros/Actualizar, indicador limitado; no disparar permisos desde una animación |
| Descarte reversible | [act:174](../../mano/src/ManoApp.tsx#L174), decisión domain; botones:241 y end:192 | Eliminar sesión y swipe solo pending; controles visibles no pueden llamar al bridge delete |
| Eliminación/confirmación | [commitDelete:211](../../mano/src/ManoApp.tsx#L211), revisión:250; [Swift deleteAssets:340](../../mano/ios/App/App/PhotoLibrary.swift#L340), change:177 | Sheet revisión/Eliminar N; reconsulta favoritas/ocultas, performChanges y confirmación Photos; preservar cancelación/errores |
| Favoritas/undo | act:174, [undoLast:178](../../mano/src/ManoApp.tsx#L178); [Swift favorite:185](../../mano/ios/App/App/PhotoLibrary.swift#L185) | Corazón, gesto arriba, Regresar; sí escribe Fotos, puede desmarcar al deshacer |
| Álbumes | [createAlbum:208](../../mano/src/ManoApp.tsx#L208), openAlbums:209, addAlbum:210; Swift addToAlbum:195/createAlbum:202 | Sheet álbumes/AlbumInput, selección targets; no convertir creación en efecto de montaje ni prometer undo de álbum |
| Persistencia | [lectura:72](../../mano/src/ManoApp.tsx#L72), localStorage:118, envelope:142, save:145–146; [session.ts:22](../../mano/src/session.ts#L22) | Continuar sesión, filtros, orden y selección; conservar claves/versiones/seed/contexto/historial |
| Precarga/cancelación | [prepareWindow:99](../../mano/src/ManoApp.tsx#L99), cancelWarmup:116, beginSession:157; preload.ts/media.ts | Progreso, Cancelar, Photo, InlineVideo; ventana diez y dos preparaciones, liberar vídeos y no aceptar resultados antiguos |
| Gestos/selección | [start:186](../../mano/src/ManoApp.tsx#L186), move:189, end:192, cancel:197; [Inspector:8](../../mano/src/Inspector.tsx#L8) | Cartas, grid recuperar, inspector anclado; preservar umbrales, captura pointer, cancel y alternativas de botón |
| Bridge y media | [library.ts:33](../../mano/src/library.ts#L33), thumbnail:35; [InlineVideo:6](../../mano/src/InlineVideo.tsx#L6), [Inspector:8](../../mano/src/Inspector.tsx#L8) | Photo/poster, vídeo, Geek, fallback fullscreen; llamadas nativas y limpieza/caché no son presentación |

Las referencias por símbolo son el contrato estable; las líneas son ayuda, no
protección técnica. Cambiar lógica en estas secciones se transfiere al propietario
funcional mediante el protocolo, sin refactorizar como parte del rediseño.

- `ManoApp` es monolítico y tiene efectos asíncronos. No existe separación total
  UI/lógica: el mapa documenta la frontera; no la implementa físicamente.
- CSS acumula reglas históricas, variables de `:root` redefinidas en `.mano-app`, colores inline y overrides.
  Extraer tokens/componentes es propuesta futura; no eliminar clases por apariencia
  de obsolescencia sin buscar consumidores y comparar las dos entradas.
- Reusar Sheet/Photo/Seal/BrandStatus y controles actuales antes de duplicarlos.
  Una extracción solo visual puede ser razonable tras aprobación, preservando
  firmas y callbacks; no se realizó aquí.
- Sheet tiene implementaciones distintas en demo/nativo. Una captura web no
  garantiza foco/scroll/teclado en WKWebView. native.css y safe-area importan.
- Layout depende de medidas reales, container units, altura y aspecto del asset;
  verificar fotos horizontales/verticales, vídeos, accesibilidad y texto ampliado.
- Motion/reduced motion no cubren necesariamente todo por igual (BrandStatus,
  inspector y gestos tienen caminos diferentes). Auditar antes de retocar.

## Restricción escrita frente a protección técnica

READ/WRITE/PROTECTED y CLAUDE.md son instrucciones: no ACL ni sandbox.
`ui-auditor` declara solo Read/Grep/Glob, sin shell, editores, MCP o Agent: limita
las herramientas de ese subagente cuando Claude Code lo carga correctamente.
No restringe al agente principal ni procesos externos; carga real aún pendiente.
No se añadieron hooks/denies globales ni protección técnica de rutas.
El checker de runtime detecta cambios en 28 archivos, no los impide y no cubre
toda lógica sensible. Swift revalida favoritos/ocultos y Photos confirma borrado;
estas defensas no sustituyen revisión de diff ni QA. Git es recuperación solo
para contenido guardado; no respalda por sí solo cambios locales o Fotos.
