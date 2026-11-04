# Etapa 1 — revisión por visibilidad

2026-11-04. Base `3cc28d26783e284026905cbf2b75097059d12101`, CocoWash 0.9.6/17.
Completada local en `C:/Users/Joaco/Developer/CocoWash-stage1`, sin commit ni publicación.

Actualización de distribución: usuario autorizó publicar esta etapa en rama independiente
`codex/stage1-review` y compilar con el workflow macOS gratuito, sin merge a main.
El IPA debe verificarse contra el SHA compilado y guardarse en Descargas para AltStore.
Compilación y descarga pendientes al preparar este commit; no confundir con QA física.

## IPA disponible — actualización de distribución

`C:/Users/Joaco/Downloads/CocoWash-0.9.6-etapa1-143a1d84-web.ipa`
(5.546.336 bytes), recibo JSON en el mismo directorio.

Método de contingencia tras fallos de asignación de runner: Vite nativo y TypeScript
compilados de nuevo desde 143a1d8; assets web empaquetados sobre el binario arm64
del CI verde 41530807373, SHA 1586a37056ef25a22eb4a4e836f0cbd4a24946ca,
artefacto 13183800067. Fuente Swift, recursos nativos y dependencias son idénticos
en ambos SHA. Las diferencias nativas se limitan a versión 0.9.5/16→0.9.6/17,
incluido configure-ios; package.json añade únicamente un test. No se recompiló Swift.

Verificación: hash del ZIP de origen coincide con GitHub; CRC ZIP/IPA, binario arm64,
identidad, configuración Capacitor sin servidor remoto, 28 recursos nativos byte a byte,
64 archivos web byte a byte, referencias HTML, código etapa 1 y textura intacta.
SHA256 del IPA: `a415a8832f54dca34ae48bedc6cbf5f91cb16faffc020dad24420eea39d5f1a9`.
Script reproducible y recibo: carpeta externa de evidencia, `package-web-update.py`
e `ipa-receipt-web.json`. Sin certificados ni firma: instalar con AltStore.
Este método solo vale mientras el código nativo y dependencias coincidan; no sirve
para futuras etapas que modifiquen Swift. Full CI 41885957816 continúa aparte.
Instalación y checklist iPhone siguen pendientes.

## Cambio y alcance

El grid anterior montaba todos los descartes y cada Photo solicitaba su miniatura.
Ahora monta las filas visibles, dos filas de margen y, cuando procede, la fila que
conserva el foco. Mantiene las tres columnas, tarjetas, botones, altura total y
el mismo Carousel y hoja. Las miniaturas usan una cola exclusiva de revisión con
máximo dos promesas activas, deduplicación, cancelación y 60 referencias recientes.
Una petición cancelada conserva su plaza hasta finalizar realmente. Al cerrar se
cancelan los trabajos; se conserva la imagen durante la animación de salida.
No cambia decisiones, persistencia, orden de la mano, animaciones ni Swift.

Archivos: `mano/src/{ReviewGrid.tsx,review.ts,library.ts,ManoApp.tsx,prototype.css}`,
`mano/tests/review.test.mjs` y script test en `mano/package.json`. Más esta entrega,
CURRENT_STATE y CODEX_LOG. Sin cambios de dependencias, versiones ni hashes runtime.

## Evidencia

En `C:/Users/Joaco/Developer/CocoWash-stage1-evidence`:

- `review-qa.mjs`, `review-qa.json` y PNG antes/después: comparación con el HEAD
  original, 18 tarjetas; igual geometría en movimiento normal y reducido.
- Fixture demo de 1.000 elementos inyectado solo en la prueba: 18 tarjetas montadas
  al abrir y 30 a mitad; llega al último elemento; permite recorrer 40 controles
  con Tab y conserva foco al desplazar con puntero. Recuperar guarda exactamente
  999 IDs sin duplicados; cerrar/reabrir/recargar conserva el resultado.
- `smoke.mjs/json`: swipe y Deshacer pasan antes/después; fuente, color e icono
  de Recuperar coinciden. También pasa viewport pequeño escalado.
- 90/90 pruebas Node (incluidas seis nuevas de cola/ventana), runtime28,
  TypeScript noEmit, Vite web + preparación Sites, Sites4/4 y Vite nativo +
  preparación de assets pasan con Node y dependencias existentes, sin instalar.
  Se usaron los entrypoints Node de los scripts porque npm no está en PATH.

Estas son verificaciones de escritorio y límites del algoritmo, no mediciones de
FPS, RAM, tiempos PhotoKit ni pruebas en iPhone. Persiste el aviso previo de chunk
superior a 500 kB. No se compiló Swift, ejecutó sync:ios ni generó un IPA nuevo.
El navegador integrado está deshabilitado; preview local en puerto 4311.

Git Windows puede mostrar archivos runtime por normalización de finales de línea:
los bytes protegidos se comprobaron contra HEAD y sus hashes originales; no se
regeneró el lock. El diff real excluye esos archivos.

## Qué esperar y revisar en iPhone

Requiere compilar/instalar esta entrega con autorización separada. Usar biblioteca
demo o medios de prueba; nunca confirmar borrados de la biblioteca personal.
Se espera menor trabajo al abrir y recorrer revisiones largas, manteniendo el
aspecto existente. El beneficio físico todavía debe medirse.

- [ ] Descartar varios medios de prueba y abrir Terminar. Deben aparecer las mismas
  tarjetas y controles; falla si cambian tamaños, sellos, textura o transiciones.
- [ ] En una revisión larga, desplazar rápido al centro y al final y volver arriba.
  Deben aparecer los elementos correctos sin huecos persistentes, duplicados o saltos.
  Pueden verse brevemente los indicadores de carga existentes.
- [ ] Recuperar una foto reconocible en el centro. Debe salir solo esa foto y bajar
  el contador en uno; falla si desaparece otra o reaparece tras cerrar y reabrir.
- [ ] Cerrar y reabrir; después cerrar/reabrir la app. Deben conservarse decisiones
  y sesión; falla si se reinician, duplican elementos o se pierde el orden previo.
- [ ] Fuera de revisión, hacer swipe y Deshacer. Deben volver la misma mano y sus
  selecciones, con los mismos sellos y animaciones; falla si cambia la foto restaurada.
- [ ] Repetir apertura/cierre mientras cargan miniaturas. No deben quedar bloqueados
  los controles ni faltar permanentemente fotos al reabrir.
- [ ] Con Reducir movimiento y texto grande/VoiceOver, recorrer Recuperar hasta el
  final y regresar al cierre de la hoja. Falla si se corta el contenido o el foco
  queda atrapado. La navegación virtualizada de VoiceOver requiere aceptación física.

Antes de la etapa siguiente: en dispositivo, comparar la misma cola antes/después
con Instruments (Time Profiler, Animation Hitches y Allocations): apertura,
desplazamiento repetido y cierre, registrando dispositivo, iOS, volumen y nube/local.
No ampliar esta etapa a caché global, vídeos, Vision o persistencia.
