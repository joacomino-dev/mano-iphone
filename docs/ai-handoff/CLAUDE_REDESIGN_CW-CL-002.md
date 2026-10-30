# Rediseño «Sello y papel» — CW-CL-002 (Claude, 2026-10-30)

**Implementado localmente, sin commit ni integración.** Autorizado por el usuario
como rediseño visual completo. Base: main `0a6d32d` dirty (Fase 0 en
`C:/Users/Joaco/CocoWash-Backups/20261030T173452Z-pre-redesign/`). Cambios sin
stage en `mano/src/{ManoApp.tsx,Filters.tsx,prototype.css}`. El diff de ManoApp
ocupa unas 85 líneas; `prototype.css` se reescribió entero. Capturas en
[reference/2026-10-30-redesign](reference/2026-10-30-redesign/) (solo demo).

## Sistema visual (`mano/src/prototype.css`)

Un único archivo, sin redefiniciones en cascada. Los tokens van en `:root` con el
prefijo `--cw-`, porque las hojas se renderizan en portales fuera de `.mano-app`.

| Grupo | Tokens |
| --- | --- |
| Paleta | `teal-950…600`, `paper / paper-light / paper-dim / paper-edge`, `red / red-deep`, `coconut / coconut-deep`, `pink`, `yellow`, `green` (palette.json + derivados) |
| Semánticos | `bg`, `on-bg / -soft / -faint`, `line-on-bg / -strong`, `ink / -soft / -faint`, `line / line-strong`, `sheet`, `sheet-native`, `field`, `action-primary`, `action-danger`, `keep`, `discard`, `stamp-keep / -discard / -favorite`, `favorite`, `error-bg / -ink`, `focus`, `focus-on-light` |
| Tipografía | IBM Plex Sans 400/500/600 + Mono 500. `text-xs 12 · sm 13 · md 15 · lg 17 · xl 22 · display 36` en rem. Mínimo: 12 px |
| Espacio / forma | `space-1…8` (rejilla de 4 pt), `radius-xs 3 · sm 8 · md 12 · lg 16 · pill`, `shadow-1`, `shadow-2`, `shadow-press` |
| Toque | `touch 44`, `control 48`, `decision 56` |
| Movimiento | `ease cubic-bezier(.2,.8,.2,1)`, `fast .12s · base .2s · slow .32s` |

Contraste calculado a partir de los tokens (WCAG; no se midió sobre píxeles renderizados):

- **Texto:** on-bg 9.2, on-bg-soft 7.2, on-bg-faint 4.5, ink/paper 11.9, ink-soft/blanco 6.6, ink-faint/blanco 5.2 y texto sobre rojo 5.2.
- **Bordes:** line-on-bg 3.6 (3.1 sobre teal-700) y line-strong/blanco 3.4.

**Selectores eliminados.** Antes de quitarlos se comprobó con grep que ningún `.tsx` los usa. El CSS de la entrada nativa sigue intacto:

- `archive-tabs`, `fan`, `toast`, `hold-hint`, `session-controls`, `archive-brand`, `brand-icon`, `live-dot`, `seal-filter`
- `error-note`, `inspect-overlay`, `confirm-block`, `welcome-error`

## Componentes y jerarquía de botones

- **Primario sobre teal:** botón de papel (`start-session`, `keep`, `primary-empty`, `finish`).
- **Secundario sobre teal:** contorno (`header-filters`, `segmented`, `tool-icon`).
- **Neutro de decisión:** `discard`, en teal-700.
- **En hojas:**
  - `sheet-action`: teal sólido, primario.
  - `.secondary`: contorno.
  - `.quiet`: solo texto.
  - `.danger`: rojo, **solo para `Eliminar N`**.
- **Nuevos patrones:**
  - `segmented`: «Elegir todas | Siguiente».
  - `tool-icon`: círculo de 44 px en Deshacer, Favorita y Álbum.
  - `finish-count`: contador de descartes dentro de «Terminar».
  - `progress-count`.
  - `row-icon` y `album-new` en la lista de álbumes.
  - `sheet-footer`.
  - `field-label` (para «Orden», ahora con chips).
  - `notice-dot`.
  - `sr-only`.
  - Chevron de `details` en filtros.
