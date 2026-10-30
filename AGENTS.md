# CocoWash — instrucciones comunes de agentes

- App en `mano/`. Antes de planear cambios móviles lee `mano/AGENTS.md` completo; arquitectura/comandos en `docs/ai-handoff/PROJECT_MAP.md`, contratos UI en `docs/ai-handoff/UI_ARCHITECTURE.md` (según alcance).
- Coordinación: si la tarea afecta trabajo existente, lee `docs/ai-collaboration/CURRENT_STATE.md`, entradas pertinentes de la bitácora del otro agente y comprueba Git antes de escribir. Sigue `docs/ai-collaboration/PROTOCOL.md`; registra intervenciones relevantes en tu bitácora y actualiza estado al entregar. Auditoría estrictamente de lectura no escribe registros.
- «Lo que importa, se queda»: organizar fotos/vídeos con decisiones rápidas, sencillas y entretenidas; personalidad fresca, cercana, desenfadada y reconocible. Evitar plantillas genéricas, proporciones pobres, iconografía inconsistente y efectos sin función.
- Teal/archivo, papel marfil y sello rojo son el punto de partida, no una restricción artística permanente. Se permiten alternativas razonadas; implementar requiere revisión del usuario. Decisiones/evidencia en `docs/ai-handoff/UI_BASELINE.md`.
- Procesamiento en dispositivo. Sin APIs de pago, telemetría, subidas de fotos, suscripciones ni runners de pago. Nunca publicar fotos personales, credenciales Apple, certificados, cachés o sesiones locales.
- PhotoKit/Vision mediante Capacitor. Preview con runtime Product Design protegido; no montar chrome simulado en la app instalada ni debilitar sus hashes.
- Descartar encola y permite recuperar; nunca borrar desde swipe. Eliminar solo desde revisión y confirmación de Fotos, reconsultando favoritas. QA de borrado/recuperación solo con demo; nunca confirmar borrados en biblioteca personal.
- Conservar bundle, claves, permisos y contratos nativos. Cambios funcionales fuera de una tarea visual requieren alcance/autorización explícitos.
- Checks desde `mano/`: `npm test`, `npm run check:runtime`, `npm run build`, `npm run build:native`; variantes/límites en PROJECT_MAP. `npm run sync:ios` genera fuentes; Windows no verifica Swift, que requiere el workflow macOS público gratuito.
- No sobrescribir trabajo ajeno ni usar stash/reset/clean/restore para resolver conflictos. En esta preparación y primera auditoría: sin commits, ramas, worktrees, instalaciones ni cambios de aplicación. Paralelismo espera base recuperable revisada y autorización.
- El usuario autorizó `joacomino-dev/mano-iphone` público, CI estándar gratuito y distribución personal. No equivale a permiso para publicar cada entrega o actuar en el teléfono.
