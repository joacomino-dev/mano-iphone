# CocoWash — estado operativo conocido

- Actualizado: 2026-11-02, America/Bogota (Claude, sesión en la nube). Snapshot, no estado en tiempo real.
- **Trabajo vigente: rama `claude/perf-stability-cotton`** (publicada), basada en
  `claude/decision-bar-favoritas` (PR #1, 0.9.2). Contiene 0.9.3 (12) y 0.9.4 (13): CW-CL-027 a CW-CL-030.
  `main` sigue en 0.7 (f6133d4). `claude/ci-probe-flat-paper` es solo una prueba de CI (no fusionar).
- La captura de referencia del usuario (fondo crema) corresponde a PR #1, no a `main`: trabajar
  siempre desde la rama vigente.
- Pendiente del usuario: decidir si PR #1 y esta rama se fusionan a `main` (no se ha abierto PR
  de esta rama: puede abrirse contra `claude/decision-bar-favoritas` o contra `main` tras PR #1).

- **0.9.5 (15) en la rama (CW-CL-032)**: build 15 = build 14 con los acentos de vuelta al teal (el café no convenció; pendiente). 0.9.5 (14) salvo la firma de Zángano Studio (falta el texto en curvas). CI verde: run 41520108186 (6a33e0d), IPA publicado. Falta QA en iPhone (autoplay, favoritas, introducción). Observaciones y prompt en
  [NEXT_0.9.5_PROMPT](../ai-handoff/NEXT_0.9.5_PROMPT.md); logo de Zángano Studio en `mano/brand/zangano-studio-logo-source.svg`.

## CW-HO-005 — 0.9.3 entregada, Claude → Codex (lista, no recibida)

Objetivo: que Codex retome sin releer la sesión. Leer primero
[CLAUDE_PERF_CW-CL-027](../ai-handoff/CLAUDE_PERF_CW-CL-027.md) (diagnóstico, arquitectura,
mediciones, límites) y las entradas CW-CL-027/028 de [CLAUDE_LOG](CLAUDE_LOG.md).

1. **CI (hecho)**: run [41395519365](https://github.com/joacomino-dev/mano-iphone/actions/runs/41395519365) (3ce3e19): Swift compiló e IPA generado; XCTest pasó; falló la comprobación del vídeo preparado (corregido en ee86516, ver CW-CL-029). Run [41399471365](https://github.com/joacomino-dev/mano-iphone/actions/runs/41399471365) (ee86516) **verde de punta a punta**: Swift compilado, XCTest 527 s sin fallos, `MEMSWIPE_PHOTOS_READ_OK count=8` y `MEMSWIPE_VIDEO_PREPARED_OK bytes=9060`, IPA sin firmar y artefacto `Mano-AltStore` publicados (la app de HEAD es la misma: después solo cambió documentación). Origen: workflow «Build Mano for AltStore» lanzado por workflow_dispatch en la rama
   (`ipa_even_if_smoke_fails: true`, así el IPA se publica aunque el smoke test falle; el run
   quedaría en rojo). Swift ya compila (PhotoLibrary.swift cambió:
   timeout por inactividad, `encodeQueue` concurrente, caché `ManoPrints` de huellas de Vision,
   selección de candidatos lineal). Siguiente paso real: el punto 2.
2. **QA en iPhone (no destructiva, nunca confirmar borrados en la biblioteca personal)**:
   - Fluidez al deslizar y deshacer con biblioteca grande; Deshacer devuelve siempre la foto exacta
     (también dentro de grupos de parecidas).
   - iCloud: «vista ligera», mantener pulsado inicia la descarga, Anclar se une, progreso real en el
     indicador, error/reintento sin red; «Descargar siempre» sin descargas duplicadas.
   - Avisos en el hueco del nombre (sin mover cabecera), tour (demo de 4 gestos, espera de una
     ronda solo la primera vez, VoiceOver), textura Cotton Fiber en Retina/OLED.
   - Búsqueda de parecidas: segunda ejecución mucho más rápida (caché de huellas).
   - 0.9.4: pantalla de inicio (logo completo + isotipo Zángano), icono nuevo, toque para pausar el vídeo, mantener/anclar/soltar un vídeo sin saltos ni reinicios (y con sonido al anclar), loader nuevo.
3. Contratos nuevos a respetar: `src/sequence.ts` (mano fija; el orden nunca depende de qué
   descarga termina antes), `cloudPreviews` en `src/media.ts` (una descarga por foto, nunca
   originales), tokens `--cw-paper-*` (base / patrón / intensidad; modo oscuro = otra base e
   intensidad, misma losa de `brand/cotton-fiber.py`).
4. Aceptación: run con Swift compilado, smoke test verde (o fallo explicado de infraestructura) y
   QA en dispositivo registrada en CODEX_LOG con el ID de recepción. Al recibir: marcar este
   handoff como recibido aquí y registrar CW-CX-NNN.

Riesgos abiertos (no resueltos, ver informe §9): medición con Instruments pendiente; posible
mejora futura de servir pósters fuera del hilo principal (descartada por ahora: CSP protegida).

## Historial reciente
- **CI 0.9.4 (CW-CL-031):** run 41497571357 intento 2 — XCTest pasó (590 s), IPA publicado; rojo solo por límite de tiempo de xcodebuild. Presupuestos ampliados (test 840 s, xcodebuild 1320 s, paso 45 min, job 62 min) y relanzado; resultado en CLAUDE_LOG.
- **CW-CL-030 (2026-11-02):** 0.9.4 (13) logo nuevo (SVG trazado), icono, pantalla de inicio con isotipo de Zángano, loader sin coco, «Ver la introducción de nuevo» en Ajustes, vídeos nunca en pila, toque play/pausa y continuidad carta ↔ mantener ↔ anclada. QA en iPhone añadida a CW-HO-005.
- **CW-CL-028 (2026-11-02):** pendientes nativos que eran de Codex, hechos por Claude por falta de cupo (caché de huellas de Vision, codificación concurrente). Publicado en la rama; Swift a validar por CI.
- **CW-CL-027 (rama claude/perf-stability-cotton sobre PR #1, 2026-11-02, publicada):** 0.9.3 (12) rendimiento (una secuencia, mano fija, arrastre sin re-render, persistencia agrupada), Deshacer exacto, progreso real de iCloud compartido con Anclar, avisos en el hueco del nombre, tour común + demo de 4 gestos, textura Cotton Fiber. Pendiente: push autorizado, CI macOS (Swift), iPhone real. Informe: docs/ai-handoff/CLAUDE_PERF_CW-CL-027.md.
- **CW-CL-026 (PR #1, 2026-11-02):** 0.9.2 (11) fondo #F3ECE1 + losa de papel WebP. CI: el simulador sin GPU se atasca con la textura; el workflow la aplana solo en la copia del simulador y la restaura para el IPA. Entrada manual ipa_even_if_smoke_fails publica el IPA aunque falle el smoke test (run en rojo). Pendiente: CI verde e iPhone real.
- **CW-CL-025 (publicado en PR #1, 2026-11-01):** 0.9.1 (10) cabecera de dos filas con wordmark, cápsulas Filtros/Terminar, insignia superpuesta, fondo Warm Paper con textura procedural. Pendiente push autorizado, CI e iPhone.
- **CW-CL-024 (publicado en PR #1, 2026-11-01):** 0.9.0 (9) refinamiento visual + paleta Coco Cream (Coco Mint preparada por tokens). Falta push autorizado, CI macOS y QA en iPhone. Ver CLAUDE_LOG.
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