- **Iconos Phosphor, una sola familia y peso coherente.** Cambios:
  - ArchiveIcon y la papelera de la sesión se eliminan.
  - `ArrowUUpLeft` sustituye a ArrowCounterClockwise en «Deshacer».
  - `HeartStraight` en contorno sustituye al corazón relleno.
  - `FolderSimplePlus` para «Álbum».
  - `Stack` en el distintivo de parecidas.
  - `CornersOut` para «Ampliar».
  - `Pause` y `Play` en el control de la animación de bienvenida.
  - TrashIcon se queda solo en `Eliminar N`.
- **Sellos:** `colors` mantiene los nombres de `LEVELS` (Blanco…Dorado) con tintes ajustados al papel.

## Pantallas

| Pantalla / estado | Estado | Evidencia |
| --- | --- | --- |
| Bienvenida | Rediseñada: mascota completa, cabecera con Filtros etiquetado, «Empezar a revisar»/«Continuar revisión», el control de pausa se oculta con Reduce Motion | 01 |
| Sesión de cartas | Rediseñada: «Terminar» en papel con contador, progreso visible, «N parecidas», segmentado, Descartar neutro / Conservar papel, utilidades en tres círculos iguales | 02, 02b, 07 |
| Swipe | Sello «Conservar/Descartar/Favorita» con opacidad según la distancia + anillo del color del sello | 08, 09 |
| Vídeo inline / Live | Botón de reproducción en papel, insignia LIVE; la reproducción real no se validó | 10 |
| Filtros | Cuerpo tematizado, Orden en chips, CTA fijo visible, interruptores de 51×31, calendario | 03, 03b, 03c |
| Álbumes / crear | Filas con icono, «Crear álbum nuevo» destacado, campo con tokens | 04, 04b |
| Revisión | Nuevo orden aprobado, nota de Fotos/iCloud junto a `Eliminar N`, cuadrícula de 3 columnas, pie «Seguir revisando / Terminar sin eliminar» | 05, 05b |
| Inspector | Barra de herramientas en píldora, «Cerrar» en papel, gancho con tokens; Geek no capturado | 06 |
| Vacío «Todo en su sitio» | Mascota como celebración | 11 |
| Vacío sin conexión, errores, preparación y progreso | Rediseñados en CSS/JSX, **sin renderizar** (la demo no los produce) | — |
| Hoja nativa (Radix) | Tokens, descripción en la cabecera, animación de entrada con Reduce Motion; **sin renderizar** | — |

## Movimiento

- **Salida direccional de cartas** (`cardExit`, AnimatePresence `custom = state.history.at(-1)`):
  - Conservar sale a la derecha y Descartar a la izquierda, en 0,34 s.
  - Favorita sale hacia arriba.
  - Cualquier otra retirada (filtros, deshacer, terminar) se desvanece en 0,16 s.
  - Durante la salida se aplica `pointerEvents: none`.
  - Con Reduce Motion no hay movimiento. Fotogramas 12 y 13.
- **Entrada de carta:** opacidad + 16 px + escala .97, con un spring de 380/34.
- **BrandStatus:** `useReducedMotion` local, intercambio mascota↔aviso de ~10 px y fundido; sin desplazamiento con Reduce Motion.
- **Botones:** escala .97 de 120 ms al pulsar.
- **Progreso:** transición de anchura.
- **Paso a la sesión:** entrada `cw-rise`.
- **Hoja nativa:** deslizamiento y fundido.
- **Reduce Motion en CSS:** cubre la app, los cuerpos de hoja y la hoja nativa. Los spinners quedan estáticos, pero siempre acompañados de texto («Preparando X de Y», «Abriendo tus fotos…»).

## Los 22 hallazgos

Resueltos: 1, 2, 3, 5 (visual), 6, 7, 8, 9, 10, 12, 13, 15 y 21 (tintes).

Parciales o pendientes:

- **4:** se mantienen todas las acciones, porque no se pueden eliminar funciones; la jerarquía queda en tres capas.
- **11:** la cabecera del runtime sigue en blanco con peso 900, como se decidió.
- **14:** «Sellos» sigue siendo un `select`, con estilo propio, porque tiene 10 opciones.
- **16:** la escala está en rem, pero Dynamic Type no está activo; requiere el `html` de `native.css` (Codex).
- **17:** contraste calculado sobre tokens, no medido en píxeles; los controles superpuestos a fotos no se midieron.
- **18:** sin `MotionConfig` global (reservado a Codex).
- **19:** solo se cambió el texto de la etiqueta; la semántica la revisa Codex.
- **20:** el wordmark sigue siendo texto, por nitidez.
- **22:** columna de 520 px a partir de 600 px de ancho, sin renderizar.

