# CocoWash — estado operativo conocido

Actualizado: 2026-11-04, America/Bogota. Codex trabaja solo por indicación del usuario.

## Entrega vigente — 0.9.7 / 18

Etapa 1 aceptada por el usuario. Etapas 2–7 implementadas en esta misma rama por autorización expresa; detalle en [OPTIMIZATION_097](../ai-handoff/OPTIMIZATION_097.md). 106 tests Node, runtime28, TypeScript, builds y QA demo pasan. Commits por etapa, integración y compilación nativa nuevas pendientes al preparar este estado. No hay IPA nuevo todavía; el anterior de Descargas es solo etapa 1. **No reutilizar ese binario para esta entrega Swift.** Main intacto, sin merge ni instalaciones adicionales. Codex único escritor.

## Etapa 1 completada local — Codex

**Trabajo vigente:** usuario acepta etapa 1 y autoriza implementar conjuntamente etapas 2–7 el 2026-11-04, en esta misma rama `codex/stage1-review`. Codex único escritor: previews/caché, guardado, índice, preferencias, vídeo y Vision/planificación. Sin cambios visuales ni merge a main. Un commit por intervención; pruebas automáticas y compilación nativa nueva requeridas antes del IPA final. No reutilizar el binario anterior si cambia Swift. Base recuperable 24fb03d y previo IPA conservados.

**IPA entregado en Descargas:** `C:/Users/Joaco/Downloads/CocoWash-0.9.6-etapa1-143a1d84-web.ipa` (5.546.336 bytes), recibo JSON adyacente. Se compilaron los assets web de 143a1d8 y se empaquetaron sobre el binario arm64 del CI verde 41530807373 (1586a37). Comparación Git confirma Swift, recursos nativos, configuración y dependencias idénticos; solo versiones 0.9.5/16→0.9.6/17 y script de tests cambian. SHA256 IPA `a415a8832f54dca34ae48bedc6cbf5f91cb16faffc020dad24420eea39d5f1a9`. 28 recursos nativos preservados y 64 archivos web verificados, CRC y textura PASS. **No es una nueva compilación Swift ni QA física.** AltStore debe firmarlo. Script/recibo en carpeta externa de evidencia. Full CI 41885957816 sigue aparte; no confundir sus resultados con este paquete. Main intacto, etapa 2 no iniciada.

Fallback vigente de CI: `macos-15` ARM y Xcode 26.3. El run 41873983543 con macos-15-intel falló sin adquirir máquina; se conserva evidencia y no se cambia código de aplicación.

Fallback de compilación: macOS 26 ARM también permaneció sin runner durante 10 minutos y se canceló antes de arrancar (41872183811). GitHub declaró incidencia Actions/Pages ese día. Se prueba `macos-15-intel`, estándar gratuito con Xcode 26.3 preinstalado, conservando todos los gates y checkout SHA. La app requiere iOS 17 y no usa APIs nuevas de iOS 26.6 en PhotoLibrary. Sin cambiar fuentes de app ni main.

Corrección de distribución autorizada tras dos fallos de asignación Intel: Codex modifica únicamente workflow y documentación en la rama de etapa 1. Runner estándar gratuito `macos-26` ARM, Xcode 26.6 preinstalado, checkout fijado a github.sha. Se conservan smoke y condiciones del IPA. No integrar main ni avanzar etapa 2. Evidencia de imagen: https://github.com/actions/runner-images/blob/main/images/macos/macos-26-arm64-Readme.md . Compilación nueva pendiente al preparar esta corrección.

Actualización CI: intento 1 de 41859212044 falló antes de obtener runner (`The job was not acquired by Runner of type hosted even after multiple attempts`); sin steps ni logs de compilación. Usuario pidió revisar/corregir. Reintento solo del job iOS aceptado, intento 2 en cola, nuevo job 126699082386. Sin cambios de aplicación ni workflow, main intacto. Descarga automática reactivada; IPA todavía pendiente. Error anterior preservado con sufijo attempt1.

Usuario autorizó el 2026-11-04 publicar únicamente la etapa 1 en rama `codex/stage1-review` y ejecutar el workflow macOS gratuito, sin fusionar main. Preparando compilación; IPA aún pendiente. Destino solicitado: Descargas. No generar IPA si falla el smoke test.

Publicada en `d9da8aaf3a342f000ade4bbfaa18a37a674f05ed`; [CI 41859212044](https://github.com/joacomino-dev/mano-iphone/actions/runs/41859212044) confirmado en cola. Main remoto permanece en `3cc28d2`. Tarea local oculta `C:/Users/Joaco/Developer/CocoWash-stage1-evidence/finish-ipa.ps1` espera hasta 90 minutos y descarga únicamente si el run termina success. Verifica código etapa 1, textura, estructura IPA y hash de copia; recibo `ipa-receipt.json` o error `ipa-download-error.json` en esa carpeta. Archivo previsto en Descargas: `CocoWash-0.9.6-etapa1-d9da8aaf.ipa`, sin firma para AltStore. Descarga todavía no acreditada al registrar. Este párrafo queda local para no cambiar el SHA seleccionado por CI.

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

