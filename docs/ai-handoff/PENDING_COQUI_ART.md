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

## 2. Arte nuevo integrado (usuario, 2026-11-10) y espacios que siguen pendientes

Integrado (recortado al dibujo y exportado a WebP con Edge/canvas, sin redibujar; originales en `brand/`):

| Ilustración del usuario | Uso | Archivo en la app | Fuente conservada |
|---|---|---|---|
| Coqui tirando una foto al basurero | Sello «Eliminar» (recorrido, arrastre, estampado) | `mano/public/assets/stamps/discard.webp` (479×480) | `mano/brand/stamps/discard-source.png` |
| Coqui abrazando un corazón | Sello «Favorita» | `mano/public/assets/stamps/favorite.webp` (477×480) | `mano/brand/stamps/favorite-source.png` |
| Coqui apoyado en un reloj | Sello «Más tarde» | `mano/public/assets/stamps/later.webp` (480×479) | `mano/brand/stamps/later-source.png` |
| Coqui enjabonándose (principal) | Splash de arranque junto al lettering y héroe de la tarjeta 1 | `mano/public/assets/characters/coqui-hero.webp` (631×900) | `mano/brand/characters/coqui-hero-source.png` |
| Coqui con la caja fuerte | Privacidad (tarjeta 4, «Tus fotos no salen de tu iPhone») (`coqui-safe`) | `mano/public/assets/characters/coqui-safe.webp` (900×682) | `mano/brand/characters/coqui-safe-source.png` |
| Coqui en la piscina de burbujas | Fin de ronda sin borrar y pila vacía tras decidir (`coqui-calm`) | `mano/public/assets/characters/coqui-calm.webp` (720×611) | `mano/brand/characters/coqui-calm-source.png` |

La caja fuerte llegó después como archivo aparte (el primero era la piscina); la piscina pasó a las
pantallas tranquilas.
El sello «Eliminar» anterior (basurero sin personaje) se conserva en `mano/brand/retired/discard-trash/`.
El candado de la tarjeta de privacidad (ya existente) queda sobre el borde de la piscina; ajustable en
`.ob-privacy .ob-lock` (`mano/src/prototype.css`) si el usuario lo prefiere en otro sitio.

Siguen pendientes (`PENDING_ART` en `mano/src/Characters.tsx`; muestran una pose de Coqui existente):

| Espacio | Pantalla | Archivo a integrar | Temporal |
|---|---|---|---|
| `coqui-review` | Fondo tranquilo de «Una última mirada» | `mano/public/assets/characters/coqui-review.webp` | `coqui-photos` |
| `coqui-wonder` | Pila vacía sin nada que mostrar | `mano/public/assets/characters/coqui-wonder.webp` | `coqui-shrug` |

Para integrar: recortar a esa ruta, añadir `'<espacio>': [ancho, alto]` en `POSES` y borrar la entrada de
`PENDING_ART`. Las pantallas «Preparando tus fotos» y el resumen tras «Eliminar» muestran a Coqui solo.

## 3. Fuera de la app (no modificado en esta rama, pendiente de decisión)

Mencionan a Memo: `docs/apple-readiness/storefront/metadata.json` (texto promocional en 7 idiomas),
`docs/appstore/listing.md`, `docs/appstore/screenshots.md`, `docs/playstore/listing.md`,
`docs/playstore/graphics.md`. Las 28+28 capturas de tienda ya generadas muestran a Memo y deberán
regenerarse tras integrar el arte nuevo. Documentación histórica (`mano/AGENTS.md`, `brand/README.md`) se conserva.