## Diferencias entre preview y app instalada

- `styles.css` (runtime protegido) aplica `box-shadow: none !important` y `outline: 0` a `.device-screen *:focus`.
  - En la preview, los anillos de foco no se ven.
  - Por eso los anillos de swipe y de selección se hicieron con pseudo-elementos.
  - Los focos de teclado solo se pueden validar en la app instalada.
- La cabecera de la hoja de preview es blanca, con título de peso 900 y otra familia tipográfica; en la app instalada se usa `.native-sheet` con tokens.
- Las capturas son de la demo: no prueban WKWebView, safe areas, el teclado nativo, PhotoKit, iCloud ni Live Photo.

## Para Codex

1. **Revisar el diff mixto de `ManoApp.tsx`:**
   - Tres literales de aviso dentro de `act`, `closeSession` y `undoLast`.
   - `cardExit`/AnimatePresence lee `state.history.at(-1)` y no escribe nada.
   - `finish-count` lee `state.pending`.
   - Nueva prop `description` en `Sheet`.
   - JSX de revisión reordenado con los mismos handlers.
   - Etiquetas accesibles de carta, favorita y selección.
   - Sin cambios en `act`/gestos/umbrales/IDs/`disabled`/precarga.
2. **Decidir:**
   - `MotionConfig` global.
   - Dynamic Type (`html{font:-apple-system-body}` o equivalente en `native.css`).
   - `aria-describedby` de la hoja nativa: ahora hay un `<p>` de descripción sin vincular.
   - Semántica de la carta.
3. **QA en macOS/simulador:**
   - Hoja nativa, foco visible, VoiceOver.
   - Pantallas cortas (SE), texto ampliado.
   - Vídeo inline, Live Photo.
   - Salida de cartas en WKWebView.
4. **Revisar el 404 de consola:** ya aparecía antes del rediseño en la preview; no es un `pageerror`.
5. **Guiones de captura:** UI_BASELINE §Repetición se actualizó con los nuevos textos; el script de captura de Claude estaba fuera del repo, en su scratchpad.

## Anexo CW-CL-003 — render de la entrada nativa con puente simulado

`dist/native` servido con `vite preview` y Capacitor **simulado** en el navegador:
`window.webkit.messageHandlers.bridge` + `Capacitor.PluginHeaders/nativePromise`
devolviendo 24 assets sintéticos y `lake.png`. `deleteAssets` lanza error a propósito.
Script y capturas en [reference/2026-10-30-redesign/native-mock](reference/2026-10-30-redesign/native-mock/).
Edge, DPR 2, Reduce Motion, tamaños 375×667 (SE), 375×812 (mini), 430×932 (Pro Max)
y 820×1180 (iPad). **No es WKWebView**: no hay safe areas reales, teclado nativo, PhotoKit ni VoiceOver.

Hallazgos corregidos en `prototype.css` (solo CSS):

1. **CTA fijo de filtros en la hoja nativa:** `position:sticky` respeta el relleno
   inferior del contenedor con scroll, así que el botón quedaba 24 px por encima del borde
   y el contenido asomaba debajo (`before-fix-se-filters.png`). Ahora `.native-sheet .filter-apply`
   compensa con `bottom`/`margin-bottom` negativos y su propio relleno.
2. **Hoja nativa en pantallas ≥600 px:** ocupaba todo el ancho; ahora `max-width:560px`
   centrada, alineada con la columna de 520 px.

Comprobado sin incidencias: bienvenida, sesión, filtros, álbumes y revisión en SE e iPad;
estados «Preparando 0 de 10», permiso denegado (aviso de error) y «Acceso limitado».
Sin desbordamiento horizontal y ningún control interactivo por debajo de 44 px en los cuatro tamaños.
Hallazgo 22 pasa a resuelto en demo. Sigue sin renderizar: estado vacío «Tu carrete, en tus manos»
(solo aparece si la conexión inicial no llega a completarse), panel Geek y teclado del álbum.
