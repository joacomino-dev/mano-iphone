# CocoWash 9.8.3 · revisión final con skills (plan, no ejecutado)

Pedido del usuario (2026-11-05): después de 9.8.2, una revisión completa con
skills para dejar la app elegante, sin «AI slop» en código, interfaz y textos, y
lista para la versión final. Orden: primero los arreglos funcionales pendientes,
después esta revisión. Cada skill trabaja en su ámbito; ninguna cambia lógica de
borrado, permisos ni contratos nativos (AGENTS.md manda).

## Skills y qué hace cada una

| Skill | Estado | Ámbito en CocoWash | Instrucción concreta |
|---|---|---|---|
| `coco-mobile-ui` | instalada | Orquesta todo: marca «Sello y papel», tokens `--cw-*`, contratos UI | Abrir cada pasada con ella; decide ante conflicto visual. |
| `ui-ux-pro-max` | instalada | Accesibilidad, tacto, jerarquía, checklist previa a entrega | Pasar su checklist (119 pautas) por pantalla: pila, foto anclada, resumen, «Una última mirada», Filtros, Ajustes, Apoyo, intro, vídeo. Objetivos táctiles ≥ 44 pt, contraste AA, Dynamic Type 130 %, Reduce Motion. Informe P1/P2/P3. |
| `styleseed` | instalada | Consistencia visual: jerarquía plana, acento sin elegir, iconos, escalas, hex sueltos | Flujos de auditoría y puntuación sobre `prototype.css` y `monetization.css`: hex fuera de tokens, tamaños fuera de escala, radios y sombras repetidos. Sin `setup/resolve/migrate/update`. |
| `frontend-design` | instalada | Dirección estética, tipografía con carácter | Revisar las pantallas que aún parecen plantilla (Ajustes largos, avisos, hojas) y proponer variantes antes de implementar. |
| `swiftui-pro` | instalada | Swift nativo (`PhotoLibrary.swift`, `CocoMonetization.swift`) | Concurrencia Swift 6, APIs obsoletas, VoiceOver y Reduce Motion de la carta nativa, Dynamic Type de sus textos. |
| `/simplify` | integrada en Claude Code | Código: duplicados, ramas muertas, CSS sobrescrito por capas (9.8, 9.8.1, 9.8.2) | Consolidar los bloques añadidos al final de `prototype.css` en sus secciones; quitar `DRAWN_STAMPS`, `.dock-zoom` y estilos de variantes retiradas; acortar `ManoApp.tsx`. Sin cambiar comportamiento. |
| `/code-review` | integrada | Errores reales en el diff de 9.8.x | Nivel high sobre la rama; verificar con pruebas cada hallazgo. |
| Nickture interface (por instalar) | catálogo | Reglas comprobables de interfaz y señales de diseño generado por IA | Pasada «deslop» de interfaz tras `styleseed`; sus textos rusos no aplican. |
| unslop (por instalar) | catálogo | Textos en inglés sin tono de IA | Revisar `locales/en.ts` y la ficha de la App Store en inglés. |
| asodev (por instalar) | catálogo | Localización y fichas de App Store, compras, privacidad | Fichas en es/en/fr/ar/ja, revisión de traducciones en contexto («qué hace y cómo se dice allí»), productos de compra y etiquetas de privacidad. |

No existe en el catálogo una skill llamada «ponytail»; la limpieza de código la
cubren `/simplify` y `/code-review`. Si el usuario da el nombre exacto u origen,
se revisa su licencia y se añade a `.claude/skills/` como las demás.

## Orden de trabajo para 9.8.3

1. `/code-review` (high) → arreglar lo confirmado.
2. `/simplify` → consolidar CSS y componentes; pruebas y capturas iguales antes/después.
3. `ui-ux-pro-max` + `styleseed` + Nickture → informe de interfaz; corregir P1/P2.
4. `frontend-design` → solo pantallas marcadas como genéricas; el usuario elige.
5. `swiftui-pro` → nativo.
6. unslop + asodev → textos y traducciones en contexto; fichas de tienda.
7. Pruebas, capturas en 5 idiomas, CI, IPA 9.8.3.
