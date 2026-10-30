# Protocolo Codex ↔ Claude

Canal: archivos y entregas controladas por el usuario. No hay mensajes automáticos
ni sincronización de sesiones. `CURRENT.md` conserva el historial técnico previo;
no era un estado compacto con bitácoras de agentes. No duplicar su contenido.

## Fuente de verdad y lectura mínima

Código y Git real → implementación/integración; documentación técnica → contratos;
[CURRENT_STATE.md](CURRENT_STATE.md) → resumen **conocido**, fechado y por checkout;
[CODEX_LOG.md](CODEX_LOG.md) / [CLAUDE_LOG.md](CLAUDE_LOG.md) → historial de decisiones.
Una bitácora no demuestra integración en otra rama. Contrastar discrepancias.

Antes de afectar trabajo existente: leer estado, handoff y entradas pertinentes
del otro agente (buscar ID/componente o últimas 40–80 líneas); comprobar ruta,
`git status --short`, rama, HEAD y diff del alcance. Consultar solo documentación
técnica necesaria. La primera incorporación usa CLAUDE_START_HERE; una corrección
menor no requiere releer todos los documentos ni una auditoría completa.

## Responsabilidad, conflictos y cierre

Codex: arquitectura, dominio, almacenamiento, permisos, integración, mantenimiento
y depuración. Claude: dirección visual, UX, componentes, tokens, iconos, animación,
adaptación y accesibilidad iPhone-first. UI_ARCHITECTURE delimita archivos mixtos;
la especialidad no concede permiso de cambiar contratos. Propuestas artísticas
pueden cuestionar lo actual; implementación espera revisión del usuario.

Un escritor por archivo/checkout. Antes de escribir anotar propietario/tarea y
secciones en CURRENT_STATE si hay posible solapamiento. ManoApp, CSS, AGENTS y
CURRENT_STATE son puntos frecuentes de conflicto. Es una reserva documental,
no un lock técnico. Trabajo inesperado o base cambiada: conservar ambas versiones,
detener escritura afectada y acordar propietario con usuario; continuar trabajo
independiente. Actualizar estado durante tareas largas solo por cambio material
de alcance, entrega o bloqueo, no por cada operación.

Al cerrar: revisar archivos/diff, validar lo pertinente, añadir entrada propia,
actualizar estado y comunicar resultados/pasos al usuario. Solo Markdown requiere
enlaces, coherencia, formatos y preservación de fuente; no repetir builds sin
cambio de código/config. UI aprobada requiere checks y comparación conductual/
visual; cambios nativos tienen gate propio. No llamar completa una entrega con
requisitos pendientes; diferenciar completada local, pendiente de integrar e integrada.

## Bitácoras y decisiones

Añadir al final, cronológico, ID `CW-CX-NNN` o `CW-CL-NNN` (sufijo de rama si hay
colisión). Preferir <150 palabras, enlazar evidencia, no copiar código/logs enteros.
Una sola plantilla canónica para ambas bitácoras:

```text
### ID — título
Fecha: ISO local con zona
Agente: Codex | Claude
Tarea:
Estado: en curso | completada local | bloqueada | pendiente de integrar | integrada
Base Git / commit: checkout/rama + SHA; indicar dirty y SHA de entrega si existe
Archivos modificados:
Cambios realizados:
Decisiones relevantes: aprobada/provisional/propuesta + evidencia/fecha
Validaciones: ejecutadas/resultados; pendientes separados
Impacto para Claude: ... [en entradas Claude: Impacto para Codex]
Pendientes: ... [handoff/destinatario si aplica]
```

Claude concreta pantallas, reutilización, tokens, iconos, animación, contratos y
decisiones artísticas en esos campos. No registrar operaciones triviales; corregir
entradas pasadas mediante otra entrada referida. Estado se resume, no acumula historia.
Auditoría estrictamente de lectura: conclusiones en chat, sin escribir registros.
La siguiente intervención con escritura autorizada puede incorporarlas, citando
autor/fecha/informe y dejando claro «propuesta, no implementada/no integrada».

## Handoff y aceptación

CURRENT_STATE identifica `CW-HO-NNN`, emisor → receptor, lista/recibida/bloqueada/
integrada, objetivo, archivos/secciones, dependencia, evidencia/base, siguiente
paso y aceptación esperada. La entrada de bitácora referencia ese ID. Receptor
verifica base y, con escritura autorizada, marca recibida al empezar; en auditoría
solo lectura reconoce la recepción en chat, sin cambiar archivos. Integrada exige diff/commit y
checks en destino, no basta aprobación de la idea.

Si Claude necesita cambiar una operación para un componente: documentar contrato
actual, operación requerida/razón, archivos y comprobación esperada; dejar lo
funcional para Codex. Codex devuelve contrato/API y evidencia de validación para
continuar UI. El mismo esquema sirve para una petición visual de Codex a Claude.
No dejar «revisar diseño» sin acción/evidencia ni atribuir aceptación no recibida.

## Git: trabajo secuencial y simultáneo

Ahora: secuencial sobre el checkout actual; siguiente agente ve cambios locales,
pero verifica que coinciden con estado. Sin commits, ramas, worktrees, stash,
reset, clean, restore ni traslado en esta preparación/primera auditoría.

