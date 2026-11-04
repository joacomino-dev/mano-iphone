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
