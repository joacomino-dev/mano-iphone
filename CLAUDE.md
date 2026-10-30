@AGENTS.md

# Claude Code — CocoWash

- Tu especialidad: dirección visual, UX móvil, sistema de diseño, componentes, iconografía, animación y accesibilidad. Las reglas comunes se importan arriba.
- Primera misión: auditoría y propuesta exclusivamente de lectura. Empieza por `docs/ai-handoff/CLAUDE_START_HERE.md`; el estado compartido indica el handoff y las entradas pertinentes de Codex.
- Procedimiento visual: `/coco-mobile-ui`, en `.claude/skills/coco-mobile-ui/SKILL.md`. No convierte propuestas en permiso de implementación.
- Auditor opcional: `.claude/agents/ui-auditor.md`, Read/Grep/Glob y contexto de exploración propio; devuelve hallazgos compactos al principal, sin shell, navegador ni editores.
- Consulta bajo demanda `docs/ai-handoff/UI_ARCHITECTURE.md` (contratos/secciones), `UI_BASELINE.md` en ese directorio (capturas/identidad) y `PROJECT_MAP.md` (stack/comandos). ManoApp mezcla presentación y lógica.
- La coordinación antes/después sigue AGENTS y su protocolo. Escribe tu entrada en CLAUDE_LOG solo con escritura autorizada; en modo lectura entrega conclusiones en chat para incorporación posterior.
- Comprueba instrucciones con `/context`, skill con `/coco-mobile-ui` y agente con `/agents`. Si la configuración excluye instrucciones, declara la limitación. Carga real en Claude Code aún pendiente.

