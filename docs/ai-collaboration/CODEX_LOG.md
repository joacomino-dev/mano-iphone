# Bitácora Codex

Entradas cronológicas; leer solo IDs/temas pertinentes. Formato canónico en
[PROTOCOL.md](PROTOCOL.md). Estado actual resumido en [CURRENT_STATE.md](CURRENT_STATE.md).

### CW-CX-001 — Preparación visual inicial
Fecha: 2026-10-30, America/Bogota (sesión anterior de esta conversación).
Agente: Codex
Tarea: preparar incorporación visual sin cambiar app.
Estado: completada local, sin commit/integración remota.
Base Git / commit: main, 0a6d32d65d273b1408ef79bedc728acf9579fad1, dirty.
Archivos modificados: CLAUDE.md; docs/ai-handoff (cuatro documentos y siete PNG/metadatos); .claude skill/agente.
Cambios realizados: mapa técnico/visual, contratos protegidos y baseline demo.
Decisiones relevantes: sesión de cartas como piloto propuesto, no aprobado.
Validaciones: 34 tests, 28 archivos runtime, builds web/assets nativos y 4 tests Sites pasaron; runtime bloqueado por npm. No compilación Swift nueva.
Impacto para Claude: fuentes y capturas localizables; demo no acredita hardware.
Pendientes: auditoría creativa y recepción real de Claude. Entrada incorporada desde entrega anterior real, no nueva ejecución de aquellas pruebas.

### CW-CX-002 — Preparación definitiva y coordinación
Fecha: 2026-10-30, America/Bogota.
Agente: Codex
Tarea: revisar instrucciones y habilitar colaboración persistente.
Estado: completada local, pendiente de integrar en Git.
Base Git / commit: mismo main/HEAD dirty que CW-CX-001; sin commit nuevo.
Archivos modificados: AGENTS/CLAUDE raíz y mano; docs/ai-handoff; .claude skill/agente; docs/ai-collaboration.
Cambios realizados: imports comunes, estado/bitácoras/protocolo, índices de callbacks, libertad creativa y registro de decisiones; codificación de guía móvil corregida.
Decisiones relevantes: sin hooks ni skill adicional; trabajo secuencial, worktrees solo tras base autorizada.
Validaciones: 136 archivos comparados, fuente/índice/refs intactos; 14 docs/43 enlaces/imports PASS; siete PNG abiertas/íntegras; runtime28 PASS. Frontmatter simple PASS; validador genérico bloqueado por PyYAML. Sin repetir builds.
Impacto para Claude: CW-HO-001 listo para auditoría exclusivamente de lectura.
Pendientes: comprobar carga efectiva en Claude y revisión del usuario antes de implementar. Recorrido local CW-HO-001 PASS, sin simular recepción.

### CW-CX-003 — Recepción Claude y Fase 0
Fecha: 2026-10-30, America/Bogota.
Agente: Codex
Tarea: recibir CW-CL-001/CW-HO-001 y proteger proyecto.
Estado: completada local; rediseño no autorizado.
Base Git / commit: main, 0a6d32d65d273b1408ef79bedc728acf9579fad1, dirty; índice intacto.
Archivos modificados: mano/AGENTS.md; UI_BASELINE; CODEX_REVIEW_CW-HO-001 nuevo; CURRENT_STATE; esta bitácora. Auxiliares ignorados en work/ y respaldo externo.
Cambios realizados: orden de revisión aprobado, recepción de 22 hallazgos y revisión de dependencias; Fase 0 recuperable.
Decisiones relevantes: Favoritos es comando, no toggle; Motion global requiere revisión de alcance. Sin implementación ni commit necesario ahora.
Validaciones: 656 archivos SHA256, ZIP restaurado, git fsck/HEAD/refs/stage/status equivalentes; detalles/recibo en CODEX_REVIEW. Sin builds nuevos.
Impacto para Claude: CW-HO-002 preparado, semántica/movimiento/contratos reservados para Codex.
Pendientes: aprobación general antes del piloto; revisión diff y QA posterior.

