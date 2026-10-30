# CocoWash — estado operativo conocido

- Actualizado: 2026-10-30, America/Bogota. Snapshot local, no estado en tiempo real.
- Remoto: `origin/main` contiene CocoWash 0.4 (Codex), los arreglos del runner Intel,
  el rediseño «Sello y papel» (8e73093) y los documentos de colaboración/handoff.
- Checkout: `C:/Users/Joaco/OneDrive/Documentos/ChatGPT/iPhone`; main local sincronizada
  con origin/main + **1 commit local sin push** (mano/CLAUDE.md y mano/tools/). Ver CW-HO-004.
  Sin publicar a propósito: `CURRENT.md` (notas operativas privadas de Codex, sin seguimiento).
- Último Claude: CW-CL-005, publicación y preparación de la compilación. Antes: CW-CL-002/003
  (rediseño y render nativo simulado). Informe [CLAUDE_REDESIGN](../ai-handoff/CLAUDE_REDESIGN_CW-CL-002.md).
- Último Codex: CW-CX-003, recepción, revisión técnica, orden aprobado actualizado y Fase 0 completada.
- Protección: respaldo externo verificado en
  `C:/Users/Joaco/CocoWash-Backups/20261030T173452Z-pre-redesign/` (estado previo al rediseño).
- CI: run iOS [41124449495](https://github.com/joacomino-dev/mano-iphone/actions/runs/41124449495)
  sobre 8e73093, en curso al cerrar Claude; resultado sin consultar. Un push que toque `mano/**`
  en main cancela el run en curso del mismo ref (`cancel-in-progress`).
- Pendiente: revisión del diff por Codex (CW-HO-003), QA en dispositivo (hoja nativa, VoiceOver,
  Dynamic Type, vídeo), release/IPA verificado. Playwright test:runtime no se ejecutó.
- Próximo: Codex recibe CW-HO-004 y lanza la compilación.

## CW-HO-004 — compilación lista para lanzar, Claude → Codex

**Lista, no recibida.** main local = origin/main + 1 commit local (mano/CLAUDE.md, mano/tools/
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

