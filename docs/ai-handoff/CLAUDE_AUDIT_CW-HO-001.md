# Auditoría visual CW-HO-001 — Claude, 2026-10-30

**Propuesta, no implementada ni integrada.** El usuario revisó el diagnóstico el
2026-10-30 y autorizó registrarlo. No hay autorización para implementar: primero
la Fase 0 (base recuperable) y las decisiones abiertas de la §5. Registro:
CW-CL-001 en [CLAUDE_LOG](../ai-collaboration/CLAUDE_LOG.md).

**Alcance y evidencia.** Solo lectura de las siete PNG de
[reference/2026-10-30](reference/2026-10-30/), `mano/src/{ManoApp,Filters,Inspector,InlineVideo}.tsx`,
`prototype.css`, `styles.css` (BottomSheet), `brand/README.md`, `palette.json` y los
documentos de handoff/colaboración. Sin render nuevo, sin medición instrumental de
contraste, sin VoiceOver ni Dynamic Type. `git` no estaba en PATH: `.git/HEAD` →
`main` → `0a6d32d…`, coincide con CURRENT_STATE. No se pudo verificar el estado
dirty con Git. Las líneas citadas corresponden a ese árbol local; antes de editar,
buscar por símbolo.

Leyenda: **[C]** comprobado (código/captura) · **[I]** inferencia razonable · **[H]** hipótesis pendiente.
Rutas de código: `mano/src/`.

## 1. Diagnóstico priorizado

### P1 — Semántica y seguridad percibida

1. **El rojo significa tres cosas distintas.** [C] `.finish` (Finalizar sesión,
   navegación no destructiva) usa `var(--red)` sólido (prototype.css:95); el
   botón Eliminar de sesión (cola reversible) también (`.discard`, :38/:99); y
   `Eliminar N` (borrado real con confirmación de Fotos) usa el mismo `#B44238`
   (:104). Captura 02: el botón más saturado es «Finalizar sesión». [I] Diluye la
   señal de peligro donde importa y hace que terminar parezca arriesgado.
2. **Mismo verbo e icono para la cola y el borrado real.** [C] Sesión: «Eliminar»
   + `TrashIcon` (ManoApp:241) y etiqueta de arrastre `ELIMINAR` (:236); revisión:
   «Eliminar N» + `TrashIcon` (:251). El primero solo encola (UI_ARCHITECTURE,
   contrato 1). [I] Contradice «nunca borrar desde swipe» en el lenguaje.
3. **«Iniciar sesión» / «Finalizar sesión».** [C] ManoApp:65, :221. [I] En
   español de apps significan *log in / log out*; la app no tiene cuentas.
   [C] Ningún test de `mano/tests` depende de estos textos.

### P2 — Pantalla de cartas (02/07)

4. **Once controles con peso plano.** [C] ManoApp:221–242. Los botones de bundle
   (CSS:79/:99) comparten borde y tamaño con «Filtros». [I] No se distingue lo
   primario (decidir) de lo secundario.
5. **Favorita parece ya marcada.** [C] `HeartIcon weight="fill"` siempre, sin
   `aria-pressed` (ManoApp:242, CSS:100). [I] Lee como estado; además escribe en
   Fotos al instante.
6. **Aviso del mascot sobre el badge de bundle.** [C] Globo de BrandStatus en
   `top:54px` (CSS:96) tapa «Bundle · 5 similares» (capturas 04 y 07).
7. **Progreso casi invisible.** [C] 3px, opacidad .6 (CSS:97).
8. **«Bundle» en inglés, mono 11px.** [C] ManoApp:225, CSS:78/99.
9. **Feedback de swipe genérico.** [C] `.hand-space.keep/discard/favorite`
   (ManoApp:223) sin CSS; solo rótulo rotado (CSS:53).
10. **«Conservar» con icono de archivador.** [C] `ArchiveIcon` (ManoApp:241).
    [I] «Archivar» evoca ocultar; `StampIcon` (ya importado) dice «se queda».

### P2 — Hojas (03/04/05)