### CW-CX-005 — Auditoría 0.9.6 e integración autorizada en main
Fecha: 2026-11-04, America/Bogota.
Agente: Codex (solo; usuario sin cupo de Claude).
Tarea: reconstruir proyecto, auditar rendimiento y actualizar GitHub con la última versión, autorizado durante la auditoría.
Estado: integrada la fuente; auditoría entregada en chat; optimizaciones propuestas, no implementadas. CW-HO-005 recibido técnicamente; aceptación física pendiente.
Base Git / commit: remoto dddccbb (0.9.6/17), merge 769ef54 en [PR #2](https://github.com/joacomino-dev/mano-iphone/pull/2); árboles idénticos. Local Windows 76744e2 dirty preservado, sin fetch/checkout/escrituras. CW-CX-004 sigue solo en documentos locales previos, no se incorpora a ciegas.
Archivos modificados: integración de 32 commits existentes; después CURRENT_STATE y esta bitácora, solo documentación.
Cambios realizados: main pasó de 0.7 a 0.9.6; PR #1 también figura integrado. Sin publicar herramientas locales ni fusionar la sonda ci-probe-flat-paper.
Decisiones relevantes: conservar mano fija, MotionValue y contratos de Fotos. Priorizar revisión por visibilidad/cola global, cachés coherentes e índice por edición; medir Vision cuadrático antes de cambiar el algoritmo.
Validaciones: 84/84 tests del SHA remoto en memoria; 1.000 solicitudes de miniaturas simultáneas y duplicación prewarm/cloud reproducidas con puente simulado; IN_CLOUD no reintenta al cambiar preferencia; índice JS por ID reutiliza señales antiguas. Banco Node de derivaciones: 0,05/0,26/3,11/18,10 ms para 100/1.000/10.000/50.000 assets (medianas, 20 % pendientes, orden aleatorio, sin UI/PhotoKit). No son tiempos de iPhone. CI [41837796389](https://github.com/joacomino-dev/mano-iphone/actions/runs/41837796389): tests/runtime/build y sync verdes; smoke en curso al registrar.
Impacto para Claude: no se requiere su intervención; continuar desde main remoto y el estado actualizado.
Pendientes: resultado completo del CI, Instruments/iPhone, actualizar checkout local con base recuperable sin perder cambios. No implementar optimizaciones sin autorización.

### CW-CX-006 — Etapa 1: revisión acotada
Fecha: 2026-11-04, America/Bogota.
Agente: Codex, solo.
Tarea: etapa 1 autorizada; preservar presentación e interacciones.
Estado: completada local, pendiente de integrar y aceptar físicamente.
Base Git / commit: main 3cc28d2, clon independiente CocoWash-stage1; sin commit.
Archivos modificados: ReviewGrid, review, library, ManoApp, prototype.css, test/script y documentación.
Cambios realizados: filas visibles, cola de dos miniaturas, cancelación, deduplicación y foco conservado.
Decisiones relevantes: conservar runtime, decisiones, Swift y animaciones; otras etapas excluidas.
Validaciones: 90/90 tests, runtime28, TypeScript, builds web/assets nativos, Sites4 y QA Edge pasan. Con 1.000 demos: 18 tarjetas iniciales/30 intermedias; recuperación, persistencia, teclado, swipe/undo y geometría antes/después correctos. Respaldo original verificado.
Impacto para Claude: [entrega y evidencia](../ai-handoff/STAGE_1_REVIEW.md); no requiere intervención.
Pendientes: compilación/instalación autorizada, QA iPhone/VoiceOver e Instruments. Sin publicación ni etapa 2.

### CW-CX-007 — Compilación de etapa 1 autorizada
Fecha: 2026-11-04, America/Bogota.
Agente: Codex.
Tarea: publicar solo etapa 1 en rama independiente y generar IPA en Descargas.
Estado: preparando publicación/CI; compilación todavía no verificada.
Base Git / commit: 3cc28d2 más CW-CX-006; rama codex/stage1-review.
Archivos modificados: solo documentación de distribución además de la entrega aprobada.
Cambios realizados: autorización y destino registrados; sin cambios funcionales nuevos.
Decisiones relevantes: main intacto, runner gratuito existente, smoke obligatorio y firma personal AltStore.
Validaciones: checks locales de CW-CX-006 vigentes; revisar diff exacto antes de publicar.
Impacto para Claude: etapa 2 no iniciada; no se necesita intervención.
Pendientes: SHA/run/IPA y recibo de descarga; QA física sigue pendiente.

### CW-CX-008 — Reintento por runner no asignado
Fecha: 2026-11-04, America/Bogota.
Agente: Codex.
Tarea: revisar fallo de CI y corregir dentro de etapa 1, autorizado por usuario.
Estado: reintentado, pendiente de compilar.
Base Git / commit: d9da8aa, codex/stage1-review; main intacto.
Archivos modificados: estado y bitácora locales; auxiliares fuera del repositorio.
Cambios realizados: reintentar solo job iOS 126676156758 del run 41859212044; reactivar descarga.
Decisiones relevantes: no cambiar código ni runner por un fallo de asignación aislado; conservar gates.
Validaciones: anotación GitHub confirma job sin runner ni pasos; intento 2, job 126699082386, confirmado en cola. Conector rechazó rerun por permisos; API con credencial Git existente lo aceptó.
Impacto para Claude: ninguno; no ampliar etapas.
Pendientes: compilación y descarga; antiguo main falló aparte en autorización Photos del smoke (126601256671), no atribuir a etapa 1. Investigar si reaparece en este SHA.

### CW-CX-009 — Recuperación de compilación tras dos fallos Intel
Fecha: 2026-11-04, America/Bogota.
Agente: Codex.
Tarea: corregir distribución de etapa 1 y entregar IPA; autorizado por usuario.
Estado: en curso, pendiente de compilación.
Base Git / commit: d9da8aa, codex/stage1-review; main intacto.
Archivos modificados: workflow y registros.
Cambios realizados: runner gratuito macos-26 ARM con Xcode 26.6 existente; checkout github.sha evita compilar otra revisión si la rama avanza.
Decisiones relevantes: mantener smoke obligatorio, textura y todos los contratos nativos. No ampliar optimización.
Validaciones: dos intentos Intel sin runner ni steps; imagen ARM y Xcode contrastados con inventario oficial runner-images. Sin cambio de aplicación.
Impacto para Claude: no requiere intervención.
Pendientes: comprobar CI y descargar IPA verificado; QA física aparte.

Actualización CW-CX-009: pool ARM macos-26 permaneció 10 minutos sin máquina; run 41872183811 cancelado antes de ejecutar pasos iOS. Incidencia Actions/Pages confirmada en estado oficial. Se prueba pool gratuito macos-15-intel/Xcode 26.3 existente, soportado por inventario oficial runner-images, conservando smoke obligatorio y fuentes de aplicación. No se interpreta cola como error del código.

Segundo fallback: 41873983543/macos-15-intel volvió a fallar sin adquirir máquina. Se usa macos-15 ARM estándar con el mismo Xcode 26.3, inventario oficial verificado. Sin alterar app ni gates.

### CW-CX-010 — IPA de etapa 1 entregado mediante binario nativo idéntico
Fecha: 2026-11-04, America/Bogota.
Agente: Codex.
Tarea: entregar IPA autorizado sin depender de asignación macOS.
Estado: paquete local disponible; instalación/QA física pendientes.
Base Git / commit: web 143a1d8; nativo CI verde 41530807373/1586a37.
Archivos modificados: registros; herramientas/IPA fuera del repo.
Cambios realizados: recompilar TypeScript/Vite nativo; sustituir web assets en IPA nativo inalterado; versiones actuales 0.9.6/17.
Decisiones relevantes: Git demuestra Swift/recursos/dependencias iguales; no nueva compilación Swift. No usar este método si cambian fuentes nativas.
Validaciones: hash artefacto GitHub, CRC, arm64, identidad, textura, 28 recursos nativos y 64 web byte a byte PASS. [Entrega](../ai-handoff/STAGE_1_REVIEW.md) y recibo JSON en Descargas.
Impacto para Claude: no necesario.
Pendientes: firma AltStore/QA física; full CI 41885957816 aparte. Main intacto.

### CW-CX-011 — Optimización conjunta autorizada, etapas 2–7
Fecha: 2026-11-04, America/Bogota.
Agente: Codex, solo.
Tarea: completar etapas restantes y entregar IPA; usuario acepta etapa 1 y solicita misma rama.
Estado: implementación y QA local completadas; compilación nativa/IPA pendientes.
Base Git / commit: 24fb03d, codex/stage1-review; commits por etapa en [informe](../ai-handoff/OPTIMIZATION_097.md).
Archivos modificados: previews, persistencia, índice, vídeo, Vision y pruebas; versión 0.9.7/18; workflow y registros.
Cambios realizados: seis intervenciones delimitadas y correcciones de integración, sin cambios visuales.
Decisiones relevantes: presupuesto vídeo conservador; Vision exacto, buckets acotados, mantiene peor caso cuadrático; no reempaquetar binario antiguo.
Validaciones: 106 tests, runtime28, TypeScript, builds, Sites4 y QA demo antes/después PASS; prueba Swift exhaustiva preparada en CI.
Impacto para Claude: no requerido; main intacto.
Pendientes: compilación/IPA nuevo y aceptación física; no atribuir FPS ni rendimiento iPhone a escritorio.

Actualización CW-CX-011: oráculo Swift de CI 41893615114 PASS; compilación simulador pasa antes de fixtures/boot. Tras espera prolongada en CoreSimulator, se separa job de IPA personal, conservando smoke original. Nuevo job repite tests/runtime/oráculo y exige Release iPhone real antes de subir IPA; no se declara aceptación del smoke pendiente. Solo workflow/documentación, sin cambiar fuente funcional de fce0deb.

### CW-CX-012 — IPA completo 0.9.7/18 entregado
Fecha: 2026-11-04, America/Bogota.
Agente: Codex.
Tarea: entregar etapas 2–7 sobre etapa 1 aceptada.
Estado: implementación y paquete completados; smoke UI y aceptación física pendientes.
Base Git / commit: fuentes fce0deb; CI ed47909, misma app.
Archivos modificados: registros de entrega; IPA/recibo externos en Descargas.
Cambios realizados: [IPA y procedencia](../ai-handoff/OPTIMIZATION_097.md) de compilación Release nueva, sin reempaquetar nativo anterior.
Decisiones relevantes: separar artefacto personal de disponibilidad de CoreSimulator; mantener smoke original.
Validaciones: CI paquete 41899040312 success (106 tests/runtime/oráculo/Release). Hash GitHub, CRC, versión, identidad, arm64, textura y marcador nativo nuevo PASS. QA demo de preferencias conserva mano/orden tras recarga. 366 fuentes originales intactas; main intacto.
Impacto para Claude: entrega autosuficiente, no requiere intervención.
Pendientes: full smoke 41893615114 en curso y pruebas físicas; ninguna medición de FPS/RAM de iPhone atribuida a escritorio.

Actualización CW-CX-012: full smoke terminó failure: XCTest quedó solicitando snapshot de accesibilidad de SpringBoard después del permiso Fotos (840 s y watchdog 1.320 s); cero errores JS registrados. Diagnósticos 13357503774 descargados: captura posterior de SpringBoard y bootstrap tardío PhotosTCCNotificationExtension. Probable entorno de automatización, causa raíz no acreditada; no marcar QA funcional nativa completa. Recibo/estado actualizados; IPA Release 41899040312 y sus verificaciones permanecen válidos. Sin cambiar código ni repetir una ejecución idéntica.

### CW-CX-013 — Aceptación física e integración de 0.9.7/18
Fecha: 2026-11-04, America/Bogota.
Agente: Codex.
Tarea: registrar aceptación del usuario y establecer 0.9.7 como versión actual en main.
Estado: aceptación recibida; integración autorizada en curso.
Base Git / commit: rama codex/stage1-review 842ab93; main 3cc28d2; app compilada ed47909.
Archivos modificados: README raíz/móvil, CURRENT_STATE y entrega; esta bitácora.
Cambios realizados: CW-HO-006 aceptada por usuario tras probar en iPhone y confirmar fluidez; preparación de merge conservando etapas y respaldo.
Decisiones relevantes: no cambia código validado; no confundir aceptación física con smoke XCTest verde ni mediciones instrumentadas.
Validaciones: checks de CW-CX-012 vigentes; comprobar igualdad de fuentes contra IPA y de main tras integrar. Sin repetir builds por documentación.
Impacto para Claude: usar main y estado vigente; bitácora Claude intacta.
Pendientes: registrar PR/SHA de integración; timeout de automatización continúa abierto.

Cierre CW-CX-013: **integrada** mediante [PR #3](https://github.com/joacomino-dev/mano-iphone/pull/3), merge `a536c8b9617adf418b897bb4ecf90ff76783d09b` desde df00d52. Merge normal conserva etapas y rama. Main local actualizado por fast-forward en checkout Developer; OneDrive original intacto. Fuentes de aplicación de main idénticas a ed47909 (IPA probado); runtime28 PASS y enlaces documentales PASS. README/estado reflejan 0.9.7/18 y aceptación física declarada por usuario; sin métricas inventadas ni cambios funcionales adicionales. La incidencia de XCTest sigue abierta y separada. Solo registros cambiados después del merge; no repetir build del mismo código.

### CW-CX-014 — Desarrollo único 9.7.1: Personas y Breakup Mode
Fecha: 2026-11-04, America/Bogota.
Agente: Codex; único escritor, por autorización del usuario.
Estado: en curso, no publicada ni integrada en main.
Base Git: `cocowash/9.7.1` desde estable a3dba60 (0.9.7/18 aceptada).
Alcance: bridge Media Intelligence/FaceGroupAnalyzer (iOS27, inicialización real),
checkpoint SQLite del sistema, consentimiento/correcciones locales; filtro Personas,
Breakup protegido antes de mostrar imagen, Terminar vacío, logo inerte, nube y undo30.
Decisión: mantener iOS17 para el resto. Versión solicitada 9.7.1/19 (tres números,
no `0.9.7.1`, incompatible con CFBundleShortVersionString). Sin modelo externo ni
nuevas dependencias. Usuario confirma iOS27. Workflow de desarrollo aislado, gratuito,
sin despliegue ni App Store; artefacto exclusivamente de prueba.
Validaciones locales iniciales: 110 tests, TypeScript, runtime28, web/native-web,
Sites4 PASS. Swift/API, exactitud/privacidad y rendimiento físicos pendientes.
Impacto para Claude: no requerido; contratos de borrado/favoritas permanecen.
Pendientes: compilar Swift27 y probar UI/errores/cancelación antes de entregar.

Cierre CW-CX-014 — 9.7.1/19 **completada en rama, pendiente de aceptación física**.
Fuente 268224a; [CI 41936437603](https://github.com/joacomino-dev/mano-iphone/actions/runs/41936437603)
success. 111 tests/runtime28/TypeScript/builds/Sites4; Edge normal/reducido,
respuestas tardías, revelado interrumpido, membresía estable, input nativo sin
provider de preview y undo30 tras recarga PASS. Swift: API pública, geometría300,
firmas exactas y SQLite50.000 metadatos con actualización/borrado/reapertura PASS.
IPA nuevo Release arm64 en Descargas, verificado con digest GitHub/CRC/versión/
textura/símbolos y enlace débil de Media Intelligence; [recibo y QA](../ai-handoff/COCOWASH_971.md).
Sin dependencias nuevas, instalación, Release ni merge. Main remoto sigue a3dba60.
Tres fallos iniciales de compilación (CoreGraphics, literales Swift y tipo del
bridge) corregidos sin debilitar checks. Historial por commits reversible.
CW-HO-007 lista para usuario; precisión/censura real y rendimiento físico pendientes.
No se atribuyen resultados de mocks o 50.000 filas a 50.000 fotografías.


### CW-CX-015 — 9.7.2: identidades estables, reconciliación y geometría
Fecha: 2026-11-04, America/Bogota.
Agente: Codex, único escritor.
Tarea: actualización técnica autorizada; preservar última 9.7.1 probada por usuario.
Estado: completada en rama, pendiente de aceptación física; no publicada/integrada.
Base Git / commit: d6d6f21 → `cocowash/9.7.2`, fuente 01f150b;
24 CRLF previos respaldados/conservados. Commits de desarrollo reversibles.
Archivos modificados: People nativo/persistencia/geometría, puente/hook/UI funcional,
ManoApp/ajustes/CSS puntual, pruebas y workflow de desarrollo9.7.2/20.
Cambios realizados: alias, reconciliación multiejemplo con barreras, mínimo5 visual,
screenshots, recortes4, publicación finita/atómica, máscaras oval/ojos y protección.
Decisiones relevantes: mismo framework, sin dependencias; no fusionar evidencia débil.
Validaciones: 113 Node/runtime28/TypeScript/builds/Sites4/Edge; Swift/SQLite50.000
metadatos y Release iPhone en [CI41949432356](https://github.com/joacomino-dev/mano-iphone/actions/runs/41949432356), PASS.
IPA en Descargas, digest/CRC/identidad/enlace débil verificados.
Impacto para Claude: CW-HO-008; refinar UI preservando contratos de protección.
Pendientes: precisión, privacidad y recursos físicos; [informe/checklist](../ai-handoff/COCOWASH_972.md).


### CW-CX-016 — 9.7.2.1: recuperación y reset de desarrollo autorizado
Fecha: 2026-11-04, America/Bogota.
Agente: Codex, único escritor.
Tarea: corregir fallo reportado de Personas/cierre; usuario autoriza reinicio de
sesión/sellos/índice al estrenar build, sin tocar fotos.
Estado: completada en rama para pruebas; no aceptada físicamente ni publicada.
Base Git / commit: 0f0b8ac → `cocowash/9.7.2.1`, fuente7487cbe.
Archivos modificados: lifecycle/Scene/arranque nativo, helper Foundation, People,
hook/previews/mensajes, build21/workflow y pruebas. Respaldo previo24 CRLF/refs verificado.
Cambios realizados: modelos lazy, fence nativo y cancelación, recuperación de
interrupción, error pausa UI, reset de índice ilegible y reset por build antes de WK.
Decisiones relevantes: datos antiguos son hipótesis, no causa probada del crash.
Validaciones:113 Node/runtime28/TypeScript/builds/Sites4/Edge/Swift; [CI41956222043](https://github.com/joacomino-dev/mano-iphone/actions/runs/41956222043)
success, Release arm64 y smoke nativo reset/relaunch PASS. IPA/digest/flag verificados.
Impacto para Claude: CW-HO-009 usuario primero; no alterar protección ni reset.
Pendientes: análisis y cierre físico, .ips si persiste; [detalle](../ai-handoff/COCOWASH_9721.md).

### CW-CX-017 — Relevo de Personas y controles de revisión
Fecha: 2026-11-05, America/Bogota
Agente: Codex
Tarea: CW-HO-010, corregir Personas y preparar build 23.
Estado: pendiente de integrar y de aceptación física.
Base Git / commit: CocoWash-stage1, a477ac0 → 67a69e0.
Archivos modificados: Personas, puente de Fotos, vídeo/VHS, sellos, pila, pruebas y workflow.
Cambios realizados: recuperación de respuestas al pausar, trazas de fase, progreso real, hoja nativa de compartir, continuidad de vídeo y selección estable.
Validaciones: base falla y build nuevo pasa en Edge la carrera de pausa. 114 Node, 4 Sites, runtime28, builds, Swift, Release iPhone y smoke de reset/reapertura en simulador. Demo verificó recuperación de vídeo, VHS y pila. IPA y SHA en [informe](../ai-handoff/COCOWASH_9723.md).
Impacto para Claude: la tarea pasa a la rama de Codex. Usar el build 23 como candidato.
Pendientes: diagnóstico y aceptación física de Personas, ejecución en segundo plano y validación de la hoja de iOS.

### CW-CX-018 — Compatibilidad Apple y preparación internacional
Fecha: 2026-11-07, America/Bogota.
Agente: Codex.
Tarea: auditoría, matriz y correcciones comprobadas sobre build 43.
Estado: completada local; pendiente de integrar y QA nativo.
Base Git / commit: CocoWash-b24, claude/cocowash-9.8.6, 691cded; limpio inicialmente, ahora diff local propio.
Archivos modificados: ManoApp.tsx, prototype.css, tests/apple-*.mjs, docs/apple-readiness, CURRENT_STATE y esta bitácora.
Cambios realizados: recarga de permisos; cierre al revocar; invalidación de snapshots anteriores al borrado; insets laterales. [Auditoría/evidencia](../apple-readiness/README.md).
Decisiones relevantes: mínimo configurado 17 conservado; Duo no acreditado; sin cambios visuales/dependencias/Swift ni publicación.
Validaciones: 119 Node antes/después, 19 escenarios Edge con puente ficticio, Sites4, runtime28, tsc y builds. Baseline de 247 fuentes: solo dos existentes cambian. CI base consultada, no del diff.
Impacto para Claude: preservar esta corrección local al integrar; snapshots históricos no son el estado actual.
Pendientes: macOS/PhotoKit, iOS mínimo, Duo, hardware, privacidad agregada, firma/TestFlight/ASC.

### CW-CX-019 — Seguridad asíncrona y gate nativo/TestFlight
Fecha: 2026-11-07, America/Bogota.
Agente: Codex.
Tarea: Fase2 autorizada; consolidar build43 y ejecutar validaciones posibles.
Estado: verificada local; integración y ejecución nativa pendientes.
Base Git / commit: 691cded; checkpoint 9ff2734; correcciones b463bd2 y 13dae6f.
Archivos modificados: ManoApp/ReviewGrid, tests/fixtures/config Edge, gate macOS, documentación/evidencia.
Cambios realizados: guard manual refresh; bloqueo de Recuperar pendiente; permiso independiente de snapshots; coordenada válida de test. [Informe](../apple-readiness/PHASE2.md).
Decisiones relevantes: mínimo17/identidad/Swift/dependencias/monetización conservados; sin push/distribución.
Validaciones: 119 Node, 19 regresiones, 9 seguridad, 8 runtime Edge, 4 contratos estáticos, Sites4, runtime28, tsc/builds; métricas Node 1k/10k/50k. Fallos reproducidos antes y corregidos. Bash sintaxis PASS; nativo no disponible, exit78.
Impacto para Claude: preservar commits locales y guards al integrar; no confundir fixture con PhotoKit real.
Pendientes: macOS/PhotoKit, hardware/Duo, Instruments/accesibilidad, privacidad agregada, firma/ASC/TestFlight.

### CW-CX-020 — RC local y puertas de distribución
Fecha:2026-11-07, America/Bogota.
Agente:Codex.
Tarea:Cierre RC autorizado; conservar identidad/monetización/última base.
Estado:completada local; envío bloqueado.
Base Git / commit:b0cf83d limpio, CocoWash-b24; código/config dc5ffc9.
Archivos modificados:ManoApp/Monetization, traducciones/close nativo, manifest/políticas, canal/config, tests/scripts/docs.
Cambios realizados:favorita obsoleta/catálogo vacío corregidos645564f; i18n9824907; privacidadcb927ad; Release/versionado55c6951; gates880a9a0/ca668b7; plazos legalesdc5ffc9. [Informe](../apple-readiness/RELEASE_CANDIDATE.md).
Decisiones relevantes:responsable/contacto y monetización confirmados; iOS17, arte,28 protegidos, dependencias y funciones conservados. Sin push/cuentas/subidas.
Validaciones:120 Node+6 Release+4 estáticos+Sites4+52 navegador/runtime;TS/builds/sync Windows PASS. SDKs oficiales inspeccionados; NO Swift/PhotoKit nativo ejecutado.
Impacto para Claude:preservar commits/configuración RC; no mostrar developer/«Pronto» ni copiar metadatos históricos como finales.
Pendientes:P1 dominios tracking FAIL; macOS/hardware/Duo, privacidad agregada/tráfico/web, sandbox/comercio/firma/TestFlight BLOCKED.

### CW-CX-021 — Roadmap y recurrencia de análisis entre rondas
Fecha:2026-11-07, America/Bogota.
Agente:Codex.
Tarea:R-00 primero sobre main actualizado f5c3546.
Estado:corrección local verificada; aceptación física bloqueada.
Archivos modificados:ManoApp,similarity-state,tests/fixtures/package scripts,roadmap/estado/evidencias.
Cambios realizados:pasada completa reutilizada tras desapariciones; versiones reales, rechazo de respuestas tardías/revocadas; parcial no se declara completo; reintento explícito conservado. Roadmap corrige testers Play y alcance de modelos, añade firma/comercio Play y destinos/gate final.
Validaciones:antes11 búsquedas/4.180 IDs; después1/400 en10 ciclos sintéticos;128 Node,5 flujos nuevos,19+9+10 regresiones,TS/runtime28/builds/contratos/Release PASS. [Evidencia](../apple-readiness/R00_CYCLES.md).
Decisiones relevantes:no cambian borrado/undo/identidad/monetización/versiones; refresco de permisos conservado. No Instruments/Swift ejecutados aquí, sin push.
Impacto para Claude:preservar cobertura y epochs; el mock vacío no prueba reindexación nativa global.
Pendientes:R-00 físico y prioridades siguientes; R-02 sigue FAIL.
