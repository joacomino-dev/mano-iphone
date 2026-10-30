---
name: coco-mobile-ui
description: Auditar y preparar cambios visuales de CocoWash conservando lógica y contratos nativos. Usar para UX, componentes, accesibilidad o microinteracciones; no para cambios de dominio, datos o compilación.
---

# Procedimiento de UI de CocoWash

Rutas desde raíz. Sigue las instrucciones cargadas por CLAUDE.md/AGENTS.md.
Antes de afectar trabajo existente consulta docs/ai-collaboration/CURRENT_STATE.md
y entradas pertinentes de Codex; coordinación canónica en PROTOCOL.md del mismo
directorio. Primera incorporación: docs/ai-handoff/CLAUDE_START_HERE.md.

1. Consulta sistema visual existente: UI_BASELINE, CSS, brand/README y capturas.
   Trata la apariencia actual como baseline revisable: propón alternativas
   coherentes con «Lo que importa, se queda», sin implementar antes de revisión.
2. Identifica pantalla/componente y escenario demo concreto.
3. Revisa dependencias y mapa READ/WRITE/PROTECTED de UI_ARCHITECTURE; delimita
   JSX frente a callbacks/estado sensible en archivos mixtos.
4. Detecta inconsistencias de jerarquía, espaciado, iconos, adaptación y acceso;
   distingue evidencia visual de hipótesis y declara pantallas no renderizadas.
5. Prioriza reutilizar componentes y patrones vigentes antes de duplicarlos.
6. Presenta propuesta con archivos/secciones, contratos conservados, riesgos y
   aceptación. Primera misión es solo diagnóstico: espera revisión/aprobación.
7. Solo tras aprobarse, implementa presentación en alcance permitido. No alteres
   permisos, lógica, persistencia, gestos, precarga, PhotoKit ni borrado. No
   modifiques runtime protegido, dependencias o configuraciones para facilitar UI.
8. Valida comandos reales de PROJECT_MAP: pruebas, integridad, builds y recorrido
   conductual pertinente. Registra bloqueos sin debilitarlos; Swift requiere macOS.
9. Compara capturas demo antes/después en viewport/preset/estado equivalentes,
   movimiento normal y reducido cuando sea posible. Nunca uses fotos personales.
10. Comunica cambios, validaciones, evidencia y pendientes; transfiere necesidades
    funcionales a Codex según PROTOCOL. Con escritura autorizada registra intervención
    relevante en CLAUDE_LOG y actualiza estado; auditoría solo lectura informa
    en chat sin editar registros. No copies el protocolo dentro de esta skill.

No instalar plugins/MCP/dependencias ni crear commits/ramas sin informar y obtener
la autorización indicada. Un solo escritor por checkout. El auditor ui-auditor
puede apoyar lectura, pero la skill no concede permisos ni constituye sandbox.