11. **Hoja blanca en preview.** [C] Blanco y título weight 900 vienen de
    `styles.css:645–684` (runtime PROTECTED); Plex solo carga 400/500/600
    (ManoApp:14–17) → [I] título sintetizado/otra familia. [C] En nativo la hoja
    es propia (`.native-sheet`, `#f9f8f3`, CSS:60/68): preview y iPhone difieren.
12. **Descripción genérica repetida.** [C] Prop fija en `Sheet` (ManoApp:45).
13. **Revisión: orden y peso.** [C] Eliminar → Deshacer todo → grid → nota iCloud
    → Continuar → Finalizar y guardar. La nota que cualifica el borrado queda
    lejos del botón (ManoApp:251); tres botones llenos de peso similar; grid de
    2 columnas con un elemento deja medio vacío. «Eliminar primero» es aprobación
    histórica (mano/AGENTS.md:99).
14. **Filtros: CTA fuera de vista; controles mixtos.** [C] Captura 03 sin
    «Aplicar» (sticky `bottom:-25px`, CSS:104); chips + `<select>` (Filters:23–24).

### P3 — Sistema, tipografía, accesibilidad, movimiento

15. **Sin tokens; cascada de 4+ generaciones.** [C] `:root` (:1) vs `.mano-app`
    (:91) con `--ink` distinto; `.archive-header` ×3, `.finish` ×3; ~60 hex
    literales; 5 rojos. `--ink` CSS = teal, pero palette.json `ink` = `#122D2E`.
    [C] Sin consumidor en .tsx: `archive-tabs`, `toast`, `hold-hint`,
    `session-controls`, `fan`. [I] Muertos; confirmar antes de borrar.
16. **Tipografía diminuta y fija.** [C] 9–12px en eyebrow, welcome-fine,
    access-indicator, bundle, Finalizar, ambient-toggle, geek; todo px.
    [H] Sin respuesta a Dynamic Type en WKWebView.
17. **Contraste de límites.** [I] Bordes `#c2d2c960`/`#b5c9be50` sobre teal
    (CSS:94/:79) probablemente <3:1. [H] Medir.
18. **Reduced motion incompleto.** [C] BrandStatus anima sin `useReducedMotion`
    (ManoApp:55); el CSS (:61) no afecta a Motion JS. [I] Spinners congelados.
19. **Etiqueta de carta engañosa.** [C] «Centro para pasar; borde para
    seleccionar» (ManoApp:232); cartas traseras `inert`. Alternativas por botón OK.
20. **Marca infrautilizada.** [C] Bienvenida usa solo mascot compacto 64px y
    wordmark como texto (ManoApp:62); brand/README recomienda ilustración completa
    a tamaño grande. «Pausar animación» huérfano; Filtros icono-solo vs con texto.
21. **Colores de sello fuera de marca.** [C] Azul/morado (ManoApp:18). [H] Sin captura.
22. **iPad/Android.** [C] Sin `max-width`. [H] Botones ~700px en iPad. Pixel (07)
    se adapta, sin plugin Android.

**Conservar:** objetivos ≥44px; alternativas por botón a todos los gestos;
tamaño de carta por aspecto; focus-visible; trap de foco del inspector; copys de
revisión honestos.

## 2. Dirección propuesta: «Sello y papel»

Evolución, no ruptura: teal/papel/mascot se mantienen; cambia el significado.

- **Rojo = sello e irreversibilidad**: solo sello y `Eliminar N`; «Terminar» en papel/contorno.
- **Descartar ≠ Eliminar**: sesión en coco `#AF6742` (palette) con icono no-papelera
  (Phosphor ya instalado); revisión conserva papelera + rojo.
- **Conservar = sellar**: `StampIcon`; al arrastrar aparece el sello real
  (`stamp-red.png` en máscara, como `.seal`).
- **Copys**: «Empezar a revisar»/«Continuar», «Terminar», «5 parecidas»;
  descripción propia por hoja.
- **Jerarquía en tres capas**: foto → decisión → utilidades (corazón en contorno
  con `aria-pressed`); controles de bundle adosados a la carta.
- **Tipografía**: IBM Plex, escala 12/13/15/17/22/34 en `rem`, mínimo 12; Mono ≥11 solo contadores.
- **Tokens semánticos** en `.mano-app` (color, espacio 4-pt, radios 8/12/20,
  2 sombras, duraciones) en un bloque único de prototype.css.
