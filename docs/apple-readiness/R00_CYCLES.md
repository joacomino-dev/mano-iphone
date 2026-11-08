# R-00 — recurrencia entre rondas, CW-CX-021

Base actualizada: main `f5c3546`. Windows/Node24/Edge, biblioteca sintética400.
**R-00 sigue abierto para aceptación física**: sin Mac/Instruments ni acceso de QA
al iPhone, no se puede acreditar la desaparición de la lentitud reportada.

## Fallo reproducido y corrección

Diez ciclos descartar4 → confirmar en puente → terminar → background/foreground →
nueva ronda provocan11 búsquedas globales,4.180 IDs enviados a `analyze`. Una pasada
completa deja de coincidir con el fingerprint al desaparecer IDs; la aplicación
relanza Vision sobre todos los restantes aunque sus versiones no cambiaron.
El Swift inspeccionado desarchiva cada feature print y compara candidatos en cada
pasada; su caché evita regenerar la imagen, no esos costes de recorrido/comparación.

La corrección conserva cobertura por ID/versión de fotografías, no vídeos. Reutiliza
una agrupación completa cuando solo desaparecen elementos sin editar; no cambia
el algoritmo/umbral Vision. Nuevas fotos o ediciones invalidan cobertura. Se liberan
versiones desaparecidas. Una pasada parcial no se marca completa ni se repite por
el mero hecho de borrar; Buscar parecidas y refresco explícito permiten reintentar.
El marcador persistido anterior solo se adopta una vez al cargar; no tapa cambios
posteriores que no alteren el fingerprint antiguo.

La respuesta tardía se contrasta con versiones actuales y epoch de permisos:
añadidos/ediciones o revocación no pueden publicar sus grupos antiguos ni marcar
el análisis como completo. Revocar/unmount solicita cancelación; las mutaciones
de borrado/Favoritas y sus protecciones anteriores se conservan.

**Se mantiene `Library.assets()` completo al volver al primer plano** para detectar
permisos, selección limitada y cambios externos. No se salta ese control para
reducir llamadas. Lo evitado es el análisis pesado redundante.

## Evidencia ejecutada

- Antes:10 ciclos,11 `analyze`,4.180 IDs. La nueva aserción falla11≠1.
- Después:10 ciclos,1 `analyze`,400 IDs iniciales; cero repeticiones de tamaños/
  clasificación para elementos correctamente indexados. Sigue habiendo refresco
  de biblioteca en cada vuelta. Cero errores JS y40 eliminaciones solo sintéticas.
-4 pruebas puras: cobertura, adiciones/ediciones, resultados tardíos y parciales.
-5 escenarios React/puente: refresh, añadidos, ediciones fuera del fingerprint
  antiguo, parcial/limited, revocación y respuestas fuera de orden.
-128 Node,19 regresiones +9 seguridad +10 RC PASS; TypeScript/runtime28/builds y
  contratos estáticos/Release comprobados. Evidencias locales en
  `work/apple-readiness/cx021/`; copias reproducibles en `evidence/cx021/`.

El heap web observado antes37,17→39,82MiB y después alrededor37→39,87MiB no demuestra
una mejora de RAM nativa. Listeners se estabilizan en333, elementos112 y vídeos0
en este fixture; el resultado principal es la reducción de trabajo solicitado.
No se extrapolan tiempos/CPU/batería/decodificación a iPhone.

La medición previa de tamaños/classify usaba respuestas vacías; por ello repetía
elementos sin resultado almacenado. Con respuestas válidas, `IndexState` ya conserva
los resultados y no reindexa todos los supervivientes. No se reestructuró indexer
basándose en ese efecto del mock. Los fallos/iCloud sin índice aún requieren QA.

## Reproducir desde mano, servidor4186 activo

```powershell
node --experimental-strip-types --test tests/similarity-state.test.mjs
$env:APPLE_AUDIT_OUTPUT='../work/apple-readiness/r00-repeat'
$env:LEAK_MEASURED='1'
$env:LEAK_ASSERT_INCREMENTAL='1'
node tests/leak-cycles.mjs 10
node tests/similarity-flow.mjs
```

El test registra heap/DOM/listeners y cuentas/IDs del puente. No simula resultados
de Instruments ni de PhotoKit. Para repetir la versión previa, usar el checkpoint
base en un entorno de QA separado, sin resetear el checkout actual.

## Puerta física todavía pendiente

Sobre biblioteca de QA representativa, registrar SHA/build/modelo/OS/red/estado
térmico y10 ciclos en Allocations/Leaks/VM Tracker/Time Profiler/Energy y Web
Inspector. Medir app y WebContent por separado; contrastar actividad en reposo,
Vision, PHImageManager, decodificadores/cachés de vídeo, previews, anuncio final y
`placeCache` nativo sin límite. No confirmar borrados en la biblioteca personal.
No cerrar R-00 hasta acreditar ausencia de crecimiento sostenido y CPU residual.
