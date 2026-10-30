# Recepción técnica CW-HO-001 — CW-CX-003

2026-10-30, America/Bogota. Recibidos informe de Claude CW-CL-001, sus 22
hallazgos y propuesta «Sello y papel», piloto sesión de cartas y fases 0–4.
Recepción documental completada; no significa aprobación global, implementación
ni integración Git. El usuario confirmó que la propuesta general sigue pendiente.
No se atribuyen mediciones de contraste, VoiceOver o comportamiento nativo al informe.

## Decisiones y corrección de contradicciones

Orden de revisión aprobado: **resumen → fotos descartadas → Eliminar N →
Deshacer todo → Continuar / Finalizar y guardar**. Mantener recuperación y notas
de borrado/iCloud junto a la acción correspondiente. Se actualizó mano/AGENTS.md
y la decisión canónica en UI_BASELINE; ninguna pantalla cambia en esta recepción.
Las menciones actions-first en el diagnóstico y bitácoras anteriores son historia,
no instrucciones vigentes. La propuesta «Sello y papel», tokens, copys y animación
no se consideran aprobados por haberse resuelto dos decisiones particulares.
CURRENT_STATE se corrige: Fase 0 no era el único requisito; falta aprobación global.
La cabecera blanca de preview aceptada consta en UI_BASELINE/Claude §5; sigue
protegida y no se sobrescribe desde CSS de app.

## Fase 0 completada: copia recuperable local

- Base: main `0a6d32d65d273b1408ef79bedc728acf9579fad1`, dirty. Inventario real:
  31 rutas staged, 3 unstaged (se solapan), 27 archivos untracked relevantes.
- Respaldo externo previo a estos ajustes documentales:
  `C:/Users/Joaco/CocoWash-Backups/20261030T173452Z-pre-redesign/`.
- `CocoWash-recovery.zip`: 656 archivos, 147508921 bytes sin comprimir; incluye
  `.git` completo, índice, fuentes, assets, auditoría y archivos locales relevantes.
  Manifiesto SHA256 por archivo, parches staged/unstaged y guía RECOVER.md.
- ZIP SHA256: `9cd7972643083e20c3e85a4afa8024b7644e3fa2e1318a1cc0c0b5ef9f9f5f1c`.
- Verificado: descompresión a `restore-check/project`, SHA256 de todos los archivos,
  `git fsck --full` y equivalencia HEAD/refs/índice/stage/status. Fuente sin cambios
  durante la copia. `VERIFIED.json` contiene recibo. No es solo presencia del ZIP.
- Excluidos: work/, outputs/, mano/node_modules, dist, build, test-results y
  playwright-report. Son auxiliares/generados, no fuente de la aplicación. No
  respalda el carrete, datos del iPhone, firmas ni software instalado.
- Estos documentos finales se conservan además en handoff-addendum con manifiesto
  propio; no se altera el ZIP de la base previa. Copias no son checkouts activos.
  Recuperar siempre en ruta nueva, nunca encima del proyecto de trabajo.
- No commit necesario para esta entrega secuencial: snapshot recuperable permite
  empezar tras aprobar el piloto. Antes de paralelizar se debe revisar/autorizar
  un commit común con cambios funcionales previos y documentación deseados; no se
  crea ni propone confirmar ciegamente todo lo que hoy está staged.

## Dependencias técnicas: decisiones propuestas, sin implementar

