# Vista «Fototeca» (cuadrícula) — propuesta y plan (2026-11-12)

Idea del usuario: ver de un vistazo la foto actual **en su sitio real de la fototeca**, encontrar parecidas que el
agrupador no juntó, ver qué ya tiene sello y decidir **en bloque**. Funciona y se siente como Fotos › Fototeca,
con la personalidad de CocoWash.

## 1. Cómo se usa

| Momento | Comportamiento |
|---|---|
| Entrar | Botón de cuadrícula **a la izquierda de la barra de progreso** (el contador sigue a la derecha). También se puede abrir pellizcando hacia dentro la carta (gesto de «alejar», opcional en una fase posterior). |
| Al abrir | Fototeca completa en **orden real** (como Fotos: lo antiguo arriba, lo reciente abajo), desplazada hasta la foto de la carta, que queda **resaltada** con un aro y un leve pulso. |
| Densidad | **3 o 5 columnas**, celdas cuadradas. Se cambia pellizcando (como Fotos) o con el botón de densidad. Se recuerda. |
| Arriba izquierda | Interruptor **Filtros: sí / no**. Sí = solo lo que entra en la pila con los filtros actuales; No = toda la fototeca. Mismos filtros que el mazo; aquí no se editan. |
| Arriba derecha | **Seleccionar** / **Cancelar** (como Fotos). |
| Cerrar | Botón de cartas (el mismo sitio del botón de cuadrícula) o deslizar hacia abajo desde arriba. Vuelve al mazo exactamente donde estaba. |
| Tocar una celda | Fuera de selección: abre la **vista anclada** de esa foto (zoom, doble toque, deslizar para cerrar), con sus botones de decisión. En selección: marca o desmarca. |
| Seleccionar varias | Modo Seleccionar: tocar celdas o **arrastrar el dedo** por ellas (rango, como Fotos). Mantener pulsada una celda también entra en selección. Marca de selección **arriba a la izquierda** de cada celda. |
| Abajo | Los **mismos controles que la pantalla principal** sobre la selección: Eliminar, ❤ Favorita, Conservar; Deshacer, Más tarde, Álbum. Con 0 seleccionadas, desactivados. Contador «12 seleccionadas». |
| Marcas en cada celda | **Sello pequeño abajo a la derecha** si ya tiene decisión (Conservar con su nivel, Favorita, Eliminar). **Más tarde** va en otra esquina (reloj **abajo a la izquierda**), porque no es una decisión final. Lo que espera borrado se ve atenuado. Vídeo: duración arriba a la derecha (como Fotos). |

Reglas que no cambian: «Eliminar» solo encola; el borrado real sigue en la revisión final con la confirmación de
Fotos. Deshacer deshace el **lote entero** de una vez. Las favoritas se reconsultan antes de borrar.

## 2. Ideas añadidas

1. **Parecidas a esta**: en la vista anclada abierta desde la cuadrícula, un botón «Ver parecidas» filtra la cuadrícula
   a las del mismo grupo de similitud (ya existe el índice de similitud en el teléfono).
2. **Saltar por fechas**: barra de desplazamiento rápido con el mes/año al arrastrar (como Fotos).
3. **Encabezados por mes** pegajosos y discretos («Marzo 2024 · 214»), sin romper el orden real.
4. **Contador de lo liberable** de la selección («Liberarías 340 MB»), con el mismo cálculo de peso que la revisión.

## 3. Cómo hacerlo fluido en el iPhone (lo importante)

- **Virtualización**: solo se pintan las filas visibles más un margen (≈ 3 pantallas). La posición de cada foto se
  calcula por índice (`fila = índice / columnas`), sin medir el DOM. Con 50 000 fotos hay ~50 celdas en pantalla.
- **Miniaturas nativas pequeñas y sin puente por celda**: nueva ruta `cocowash-media://thumb/<id>?px=256` servida
  por el `WKURLSchemeHandler` que ya existe para vídeo. WebKit las pide solo al hacerse visibles y **cancela** las que
  salen de pantalla (`webView(_:stop:)`). Nativo: `PHCachingImageManager` con `deliveryMode = .opportunistic`,
  `resizeMode = .fast`, ~256 px (3 col.) / ~160 px (5 col.), JPEG 0,7 en memoria y **caché LRU** acotada (p. ej. 40 MB).
  `startCachingImages` para la ventana siguiente en la dirección del desplazamiento. Nada se escribe en disco.
- **Desplazamiento nativo** (`overflow: auto` con inercia de iOS). React solo re-renderiza cuando cambia la ventana
  visible (≤ 1 vez por fotograma, con `requestAnimationFrame`), nunca por píxel.
- **Celdas baratas**: `<img decoding="async">`, sin sombras ni filtros, `contain: strict`. Sellos pequeños como un
  sprite ya cargado. La resaltada es la única con animación.
- **Estado**: las decisiones del lote se escriben **una vez** (una transacción al diario y al espejo), no una por foto.
- **Memoria**: al cerrar la cuadrícula se liberan las miniaturas y se detiene el precacheo.
- **Android**: el mismo diseño; miniaturas por `MediaStore.loadThumbnail` servidas igual por el interceptor de la WebView.

Presupuesto de aceptación (iPhone de prueba, 10 000 fotos): abrir < 300 ms hasta ver la foto actual; desplazamiento
rápido a 60 fps sin huecos blancos de más de 1 fotograma tras parar; memoria de la app +60 MB como máximo con la
cuadrícula abierta; seleccionar 200 por arrastre sin saltos.

## 4. Anuncios en la cuadrícula

- **Una franja horizontal** de anuncio nativo que ocupa el ancho de una fila **cada ~10 filas** (≈ 30 fotos a 3
  columnas, 50 a 5), nunca en la primera pantalla ni pegada a la foto resaltada.
- Usa la misma colocación nativa de `CocoMonetization` (se oculta mientras su hueco se desplaza y vuelve al parar,
  como ya hace en el mazo). Etiqueta «Anuncio» visible. Sin anuncios para quien compró la versión sin anuncios.
- En modo Seleccionar, el arrastre **salta** la franja (nunca se puede seleccionar ni tocar por accidente).
- Requiere tu aprobación expresa: cambia la monetización (frecuencia nueva). Se mide antes en el laboratorio de tráfico.

## 5. Fases

| Fase | Contenido | Prueba de aceptación |
|---|---|---|
| F1 | Cuadrícula de solo lectura: abrir/cerrar, posición real y resaltado, 3/5 columnas, sellos pequeños, Más tarde, filtros sí/no, virtualización | Navegador (fixture de 10 000) + gate nativo de memoria/fps |
| F2 | Seleccionar (toque, arrastre, pulsación larga) y acciones en lote con deshacer de lote | Navegador + XCTest de selección por arrastre |
| F3 | Miniaturas nativas por esquema propio con caché LRU y precacheo (iOS, luego Android) | Instruments/gate: memoria y tiempos |
| F4 | Anuncios en franja | Laboratorio de tráfico + revisión de políticas AdMob |
| F5 | Ideas extra (parecidas, saltar por fechas, encabezados, liberable) | Según se aprueben |
