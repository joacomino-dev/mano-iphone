# CocoWash — estado operativo conocido

Actualizado: 2026-11-04, America/Bogota. Codex trabaja solo por indicación del usuario.

## Etapa 1 completada local — Codex

Usuario autorizó el 2026-11-04 publicar únicamente la etapa 1 en rama `codex/stage1-review` y ejecutar el workflow macOS gratuito, sin fusionar main. Preparando compilación; IPA aún pendiente. Destino solicitado: Descargas. No generar IPA si falla el smoke test.

Autorizada por el usuario el 2026-11-04. Trabajo aislado en `C:/Users/Joaco/Developer/CocoWash-stage1`, base `3cc28d2` (0.9.6/17), sin commit. Revisión por filas visibles, cola de dos miniaturas y cancelación. 90/90 pruebas, runtime28, TypeScript, builds web/assets nativos, Sites4 y QA demo en Edge pasan. [Entrega y pruebas físicas pendientes](../ai-handoff/STAGE_1_REVIEW.md), bitácora CW-CX-006. Sin publicación, merges ni cambios en el checkout anterior. Respaldo de 1.457 archivos y .git verificado en `C:/Users/Joaco/CocoWash-Backups/20261104-stage1-current`. Dependencias existentes copiadas, sin instalación. No iniciar etapa 2 sin autorización.

## Base vigente

