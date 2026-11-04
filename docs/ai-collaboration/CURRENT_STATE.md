# CocoWash — estado operativo conocido

Actualizado: 2026-11-04, America/Bogota. Codex trabaja solo por indicación del usuario; no se requiere disponibilidad de Claude.

## Base vigente e integración

- **main contiene CocoWash 0.9.6, build 17**. El usuario autorizó actualizar GitHub durante la auditoría. PR [#2](https://github.com/joacomino-dev/mano-iphone/pull/2) fusionado: `769ef54f29bf4e3bef16be2d57273cd37e2025d7`.
- Fuente integrada: `dddccbb36a7e78f06f6673e4de28866283f66917`, rama `claude/perf-stability-cotton`, 32 commits sobre el antiguo main `f6133d4`. El árbol del merge coincide exactamente con el de esa fuente; no se implementaron optimizaciones nuevas.
- La rama vigente incorpora PR #1 (`claude/decision-bar-favoritas`, 0.9.2). Se conservaron las ramas. `claude/ci-probe-flat-paper` es una sonda de CI y no debe integrarse.
- **El checkout Windows sigue en `76744e2`, con fuentes 0.7 y documentos locales modificados previos.** No se hizo fetch, checkout, reset, stash, commit local ni se sobrescribió trabajo. Su commit de herramientas Windows sigue sin publicarse. Antes de desarrollar, preparar una base local recuperable y actualizarla sin perder esos cambios.

## Validación y límites

- Codex ejecutó **84/84 pruebas de lógica** desde las fuentes remotas del SHA 0.9.6, cargadas en memoria con Node; sin instalar dependencias ni escribir fuentes. No equivale a compilar Swift ni a medir un iPhone.
- CI anterior confirmado por API: [41530807373](https://github.com/joacomino-dev/mano-iphone/actions/runs/41530807373), verde sobre `1586a37` (0.9.5, build 16).
- CI de la integración 0.9.6: [41837796389](https://github.com/joacomino-dev/mano-iphone/actions/runs/41837796389), **en curso al registrar esta entrada**. Verificar resultado y SHA antes de entregar un IPA. El artefacto de 0.9.5 no demuestra la compilación de 0.9.6.
- No se actuó sobre el iPhone ni se confirmó ningún borrado. QA física de fluidez, iCloud, HEVC/slow-motion, continuidad de vídeo, VoiceOver y Dynamic Type sigue pendiente. El simulador usa papel plano; el IPA restaura la textura, por lo que el smoke no valida su coste gráfico real.

## CW-HO-005 — recibido por Codex; aceptación física pendiente

Leídos el código 0.9.6, [CLAUDE_PERF_CW-CL-027](../ai-handoff/CLAUDE_PERF_CW-CL-027.md) y CLAUDE_LOG hasta CW-CL-033. Recepción técnica, sin afirmar QA física completa.

Conservar: secuencia canónica y mano fija (`sequence.ts`), arrastre por MotionValue, historial exacto, cachés de referencias acotadas, póster independiente del vídeo, originales de Fotos protegidos y borrado solo desde revisión con confirmación de Fotos.

## Auditoría de rendimiento — propuestas, no implementadas

- Revisión: el grid monta todos los descartes y solicita miniaturas fuera de la cola acotada. Ensayo con puente simulado: 1.000 solicitudes simultáneas. Prioridad: carga por visibilidad, cola global y cancelación.
- Caché: `thumbnailInfo` omite `cacheBytes`; esos caminos no disparan poda. `prewarm` también evita el coordinador iCloud: reproducidas dos solicitudes del mismo ID/tamaño, una sin seguimiento.
- Índice: sizes/flags se guardan por ID en JS; una edición con el mismo ID conserva resultados viejos. Native sí versiona por modificación. Unificar invalidación.
- Vídeo: cambiar de Ahorrar a Descargar siempre no reintenta un error IN_CLOUD existente. La ventana fija de hasta diez vídeos puede agotar el presupuesto de archivos protegidos; medir y priorizar por bytes.
- Vision: hay caché persistente de huellas y selección lineal por imagen, pero el recorrido total de representantes sigue siendo cuadrático en el peor caso. Medir antes de cambiar el agrupamiento.
- No reinstalar herramientas, sustituir la arquitectura ni eliminar animaciones por conjetura. Las propuestas esperan autorización expresa. Informe completo entregado en la conversación de auditoría del 2026-11-04.

## Referencias

[CLAUDE_LOG](CLAUDE_LOG.md), [CODEX_LOG](CODEX_LOG.md), [PROTOCOL](PROTOCOL.md), [PROJECT_MAP](../ai-handoff/PROJECT_MAP.md), [UI_ARCHITECTURE](../ai-handoff/UI_ARCHITECTURE.md), [UI_BASELINE](../ai-handoff/UI_BASELINE.md), [notas 0.9.5](../ai-handoff/NEXT_0.9.5_PROMPT.md). Los mapas de octubre contienen descripciones históricas: contrastar siempre con el SHA vigente.

- **CW-CL-022 / CW-CL-023 (PR #1, rama claude/decision-bar-favoritas, 2026-11-01):** barra de decisiones cartoon + set «Favoritas»; 0.8.0 (8): pantalla principal en el mismo lenguaje, wordmark Fredoka, icono recoloreado, Terminar→última mirada→cerrar vuelve a las cartas, VHS y sellos. IPA por workflow_dispatch en la rama. Ver CLAUDE_LOG.
- **CW-CL-013 (sin commit):** mejoras UI/UX del usuario (vídeo, onboarding, anclaje, metadatos Polaroid/VHS, ajustes, contador). Checks Windows verdes; falta CI macOS (Swift + XCTest actualizado) y QA en iPhone de vídeo local/iCloud. Ver CLAUDE_LOG.
- Último Claude anterior: CW-CL-005, publicación y preparación de la compilación. Antes: CW-CL-002/003
  (rediseño y render nativo simulado). Informe [CLAUDE_REDESIGN](../ai-handoff/CLAUDE_REDESIGN_CW-CL-002.md).
- Último Codex: CW-CX-003, recepción, revisión técnica, orden aprobado actualizado y Fase 0 completada.
- Protección: respaldo externo verificado en
  `C:/Users/Joaco/CocoWash-Backups/20261030T173452Z-pre-redesign/` (estado previo al rediseño).
- CI: run iOS [41124449495](https://github.com/joacomino-dev/mano-iphone/actions/runs/41124449495)
  sobre 8e73093, en curso al cerrar Claude; resultado sin consultar. Un push que toque `mano/**`
  en main cancela el run en curso del mismo ref (`cancel-in-progress`).
- Pendiente: revisión del diff por Codex (CW-HO-003), QA en dispositivo (hoja nativa, VoiceOver,
  Dynamic Type, vídeo), release/IPA verificado. Playwright test:runtime no se ejecutó.
- CW-CL-006: run 41124449495 falló por bloqueo ibtool/actool con arranque paralelo del simulador; corrección (compilar antes de arrancar + selectores del rediseño) publicada; ver nuevo run en CLAUDE_LOG.
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

