# Ilustraciones pendientes de Coqui — retirada de Memo (2026-11-10)

Rama: `claude/retire-memo` (aislada, sin publicar). Fase de rediseño: **no iniciada**; se hará
externamente y con aprobación del usuario. Aquí solo se retiró a Memo y se prepararon los espacios.

## 1. Recursos retirados (movidos con `git mv`, historial conservado, nada borrado)

| Recurso activo antes | Dónde se usaba | Ahora en |
|---|---|---|
| `mano/public/assets/characters/coqui-memo.webp` | Recorrido tarjeta 1 (héroe) y splash de arranque | `mano/brand/retired/memo/app-assets/characters/` |
| `mano/public/assets/characters/memo-calm.webp` | Recorrido tarjeta 4 (privacidad), fin de ronda sin borrar, pila vacía tras decidir | ídem |
| `mano/public/assets/characters/memo-cards.webp` | Pantalla «Preparando tus fotos» (pareja con Coqui) y fondo de «Una última mirada» | ídem |
| `mano/public/assets/characters/memo-dance.webp` | Resumen tras «Eliminar» (pareja con Coqui) | ídem |
| `mano/public/assets/characters/memo-wonder.webp` | Pila vacía sin nada que mostrar | ídem |
| `mano/public/assets/stamps/favorite.webp` | Sello «Favorita» (Memo en el corazón): recorrido, arrastre y estampado | `mano/brand/retired/memo/app-assets/stamps/` |
| `mano/public/assets/stamps/later.webp` | Sello «Más tarde» (Memo pensando con reloj) | ídem |
| `mano/brand/stamps/favorite-source.webp`, `later-source.webp` | Fuentes de esos sellos (`cut-stamps.py`) | `mano/brand/retired/memo/source/stamps/` |
| `mano/brand/characters/coqui-memo-model.png`, `memo-model-sheet.png` | Fuentes de los recortes | `mano/brand/retired/memo/source/characters/` |

Textos retirados (7 idiomas): «Coqui y Memo te ayudan…» → «Coqui te ayuda a ordenar tu carrete con
decisiones rápidas. Tú eliges qué se queda.» (EN «Coqui helps you tidy your camera roll with quick
decisions. You choose what stays.») y «Memo revisa tu fototeca…» → «Revisando tu fototeca en el iPhone…»
(también la variante Android «Revisando tu galería en el teléfono…»).

**Sin Memo y sin cambios:** sellos «Conservar» (Coqui) y «Eliminar» (basurero), icono de la app y lettering
CocoWash, isotipo Zángano, poses de Coqui existentes, lógica de niveles (sellos I–VIII).

## 2. Espacios preparados y archivo que debe integrarse en cada uno

Mecanismo: `mano/src/Characters.tsx` → `PENDING_ART`. Cada espacio muestra una pose de Coqui ya
existente (temporal) hasta que llegue su archivo. Para integrar: recortar sin redibujar la ilustración
aprobada a la ruta indicada, añadir `'<espacio>': [ancho, alto]` en `POSES` y borrar la entrada de `PENDING_ART`.

| Espacio | Pantalla | Archivo a integrar | Temporal actual |
|---|---|---|---|
| `coqui-hero` | Recorrido tarjeta 1 («Lo que importa, se queda.») | `mano/public/assets/characters/coqui-hero.webp` | `coqui-photos` |
| `coqui-calm` | **Privacidad (tarjeta 4): Coqui meditando**; fin de ronda sin borrar; pila vacía tras decidir | `mano/public/assets/characters/coqui-calm.webp` | `coqui-think` |
| `coqui-review` | Fondo tranquilo de «Una última mirada» | `mano/public/assets/characters/coqui-review.webp` | `coqui-photos` |
| `coqui-wonder` | Pila vacía sin nada que mostrar | `mano/public/assets/characters/coqui-wonder.webp` | `coqui-shrug` |
| `splash-hero` | Splash de arranque (antes «Coqui lavando a Memo» junto al lettering) | `mano/public/assets/characters/splash-hero.webp` y volver a renderizarlo antes del lettering en `mano/src/Splash.tsx` | solo lettering |
| Sello `favorite` | «Favorita» en recorrido, arrastre y estampado (`mano/src/Stamp.tsx` → `ART`) | `mano/public/assets/stamps/favorite.webp` (fuente `mano/brand/stamps/favorite-source.webp`, recortar con `cut-stamps.py`) | `pending-favorite.svg` |
| Sello `later` | «Más tarde» (ídem) | `mano/public/assets/stamps/later.webp` (fuente `mano/brand/stamps/later-source.webp`) | `pending-later.svg` |

Los sellos temporales (`mano/public/assets/stamps/pending-{favorite,later}.svg`) reutilizan la marca de
decisión que la app ya usa en botones (`DecisionIcon`) sobre un sello crema con contorno de tinta; no son
arte nuevo ni definitivo y se borran al integrar. Las pantallas «Preparando tus fotos» y el resumen tras
«Eliminar» quedan con Coqui solo (la pareja se reduce a él); si el arte nuevo vuelve a ser una pareja, se
añade en `mano/src/Screens.tsx` (`character-pair`).

## 3. Fuera de la app (no modificado en esta rama, pendiente de decisión)

Mencionan a Memo: `docs/apple-readiness/storefront/metadata.json` (texto promocional en 7 idiomas),
`docs/appstore/listing.md`, `docs/appstore/screenshots.md`, `docs/playstore/listing.md`,
`docs/playstore/graphics.md`. Las 28+28 capturas de tienda ya generadas muestran a Memo y deberán
regenerarse tras integrar el arte nuevo. Documentación histórica (`mano/AGENTS.md`, `brand/README.md`) se conserva.