- **Movimiento funcional**; `MotionConfig reducedMotion="user"` en raíz; con reduce, progreso/texto en vez de spinner.
- **iPad/Android**: contenedor `max-width` ~520px; sin prometer soporte nativo.

Alternativa no recomendada ahora: fondo papel con teal como acento (rompe foto
sobre oscuro y obliga a rehacer marca/icono). Explorable con mock.

## 3. Piloto: sesión de cartas

- `prototype.css`: tokens + `.archive-header`, `.finish`, `.archive-progress`,
  `.bundle-*`, `.decision-buttons`, `.archive-tools`, `.drag-label`, `.photo-card`.
- `ManoApp.tsx` solo JSX de sesión (~221–242) y BrandStatus (~55): textos, iconos,
  classNames, `aria-label`. Sin tocar `act`, `start/move/end/cancel`, `undoLast`,
  umbrales, `disabled`, IDs, condiciones ni callbacks.
- `aria-pressed` de Favorita y etiqueta de carta: semántica → Codex.

**Aceptación:** `npm test`, `check:runtime`, `build`, `build:native` verdes;
capturas demo antes/después (iPhone, Pixel; reduce y normal; selección, bundle,
aviso, arrastre) con parámetros de capture.json; texto ≥4.5:1, límites ≥3:1,
objetivos ≥44px; rojo solo en sello y `Eliminar N`; sin colisión aviso/badge;
diff de ManoApp revisado por Codex.

## 4. Plan progresivo

| Fase | Contenido | Archivos | Riesgo |
| --- | --- | --- | --- |
| 0 | Base recuperable autorizada | Git (Codex/usuario) | Mezclar rediseño con trabajo sin commit |
| 1 | Tokens + piloto sesión | prototype.css, JSX sesión | Cascada; probar ambas entradas |
| 2 | Hojas: revisión, filtros, álbum, descripciones | JSX hojas, Filters, CSS | Sheet preview ≠ nativo; teclado |
| 3 | Bienvenida, inspector, vídeo, vacío/error | Welcome, Inspector, InlineVideo, CSS | Lógica PROTECTED intercalada |
| 4 | Limpieza CSS, `rem`, contenedor iPad, Dynamic Type/VoiceOver | prototype.css; native.css requiere autorización | Consumidores ocultos; macOS |

Cada fase: checks + capturas, aprobación del usuario, CW-CL-NNN y CURRENT_STATE.

## 5. Decisiones abiertas del usuario

- **Hoja blanca de preview — RESUELTA 2026-10-30 por el usuario:** se acepta el
  cabecero blanco del runtime (styles.css sigue PROTECTED, sin sobrescribirlo
  desde prototype.css) y se tematiza solo el cuerpo (`.mano-sheet-body` y su
  contenido), con tokens compartidos con `.native-sheet`. Las descripciones por
  hoja siguen siendo prop de la app.
- **Orden de revisión — RESUELTA 2026-10-30 por el usuario:** se autoriza
  reordenar; sustituye la nota histórica de mano/AGENTS.md:99 («Eliminar/Deshacer
  todo primero»). Orden objetivo: resumen → descartes (grid + pista de
  recuperar) → `Eliminar N` con «Recién borrados 30 días» y nota iCloud junto al
  botón → `Deshacer todo` secundario → Continuar / Finalizar y guardar. Solo
  cambia el orden y la jerarquía del JSX: mismos callbacks (`commitDelete`,
  `restore`, cierre), una única confirmación de Apple, sin confirmación propia.
- Cambiar copys no rompe tests, pero sí los guiones de captura de UI_BASELINE.

## 6. Para Codex

1. Verificar Git real y preparar base recuperable (Fase 0).
2. Revisar diffs de ManoApp/Filters/Inspector como propietario funcional.
3. Decidir `aria-pressed` de Favorita (`state.favorites`), etiqueta de carta,
   `MotionConfig` en raíz y cola/posición de avisos de BrandStatus.
4. QA nativo en macOS/simulador: hoja nativa, teclado de álbum, VoiceOver,
   Dynamic Type, vídeo inline; solo demo para descartar/recuperar.
5. Actualizar guiones de UI_BASELINE si cambian textos.