| Tema / código real | Evaluación y siguiente paso | Responsable / condición |
| --- | --- | --- |
| Favoritos: ManoApp:174–182, :242; domain:55–78 | El botón ejecuta `act('favorite')`, escribe PhotoKit, excluye targets de la siguiente mano y avanza; no alterna favorita/no favorita. `state.favorites` contiene IDs ya excluidos. No añadir `aria-pressed={state.favorites.includes(active.id)}`: describe un toggle que no existe y suele ser siempre falso en la carta visible. Mantener comando con nombre accesible acorde a selección individual/múltiple y feedback de éxito/error. Corazón contorno es propuesta visual válida, no cambio de operación. | Codex revisa semántica antes del merge. Convertirlo en toggle requeriría otro contrato y autorización; no es requisito del piloto. |
| Cartas: ManoApp:228–234, cycle/select:184–185 | Artículo enfocable, Enter pasa, Espacio selecciona; detrás `inert`/aria-hidden; selección tiene botón propio y aria-pressed correcto. El texto «borde para seleccionar» no corresponde al control explícito. Proponer etiqueta/instrucción veraz, diferenciar foto/vídeo/Live Photo y mantener Siguiente/selección/ampliar accesibles. No poner role=button al artículo con botones/vídeo dentro ni duplicar lectores. Comprobar foco tras cycle/undo, sin cambiar handlers. | Claude puede proponer markup/textos; Codex reserva cambio de semántica/foco para revisión autorizada. VoiceOver/teclado antes de aceptar piloto. |
| Motion: BrandStatus:54–55, cartas:228–230, Inspector; imports Motion existentes | CSS reduce no cubre Motion JS. MotionConfig reducedMotion=user solo reduce transform/layout; opacidad/color pueden seguir. No envolver App/native.tsx a ciegas: App es runtime protegido y contexto puede alcanzar BottomSheet/Carousel a través de portales. Preferir propuesta acotada a UI propia y tratamiento local BrandStatus; revisar useReducedMotion de Welcome/Inspector, posiciones finales, swipe/pinch y AnimatePresence. Progreso/texto deben seguir informando, no solo congelar spinner. | Codex valida alcance y regresiones; Claude diseña feedback. Sin cambio de dependencias ni provider implementado ahora. |
| Avisos: BrandStatus:54, notice timeout:119 y analyze/act | Colisión visible puede resolverse por layout/clases sin reescribir colas, timers o prioridades. Conservar alert para error, status para aviso y cierre de error. No tratar el aviso como título permanente de pantalla ni ocultar controles funcionales. | Claude: posición visual aprobada; Codex: nuevas colas/tiempos/prioridad si se solicitan. |
| Contratos ManoApp | Preservar act/undo/restore, targets, disabled/busy, IDs de foco, callbacks, pending/removed, claves/seed/contexto, precarga/cancelación y límites de concurrencia. Borrado solo commitDelete desde revisión y comprobación nativa de favoritas/ocultas. Ni reordenar revisión ni cambiar copy autoriza otras operaciones. | Codex revisa diff mixto. Sin refactor/extracción funcional previa necesaria. |
| Preview frente a instalada | Sheet usa BottomSheet protegido en demo y Dialog Radix en nativo; teclado simulado solo preview. Mantener cabecero blanco runtime, tematizar cuerpo app con tokens; verificar por separado native-sheet, safe areas, foco, teclado y vídeo. Demo no prueba PhotoKit/iCloud/Live Photo. MotionConfig global podría afectar también primitivas de preview. | Claude: captura demo antes/después. Codex: macOS/XCTest y hardware no destructivo, y actualización de guiones si cambian textos. |

No detecté una migración, dependencia nueva ni corrección funcional obligatoria
que deba implementarse antes de empezar CSS/JSX del piloto aprobado. Hay decisiones
de semántica/movimiento reservadas y comprobaciones obligatorias antes de aceptarlo.
El piloto **aún no puede implementarse**: falta aprobación del usuario a la propuesta
general y alcance. Fase 0 está resuelta; Claude ya puede preparar su siguiente
entrega con estas restricciones, sin interpretar recepción como luz verde.

## Retoma — CW-HO-002, Codex → Claude

Lista documentalmente, implementación bloqueada por aprobación. Consultar este
documento, UI_BASELINE y CURRENT_STATE. Tras aprobación explícita: tokens/piloto
en prototype.css y JSX de sesión/BrandStatus, preservando handlers. No implementar
toggle Favoritos, provider global, cambios de foco/gestos ni lógica de avisos por
cuenta propia; transferir necesidades a Codex. Orden de revisión corresponde a
fase de hojas posterior y ya está decidido, no implementado.
Aceptación: diff mixto revisado por Codex, checks existentes y capturas comparables
normal/reduce/iPhone/Pixel, foco/controles accesibles y pendientes nativos declarados.

Fuentes técnicas: [WAI botón y toggle](https://www.w3.org/WAI/ARIA/apg/patterns/button/),
[MotionConfig](https://motion.dev/docs/react-motion-config),
[accesibilidad Motion](https://motion.dev/docs/react-accessibility).