- **main contiene CocoWash 0.9.6, build 17**. [PR #2](https://github.com/joacomino-dev/mano-iphone/pull/2) fusionado en `769ef54f29bf4e3bef16be2d57273cd37e2025d7`; fuente `dddccbb36a7e78f06f6673e4de28866283f66917` de `claude/perf-stability-cotton`. Los árboles de fuente y merge son idénticos. Los commits posteriores solo actualizan esta documentación y CODEX_LOG.
- El usuario autorizó actualizar GitHub durante la auditoría. Se incorporaron 32 commits existentes; no se implementaron optimizaciones nuevas. PR #1 también figura integrado. Ramas conservadas; no integrar `claude/ci-probe-flat-paper`.
- **Windows permanece en `76744e2`, con fuentes 0.7 y documentos locales previos modificados.** Checkout, índice, herramientas sin publicar y cambios previos preservados; no hubo fetch, checkout, reset, stash ni commit local. Preparar una base recuperable antes de actualizar el checkout.

## Validación y aceptación

- Codex ejecutó **84/84 pruebas de lógica** del SHA 0.9.6 en memoria, sin instalar dependencias ni sobrescribir fuentes. No equivale a QA física.
- CI 0.9.5/16 confirmado verde: [41530807373](https://github.com/joacomino-dev/mano-iphone/actions/runs/41530807373), SHA `1586a37`.
- CI de la integración 0.9.6: [41837796389](https://github.com/joacomino-dev/mano-iphone/actions/runs/41837796389). Tests/runtime/build y sync:ios pasaron; **smoke en curso al registrar**. Verificar resultado y SHA antes de entregar IPA. El simulador usa papel plano y el IPA restaura la textura.
- **CW-HO-005 recibido técnicamente por CW-CX-005; aceptación física pendiente.** Sin acciones sobre iPhone ni confirmación de borrados. Pendientes: Instruments, iCloud/HEVC/slow-motion, continuidad de vídeo, VoiceOver y Dynamic Type.

## Auditoría — propuestas, no implementadas

Conservar mano fija (`sequence.ts`), MotionValue, historial exacto, cachés de referencias acotadas, póster independiente del vídeo y contratos de Fotos. Priorizar:

1. Revisión por visibilidad, cola global y cancelación: el grid monta todos los descartes; reproducidas 1.000 solicitudes simultáneas con puente simulado.
2. Cachés e invalidación: thumbnailInfo omite cacheBytes; prewarm evita el coordinador iCloud (dos solicitudes del mismo ID/tamaño reproducidas); sizes/flags JS se indexan por ID y conservan resultados tras una edición.
3. Política de vídeo y presupuesto: IN_CLOUD no reintenta al cambiar a Descargar siempre; diez vídeos protegidos pueden agotar la caché.
4. Medir Vision: caché de huellas y selección lineal por foto existentes, pero recorrido total cuadrático en el peor caso.

Las optimizaciones esperan autorización expresa. Detalle y banco Node en [CODEX_LOG, CW-CX-005](CODEX_LOG.md); informe completo en la conversación de auditoría del 2026-11-04. Mapas de octubre son históricos: contrastar con el SHA vigente.

Referencias: [PROTOCOL](PROTOCOL.md), [CLAUDE_LOG](CLAUDE_LOG.md), [rendimiento 0.9.3](../ai-handoff/CLAUDE_PERF_CW-CL-027.md), [PROJECT_MAP](../ai-handoff/PROJECT_MAP.md), [UI_ARCHITECTURE](../ai-handoff/UI_ARCHITECTURE.md), [UI_BASELINE](../ai-handoff/UI_BASELINE.md).

## Historial conservado — snapshots anteriores, no estado vigente


- Próximo: usuario revisa resultado del run 41124449495. Codex confirmó `in_progress`
  en CW-CX-004 y se detuvo sin polling. No hizo push: el único commit local añade
  adaptador/herramientas Windows, no cambia la app que ya se está compilando.

## CW-HO-004 — compilación lista para lanzar, Claude → Codex

**Recibida por CW-CX-004; compilación existente confirmada en curso.** main local = origin/main + 1 commit local (mano/CLAUDE.md, mano/tools/
de Codex). Para compilar: comprobar que el run 41124449495 terminó (o aceptar cancelarlo), luego
`git push origin main` desde la raíz: el workflow «Build Mano for AltStore» arranca solo por tocar
`mano/**`. Alternativa sin push: *Run workflow* (workflow_dispatch) en Actions. El IPA sale como
artefacto `Mano-AltStore`; publicar release solo tras verificar el run (ver CURRENT.md).

## CW-HO-003 — rediseño entregado, Claude → Codex

**Lista, no recibida ni integrada.** Base: main 0a6d32d dirty + cambios CW-CL-002 sin stage.
Revisar §Para Codex de [CLAUDE_REDESIGN](../ai-handoff/CLAUDE_REDESIGN_CW-CL-002.md):
literales de aviso en act/closeSession/undoLast, salida de cartas con AnimatePresence
(solo lee history), prop description de Sheet, revisión reordenada con los mismos
handlers. Decidir MotionConfig, Dynamic Type y aria-describedby nativo. Aceptación:
diff revisado, checks repetidos y QA nativa no destructiva.

## CW-HO-001 — cerrado como entrega de auditoría

Codex → Claude → Codex: recibida y respondida por CW-CL-001, recibida formalmente
en CW-CX-003. Informe [CLAUDE_AUDIT](../ai-handoff/CLAUDE_AUDIT_CW-HO-001.md);
recepción técnica [CODEX_REVIEW](../ai-handoff/CODEX_REVIEW_CW-HO-001.md).
Cierre documental no significa aprobación artística ni integración de rediseño.
Los registros antiguos de «Claude no ejecutado» describen la preparación anterior.

## CW-HO-002 — recibida y ejecutada por CW-CL-002 (texto original abajo)

Codex → Claude. Base: este checkout dirty protegido. Leer CODEX_REVIEW y decisión
de revisión en [UI_BASELINE](../ai-handoff/UI_BASELINE.md). Propuesto: tokens/CSS,
JSX sesión y BrandStatus acotado. No implementar toggle Favoritos ni provider
global de Motion; escalar semántica/foco/lógica a Codex. Aceptación: revisión diff,
checks, capturas demo comparables y límites nativos explícitos. El receptor aún
no ha confirmado esta nueva entrega. Protocolo en [PROTOCOL](PROTOCOL.md);
historial anterior en CURRENT.md solo bajo demanda.

