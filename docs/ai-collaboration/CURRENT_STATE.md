# CocoWash — estado operativo conocido

- Actualizado: 2026-10-30, America/Bogota. Snapshot local, no estado en tiempo real.
- Checkout: `C:/Users/Joaco/OneDrive/Documentos/ChatGPT/iPhone`; main,
  HEAD `0a6d32d65d273b1408ef79bedc728acf9579fad1`, dirty. Inventario de Fase 0:
  31 rutas staged, 3 unstaged (solapan), 27 untracked. Encima, sin stage: rediseño
  CW-CL-002 en mano/src/{ManoApp.tsx,Filters.tsx,prototype.css} + docs. No commit; remoto no consultado.
- Último Claude: CW-CL-003 (render nativo simulado, 2 correcciones CSS) sobre CW-CL-002, rediseño visual completo «Sello y papel» autorizado por
  el usuario e implementado en local. Checks Node PASS; capturas solo de la demo. Informe
  [CLAUDE_REDESIGN](../ai-handoff/CLAUDE_REDESIGN_CW-CL-002.md).
- Último Codex: CW-CX-003, recepción, revisión técnica, orden aprobado actualizado
  y Fase 0 completada. Sin cambios a aplicación, assets, configuración ni dependencias.
- Activas/reservas: Claude liberó ManoApp/Filters/prototype.css al entregar. Codex reserva revisión de semántica
  Favoritos/cartas, alcance Reduce Motion, contratos nativos, lógica de avisos y QA.
- Protección: respaldo externo verificado en
  `C:/Users/Joaco/CocoWash-Backups/20261030T173452Z-pre-redesign/`.
  ZIP con .git/índice/fuentes/locales, SHA256 por archivo y restauración aislada;
  git fsck/HEAD/refs/stage/status correctos. Documentos finales en handoff-addendum.
  Excluye dependencias/build/cachés/work/outputs y no respalda Fotos ni datos iPhone.
- Pendiente integrar: trabajo previo y entregas Codex/Claude sin commit. Copia local
  permite trabajo secuencial recuperable; no autoriza commits ni paralelismo.
- Bloqueo vigente: ninguno para revisar. Integrar requiere revisión del diff por
  Codex, QA en macOS/simulador (hoja nativa, VoiceOver, Dynamic Type, vídeo) y
  autorización de commit. Playwright test:runtime no se ejecutó.
- Próximo: Codex recibe CW-HO-003 y revisa el diff mixto y sus dependencias.

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

