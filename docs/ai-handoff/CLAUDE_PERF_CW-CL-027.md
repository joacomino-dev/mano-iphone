# CocoWash 0.9.3 — rendimiento, estabilidad y refinamiento (CW-CL-027)

Fecha: 2026-11-02 · Agente: Claude · Base: `origin/claude/decision-bar-favoritas` 9779e93 (PR #1, 0.9.2) ·
Rama local `claude/perf-stability-cotton`, **sin push** (pendiente de autorización).

Stack real: React 19 + Capacitor 8 en WKWebView, con un plugin Swift (PhotoKit/Vision/AVFoundation).
No hay SwiftUI: las recomendaciones de «invalidaciones de body» se aplican aquí a renders de React.

## 1. Diagnóstico técnico

### Errores confirmados (reproducidos antes de corregir)
| # | Error | Evidencia | Causa |
|---|---|---|---|
| E1 | Deshacer muestra otra foto delante | Demo, 12 × Conservar + 6 × Deshacer: tras el 3.º deshacer se quedaba en la 10 (debía ser 12, 13, 11) | Al restaurar una mano de un grupo se recalculaba la «Mejor toma» sobre el subconjunto y otra foto pasaba delante (`bestFor` por clave de grupo) |
| E2 | El orden dependía de qué imagen terminaba antes | Código (0.7, «Descargar siempre»): `promoted` adelantaba una carta lista de la ventana | Promoción por disponibilidad |
| E3 | Grupos/pesos que llegan en segundo plano cambiaban la mano en pantalla | Código: `natural` se recalculaba del montón en cada render | Mano derivada en vivo, sin fijar |
| E4 | Deshacer «Más tarde» cambiaba el orden de las aplazadas | Prueba unitaria (antes fallaría): `later` se reinsertaba al final | `undo` añadía `wasLater` al final |
| E5 | Animaciones del tour que nunca se reproducían (tarjeta 3) | Muestreo de `transform` en Chromium | `initial={false}` + remontaje por clave con fotogramas clave |
| E6 | La demo de gestos omitía «Más tarde» (abajo) | Código y capturas | Solo 3 direcciones |

### Ineficiencias comprobadas (medidas)
- Cada decisión ordenaba la biblioteca entera 4 veces (`eligible` en cola, mano, ventana y contador): 69 ms con 10 000 elementos y 325 ms con 30 000 (Node).
- Cada movimiento del dedo re-renderizaba toda `ManoApp` (estado `drag`/`peek`/`anchor`), y además había trabajo O(n·m) sin memo (`reviewAssets` con `includes`): 6 ms por movimiento con 10 000 elementos y 41 ms con 30 000.
- Persistencia: dos serializaciones completas del registro por cambio (7 ms con 10 000 elementos y 17 ms con 30 000).
- `ManoApp` se re-renderizaba en cada paso del precargador.

### Ineficiencias comprobadas por código (sin medición posible aquí)
- Deshacer una favorita recargaba toda la biblioteca por el puente con los botones bloqueados.
- El análisis de parecidas se cancelaba al empezar cada sesión y se reiniciaba desde cero (no cachea huellas). En bibliotecas grandes podía no terminar nunca y competía con las miniaturas.
- El análisis ordenaba todas las huellas por cada foto (O(n² log n)).
- Las miniaturas nativas tenían un límite fijo de 60 s que cortaba descargas lentas aunque avanzaran.
- Caché JS de miniaturas sin límite (`library.ts`).

### Riesgos potenciales (no corregidos; ver §9)
Huellas de Vision sin caché persistente · codificación JPEG en una cola serie (la carta visible puede esperar detrás de la precarga) · lectura de archivos del manejador de Capacitor en el hilo principal.

## 2. Arquitectura de fotografías
- **Secuencia canónica**: `orderAssets(assets, orden, semilla)` una vez por biblioteca/orden/semilla; `eligibleFrom` filtra en una pasada lineal por decisión (equivalencia con la ordenación antigua probada sobre 40 bibliotecas aleatorias × 5 órdenes × 3 conjuntos × 2 modos).
- **Mano fija** (`src/sequence.ts`): lo que hay en pantalla queda bloqueado (`HandLock {ids, best}`) hasta que la persona actúa (decisión, «Siguiente», deshacer, filtros). Grupos, pesos, recargas o descargas no la mueven. La «Mejor toma» se elige una vez, al repartir.
- **Historial**: cada decisión guarda la mano **en el orden mostrado** y su `best`; Deshacer la restaura exactamente (registros anteriores se reproducen con su `rotated`). «Más tarde» guarda `laterAt` para volver a su sitio exacto.
- **Ventana**: la mano + unas 6 cartas siguientes (`upcomingFrom`, lineal). Cada carta lee su propia entrada del precargador (suscripción por elemento) y nunca pide a PhotoKit algo que la ventana ya prepara. Cachés acotadas (24 preparadas, 240 respuestas, 48 descargas listas, 80 nítidas).
- **Identidad**: `localIdentifier` + fecha de edición; los resultados tardíos de otra carta no pueden escribir en la visible (claves por asset y trabajos cancelados).

## 3. Rendimiento
Herramientas: Node 22 (dominio) y Chromium headless con CDP (app de la vista previa compilada con N elementos de demo; bancos en el scratchpad de la sesión). **No** hay Instruments, Xcode ni iPhone en este entorno: ninguna cifra es de dispositivo.

Dominio por decisión (Node):

| Elementos | Antes | Después |
|---|---|---|
| 2 000 | 27,9 ms | 2,5 ms |
| 10 000 | 68,8 ms | 8,0 ms |
| 30 000 | 325 ms | 39,9 ms |

Navegador, 10 000 elementos, versión anterior y nueva alternadas (2 ejecuciones cada una):

| Métrica | ×1 antes | ×1 después | CPU ×4 antes | CPU ×4 después |
|---|---|---|---|---|
| Decisión → siguiente tarjeta lista (mediana) | 44 / 38 ms | 29 / 30 ms | 181 / 182 ms | 98 / 108 ms |
| Deshacer → tarjeta lista | 30 / 31 ms | 29 / 29 ms | 138 / 117 ms | 75 / 93 ms |
| Script durante 80 movimientos de arrastre | 340 / 310 ms | 121 / 128 ms | 1 539 / 1 503 ms | 697 / 629 ms |
| p95 de cuadro durante el arrastre | 16,7 ms | 16,8 ms | 33,3 ms | 16,8 ms |
| Inicio → primera foto | 443 / 393 ms | 411 / 436 ms | 1 550 / 1 912 ms | 1 414 / 1 534 ms |

Memoria (Chromium, tras GC): 450 decisiones con 2 000 elementos: antes 7,7 → 8,3 MB y después 7,6 → 8,5 MB. En ambos casos se estabiliza; nodos ~250 y oyentes estables. La primera apertura de la hoja añade unos 490 nodos (queda montada) y después no varía. El crecimiento es igual antes y después: no es una fuga nueva.

Límites: la memoria de imágenes decodificadas en WKWebView, el tiempo de PhotoKit/iCloud y el coste real de WebKit con GPU solo se pueden medir en un iPhone con Instruments.

## 4. iCloud
- **Local primero**: la carta muestra lo que ya está en el iPhone (la vista previa o la «vista ligera») y nunca espera a la red para aparecer. El inicio solo espera a la carta delantera.
- **`cloudPreviews`** (media.ts): un trabajo por foto, como máximo 2 a la vez, con prioridad para la carta visible y la anclada. Pedir de nuevo se une al trabajo en curso.
  - Anclar durante una descarga de tarjeta la espera y luego pide el tamaño mayor (los bytes ya llegaron).
  - Mantener pulsada una foto de iCloud inicia la descarga del tamaño de Anclar, y Anclar se une a ella (en la demo: 36 % → 69 % → lista, sin reiniciar).
  - Se cancela nativamente cuando la foto sale de la ventana o termina la sesión. Al cerrar la vista anclada, la descarga cede la prioridad.
  - Nunca se piden originales, solo tamaños de vista previa.
- **Progreso**: el mismo indicador de iCloud de la carta, con un anillo de progreso **real** de `PHImageRequestOptions.progressHandler`. Es indeterminado hasta que llegan bytes; una respuesta local no muestra nada. Estados: pendiente, descargando, lista (desaparece), reintentando (1 automático tras un fallo transitorio) y error («Reintentar»).
- **Nativo**: el límite de 60 s cuenta desde el último progreso (inactividad), no desde el inicio.

## 5. Mejoras visuales
- **Avisos**: ocupan el hueco del nombre; el wordmark sigue maquetado e invisible, así que la altura, los botones y el progreso no se mueven (medido a 393, 375 y 320 pt). Dos líneas como máximo, duración según la longitud, Reduce Motion sin desplazamiento y texto completo para VoiceOver. Los errores van en una alerta propia persistente.
- **Auditoría de avisos**:
  - Se quitan los redundantes: «Filtros actualizados», «Demostración reiniciada», «Foto recuperada», «Esperando confirmación de Fotos…» (el botón ya lo dice) y «N enviadas a Eliminado recientemente» (lo dice la celebración). Pasan a VoiceOver.
  - Se acortan: sellos ocultos, favoritas que no se eliminan, elementos que ya no están en Fotos, álbum guardado y resultados de la búsqueda.
- **Tour**: una composición común (ilustración y texto como un bloque centrado ópticamente entre el progreso y los botones, separaciones fijas). Antes, el texto empezaba siempre a la misma altura y dejaba huecos de 80 a 238 px.
- **Demo de gestos**: las 4 direcciones reales en el orden de la lista, con la fila activa resaltada.
  - Bloqueo de una ronda (5 s) solo la primera vez, también con Reduce Motion (sin desplazamiento, sello y flecha). Al repetir el tour, sin bloqueo.
  - Botón con `aria-disabled` y relleno que avanza con la demo; aviso «Ya puedes continuar».
- **Cotton Fiber**: fibras finas claras y oscuras, uniformes y mate.
  - Medido: media dentro de ±0,4 niveles de #F3ECE1, σ ≈ 2,3, losa sin costuras.
  - Tokens: `--cw-paper-base`, `--cw-paper-texture` (losa neutra con transparencia, sin color propio) y `--cw-paper-intensity`. El tono sale de la base, así que el modo oscuro cambia base e intensidad.
  - Generador determinista `brand/cotton-fiber.py`. Una capa estática sin filtros ni fusiones. El aplanado del CI sigue funcionando.

## 6. Skills y herramientas
- `code-review` (invocada, nivel medio): 10 hallazgos sobre el diff, todos corregidos (cancelación al salir de la sesión, una descarga duplicada en la inspección, conservación tras deshacer, pesos sin publicar si falla un bloque, versión del precargador, temporizador nativo por progreso, suscripción estable, código muerto y un desempate redundante).
- `coco-mobile-ui` (procedimiento del proyecto, leído y seguido): baseline, contratos, capturas antes/después y validación.
- No existen en este entorno skills de Swift/SwiftUI, profiling, concurrencia ni Instruments; se suplieron con bancos de pruebas medidos. No se usaron subagentes (un solo escritor por archivo).

## 7. Pruebas
- **`npm test`: 82/82**, de las cuales 16 nuevas en `tests/sequence.test.mjs`:
  - 4.1 A→B→C y Deshacer; deshacer varias veces; alternar las 4 acciones y deshacerlo todo; 100 decisiones rápidas.
  - Grupo con «Mejor toma» (regresión E1); «Siguiente» y Deshacer; Favoritas y el corazón en «Favoritas»; posición exacta de «Más tarde».
  - Grupos que llegan tarde; cambio de filtros con Deshacer; restaurar/reanudar sesión; registros anteriores a 0.9.3.
  - Final del búfer y reposición; elemento borrado fuera de CocoWash; equivalencia de la ordenación y de la ventana.
- Comprobaciones del proyecto:
  - `check:runtime`: 28 OK.
  - `build` + Sites: 4/4.
  - `build:native`: OK.
  - Suite Playwright del runtime: 7/8; falla la fixture de BottomSheet, un fallo previo y ajeno a este cambio.
- Navegador (demo):
  - Trazas de Deshacer, antes con fallo y ahora exactas.
  - Recorrido funcional 11/11: gestos en las 4 direcciones, arrastre corto, Deshacer, álbum, Anclar, mantener, revisión, Eliminar (demo), sesión larga y consola sin errores.
  - Estados de iCloud con «Ahorrar» y «Descargar siempre».
  - Bloqueo del tour (primera vez y repetición, con y sin Reduce Motion).
  - Avisos a 3 anchos de pantalla y capturas del tour a 3 tamaños.

## 8. Archivos modificados
`mano/src/sequence.ts` (nuevo), `Cloud.tsx` (nuevo), `ManoApp.tsx`, `Inspector.tsx`, `Onboarding.tsx`, `domain.ts`, `media.ts`, `preload.ts`, `indexer.ts`, `library.ts`, `prototype.css`; `tests/sequence.test.mjs` (nuevo); `brand/cotton-fiber.py` (nuevo); `public/assets/paper-cotton.webp` (sustituye `paper-cream.webp` y `brand/paper-cream-tile.svg`); `ios/App/App/PhotoLibrary.swift` (límite por inactividad, selección de candidatos lineal); `package.json` (script de test); versión 0.9.3 (12); `mano/AGENTS.md`, `CLAUDE_LOG`, `CURRENT_STATE`.

## 9. Cuestiones pendientes
- ~~Swift sin compilar~~: compilado y smoke test verde en CI (run 41399471365). Corrección necesaria por el camino: los vídeos vuelven a prepararse hasta 10 por delante (CW-CL-029).
- **Sin medición en iPhone**: Instruments (Time Profiler, Hitches, Allocations), progreso real de iCloud, textura en Retina/OLED y Dynamic Type real.
- **Hecho después por Claude (CW-CL-028, en lugar de Codex por falta de cupo)**:
  - Caché persistente de huellas de Vision (`Caches/ManoPrints`, una por foto + fecha de edición, podada tras cada pasada completa): repetir o reanudar la búsqueda solo calcula lo nuevo o editado.
  - Codificación JPEG de miniaturas en una cola concurrente: la cola serie sigue respondiendo a la carta visible mientras la ventana codifica.
  - Servir los pósters por `cocowash-media://`: **evaluado y descartado por ahora**. Exige tocar la CSP de `native.html` (protegida desde 0.6) y el beneficio no se puede medir sin iPhone; reabrir solo si Instruments muestra el manejador de Capacitor en el hilo principal.
  - Validado por CI: run 41399471365 (ee86516) verde — Swift compilado, smoke test en simulador superado, IPA generado. Lo único sin verificar sigue siendo el comportamiento en un iPhone real.
- **No cambiado a propósito**:
  - Algoritmo de huella de la biblioteca (cambiarlo relanzaría el análisis completo).
  - Precalentamiento al elegir filtros (≤ 2 descargas, aprobado en 0.7).
  - Las superficies de papel de Polaroid, tour y celebración conservan `paper.png`.
  - `PHCachingImageManager.startCachingImages`: no se usa; la caché de disco y la ventana ya cubren la necesidad.
- Con los órdenes por peso, las cartas *siguientes* pueden reordenarse mientras se miden pesos (la visible no).
- La losa nueva pesa 203 KB frente a 39 KB, con la misma memoria decodificada (1024²); se puede reducir la densidad si hace falta.
