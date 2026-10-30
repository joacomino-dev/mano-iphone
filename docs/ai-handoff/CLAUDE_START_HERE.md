# CocoWash — comienzo de Claude Code

Primera misión: **AUDITORÍA VISUAL Y PROPUESTA DE REDISEÑO**, solo lectura.
La app organiza fotos/vídeos mediante decisiones rápidas y recuperables.
«Lo que importa, se queda»: fresca, cercana, desenfadada y reconocible.

## Incorporación y lectura mínima

1. Confirmar `/context`: CLAUDE.md importa AGENTS.md de raíz. Al entrar en mano,
   mano/CLAUDE.md importa mano/AGENTS.md. Leer la guía móvil completa para esta
   primera auditoría; no duplicar reglas en el informe.
2. [CURRENT_STATE](../ai-collaboration/CURRENT_STATE.md), handoff CW-HO-001 y
   entradas relevantes de [CODEX_LOG](../ai-collaboration/CODEX_LOG.md).
   [PROTOCOL](../ai-collaboration/PROTOCOL.md) define lectura, cierre y entregas;
   después bastan estado + entradas pertinentes, no toda la documentación.
3. [PROJECT_MAP](PROJECT_MAP.md): stack, dos entradas, plataformas y comandos.
4. [UI_ARCHITECTURE](UI_ARCHITECTURE.md): componentes, READ/WRITE/PROTECTED y
   referencias concretas de callbacks/bridge. [UI_BASELINE](UI_BASELINE.md):
   recursos, clasificación de decisiones y siete capturas existentes.
5. Inspeccionar solo fuentes de pantallas afectadas; `mano/brand/README.md` para
   marca y `mano/src/mobile/COMPONENTS.md` cuando importe el runtime protegido.

App en mano/: React 19.2.7, TS 7.0.2, Vite 8.1.3, Capacitor 8.6.0 y Swift
PhotoKit/Vision. ManoApp contiene composición/estado; Filters, Inspector e
InlineVideo separan partes de UI con lógica propia. No router URL. Preview
simulada y entrada nativa comparten app, pero sheets/teclado difieren. Android
sin plugin y iPad sin destino habilitado; no atribuir soporte nativo al preset Pixel.

## Primera misión y libertad creativa

Comprender la identidad actual, no imponerla como definitiva. Teal/papel/sello
y mascota son baseline con aprobación histórica revisable; tamaños, tipografías,
proporciones y microinteracciones no quedan aprobados por estar implementados.
UI_BASELINE distingue aprobación, provisional y propuesta pendiente. Puedes
cuestionar lo actual y recomendar alternativas con razones y tradeoffs; no
introducir una dirección nueva en código ni generar imágenes en esta auditoría.

Revisar capturas y componentes: proporciones, jerarquía, consistencia de iconos,
tokens/estilos, accesibilidad, interacción, animación funcional/reduced motion,
experiencia iPhone-first y adaptación futura iPad/Android. Evitar UI genérica,
efectos decorativos innecesarios y convenciones de landing web aplicadas al móvil.
No confundir chrome protegido con contenido de CocoWash.

Entregar hallazgos priorizados, archivo/línea y evidencia, clasificados como
**comprobado / inferencia razonable / hipótesis pendiente**. Recomendar dirección
visual, reutilización de componentes, piloto (sesión de cartas es sugerencia,
no elección obligatoria) y plan progresivo con archivos/secciones, riesgos y
aceptación. No cambiar negocio, PhotoKit, permisos, persistencia, borrado,
favoritas, álbumes, precarga, gestos ni integraciones. Propuesta visual no autoriza
cambiar contratos. Primera entrega concluye en diagnóstico para revisión.

## Herramientas y evidencia

`/coco-mobile-ui` usa `.claude/skills/coco-mobile-ui/SKILL.md`.
Auditor opcional `.claude/agents/ui-auditor.md`: contexto propio, Read/Grep/Glob,
sin shell/edición/navegador; devuelve hallazgos al principal. Si no puede leer
imágenes declara límite. La allowlist debe comprobarse en `/agents`; no protege
el agente principal. No usar subagentes por tareas pequeñas ni duplicar exploración.

Siete PNG demo verificadas: UI_BASELINE las enlaza. No nuevas capturas necesarias
para empezar, ni evidencia de Photos/iCloud/Live Photo nativo por ver la demo.
No acceder a fotos personales. Comandos/tests y alternativas Windows en PROJECT_MAP;
auditoría documental no exige builds, sync:ios ni instalar herramientas.

## Coordinación y entrega posterior

Verificar Git real, propietario y archivos antes de modificar algo en futuras
intervenciones. Hoy main conserva cambios previos; no commits, ramas, worktrees,
stash/reset/clean, instalaciones ni aplicación. El protocolo explica base común
y worktrees futuros: bitácoras/cambios no se sincronizan solos.

Esta auditoría no escribe ni CLAUDE_LOG ni CURRENT_STATE; entrega en chat. Después,
con escritura autorizada, incorporar conclusiones con autor/fecha/referencia,
como propuesta no implementada. Futuras intervenciones relevantes autorizadas
añaden entrada CW-CL-NNN en CLAUDE_LOG y actualizan estado/handoff según PROTOCOL.
No atribuir recepción o integración al otro agente sin evidencia.

## Comprobación local pendiente

No se encontró `claude` en PATH; no se probó carga real ni acceso a cuenta.
Abrir Claude Code manualmente en la raíz Git y comprobar `/context`, skill y
`/agents`. La importación oficial evita depender de la lectura opcional de
AGENTS, sin modificar configuración privada. Políticas que excluyan instrucciones
de proyecto deben declararse. No se instalaron hooks, MCP ni skills externas.
Falta npm en PATH para suite runtime; no bloquea leer capturas/fuentes ahora.

## Prompt definitivo

```text
Inicia la primera misión de CocoWash: AUDITORÍA VISUAL Y PROPUESTA DE REDISEÑO.

Confirma las instrucciones cargadas por CLAUDE.md/AGENTS.md y la guía móvil.
Lee docs/ai-handoff/CLAUDE_START_HERE.md, consulta el estado compartido y toma
el handoff CW-HO-001 siguiendo sus referencias. Usa /coco-mobile-ui.

Trabaja exclusivamente en lectura: no modifiques aplicación, documentación,
bitácoras, Git ni herramientas. Examina las siete capturas y componentes
relevantes; evalúa proporciones, estilos, iconos, interacción, animación,
accesibilidad e iPhone-first, considerando futura adaptación a iPad/Android.

Distingue comprobado, inferencia e hipótesis. Cuestiona decisiones visuales
provisionales y propone alternativas coherentes con la marca; la estética
existente no es definitiva. Conserva todos los contratos funcionales/nativos.

Entrega diagnóstico priorizado con archivo/línea/evidencia, dirección visual
razonada, piloto y plan progresivo con riesgos y aceptación. Explica qué deberá
retomar Codex. Presenta conclusiones para mi revisión y espera aprobación.
No registres esta auditoría en archivos; las futuras intervenciones autorizadas
seguirán el registro y handoff de PROTOCOL.md.
```