Más adelante, con autorización explícita del usuario:

1. Detener escritores, inventariar Git/untracked. Preparar copia recuperable local
   fuera de OneDrive de repositorio completo, `.git`, índice y archivos locales
   necesarios; verificar hashes/lectura y privacidad. Patch no guarda todos los
   untracked; bundle no guarda cambios sin commit. No subir secretos/cachés.
2. Usuario revisa qué conservar y autoriza base común/commit con los cambios
   CocoWash e instrucciones deseados. HEAD antiguo no incluye el trabajo sucio.
3. Crear worktrees con herramientas del entorno desde ese SHA, ramas distintas
   (prefijo `codex/` para Codex), dependencias/puertos/outputs separados. Git comparte
   objetos/refs, pero no índice ni árbol de trabajo; cambios locales/logs no viajan.
4. Cada agente registra entrega/base en su rama. Un integrador designado (Codex
   por defecto) mantiene CURRENT_STATE del checkout de integración. Reservas/logs
   en otra rama no se ven hasta transferirse: acordar propiedad con usuario antes
   de paralelizar, no editar compartidos sin conocer el alcance del otro.
5. Transferir commits revisados mediante merge/cherry-pick autorizado, incluyendo
   log/documentación. Sin commit, acordar primero entrega; no copiar archivos por
   encima de cambios ajenos. No usar OneDrive como integración Git.
6. En conflictos conservar entradas por ID, recomponer CURRENT_STATE desde Git
   integrado y revisar código con dueño del contrato/usuario. No elegir ours/theirs
   a ciegas ni auto-resolver permisos, borrado o persistencia. Checks después de
   resolver; registrar SHA integrado y actualizar base del otro worktree.

## Windows y OneDrive

No se diagnosticaron corrupción ni locks. Son riesgos: sincronización de `.git`
no es transaccional; muchos archivos temporales/dependencias, rutas largas,
archivos abiertos u online-only pueden afectar herramientas. Gitignore no configura
OneDrive. Evitar dos equipos escribiendo el mismo repositorio sincronizado.
Para trabajo paralelo aporta ventaja un checkout canónico y worktrees fuera de
OneDrive, por ejemplo `C:/Users/Joaco/Developer/CocoWash`: menos churn y dependencia
del sincronizador. Propuesta, no directorio creado ni migración realizada.
Si se aprueba: copia verificada primero, base común después, checkout nuevo desde
esa base y transferencia explícita de todo trabajo aún local. Comparar fuente,
índice y untracked antes de declarar nueva ruta única canónica; vieja copia queda
respaldo inactivo identificado, no segundo checkout editable ni se borra. No dejar
worktrees externos dependiendo del `.git` sincronizado como solución definitiva.

## Descubrimiento y herramientas (consulta ocasional)

Codex descubre AGENTS.md de raíz y alcance móvil; no depende de imports Claude.
Claude raíz usa `@AGENTS.md`; mano/CLAUDE.md importa su AGENTS local. Sin symlinks
ni imports de logs/protocolo: lectura a demanda. Imports resuelven desde archivo
importador. Con CLAUDE presente, el modo reciente por defecto puede omitir AGENTS;
import explícito evita depender de eso. Verificar `/context`; no elude políticas
que excluyan instrucciones de proyecto. No se ejecutó Claude en esta revisión.

Skills útiles disponibles: project-bootstrap, skill-creator, token-efficiency y
openai-docs. Frontend-craft/ui-ux-pro-max servirán para UI futura; understand-anything
o archify solo si exploración/diagramas lo justifican. No crear skill de coordinación:
este protocolo es canónico. coco-mobile-ui lo complementa sin copiarlo. ui-auditor
declara Read/Grep/Glob; confirmar carga efectiva. No restringe al agente principal.

Hooks Claude evaluados: SessionStart podría recordar estado; Stop no equivale a
tarea completa y SessionEnd no acredita entrega. No se implementan: poco beneficio
frente a Markdown, Claude no disponible y fragilidad extra Windows. Ningún hook
Claude se presume compatible con Codex; aquí Codex usa AGENTS y cierre manual.

Ahora bastan capturas demo/fuente. Después: frontend-design oficial para dirección
web adaptada a móvil (no landing pages); Figma MCP solo con diseño autorizado;
inspección navegador/Playwright para demo y XCTest/VoiceOver/texto ampliado para
iPhone. Motion ya existe, no añadir motor de animación. TS/IDE primero, LSP extra
solo ante necesidad. No instalar nada para la primera auditoría.

Fuentes oficiales consultadas 30-10-2026:
[Claude imports](https://code.claude.com/docs/en/memory),
[skills](https://code.claude.com/docs/en/skills),
[subagentes](https://code.claude.com/docs/en/sub-agents),
[hooks](https://code.claude.com/docs/en/hooks),
[Codex AGENTS](https://learn.chatgpt.com/docs/agent-configuration/agents-md),
[Git worktree](https://git-scm.com/docs/git-worktree),
[OneDrive](https://support.microsoft.com/en-us/onedrive/restrictions-and-limitations-in-onedrive-and-sharepoint),
[frontend-design oficial](https://claude.com/marketplace/plugins/frontend-design).
