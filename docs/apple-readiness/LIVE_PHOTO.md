# R-07 · Live Photo inline (CW-CX-022)

Actualizado 2026-11-09. Base actual `6386f55`; iOS 17, versiones y monetización intactos.

## Implementación local

- La carta conserva el botón LIVE aprobado: play/pausa explícitos, bucle; al pausar se oculta el vídeo y queda la miniatura de PhotoKit (foto clave actual).
- Anclar muestra inicialmente la foto clave; ofrece play/pausa y línea de tiempo, con pausa al buscar. Pinch/pan transforma la imagen y el vídeo en la misma geometría. Sin reproductor independiente ni fullscreen de Live Photo.
- Sin preparación automática de movimiento. Reduce Motion requiere una acción explícita. Pausar durante preparación no se pierde al llegar la URL; la tarjeta oculta no sobrescribe la intención del visor. Salir libera el elemento/decoder y cancela preparaciones fuera de la ventana.
- iOS prepara fullSizePairedVideo (edición actual) o pairedVideo mediante PHAssetResourceManager. Escritura por bloques en caché propia, cancelación, progreso, watchdog, límite 512 MiB/archivo y presupuesto existente de 1 GiB. Ninguna escritura en la fototeca. Se conserva el contrato prepareVideo; Android no incorpora Live Photo.
- La foto sigue siendo kind=live en decisiones, filtros, compartir y borrado; la conversión temporal a video solo permite reutilizar la planificación/caché de movimiento. No se cambian decisiones ni recuperación.

## Evidencia y límites

Cierre2026-11-08: [5 escenarios PASS](evidence/cx025/live-photo.json), añadiendo mantener pulsada una Live Photo en reproducción y arrastrar al anclaje tras cargar el vídeo. Esta transición ya pasaba: no se cambió código por una hipótesis. Se conserva debajo la evidencia original de4 escenarios.

**PASS web**: [4 escenarios](evidence/cx022/live-photo.json), Edge 390×844 con postal/vídeo sintéticos: explícito/bucle/pausa con y sin Reduce Motion; pausa durante carga y retorno de visibilidad; visor, timeline, pinch y liberación. Inspección de captura local anchor.png: controles dentro del marco y composición conservada. Esto no representa una Live Photo nativa ni VoiceOver.

**VERIFICADO nativo anterior:** [42554023066](https://github.com/joacomino-dev/mano-iphone/actions/runs/42554023066),
fuente `8f2549e`, compila Swift y reproduce una Live sintética real de PhotoKit.
La foto clave pasa el criterio visual aprobado (máximo 12 niveles, menos del 1 %
de canales distintos y 20 veces más cerca de la clave que del movimiento).
Timeline y bucle pasan. XCTest falla únicamente el pellizco en la vista anclada;
el usuario confirma que funciona en su iPhone (modelo no registrado).

**PENDIENTE candidato:** [42623622241](https://github.com/joacomino-dev/mano-iphone/actions/runs/42623622241)
ejecutará la suite completa de `6386f55`. Solo se cambia el test: pellizcar el medio
visible en lugar de toda la app. El evento retenido inicia los dedos en
(204,6; 438,3) y (197,4; 435,7), sobre la barra de controles en la captura de
402 × 874 puntos. `Inspector` excluye esa barra de los gestos, correctamente. Los píxeles interiores deben cambiar y la barra permanecer
en el mismo lugar. `InlineVideo` e `Inspector` no se modifican. Los cinco escenarios
web vuelven a pasar, sin atribuirles validación PhotoKit ni física.

QA adicional con fixtures de Live Photo reales, locales e iCloud: original/editada con foto clave cambiada; JPEG/HEIC + MOV válidos; descarga permitida/denegada/offline; cancelar al cambiar carta/cerrar/suspender; fallo de escritura/espacio; 10 ciclos; sonido y color/orientación/HDR; pausar en 0/mitad/final; zoom en movimiento y pausa. Medir caché/decoder con Instruments. Verificar iOS17 y runtime reciente, teléfono compacto/Dynamic Island/Duo; no extrapolar Edge.

## Reproducir

Desde mano, con dependencias existentes y Vite en 127.0.0.1:4186:

```powershell
node tests/live-photo-flow.mjs
node node_modules/typescript/bin/tsc --noEmit
node scripts/check-mobile-runtime.mjs
```

Pruebas generales y compilaciones se registran en la bitácora y work/apple-readiness/cx022 (local, no fotos personales).

## API verificadas

[requestData](https://developer.apple.com/documentation/photos/phassetresourcemanager/requestdata(for:options:datareceivedhandler:completionhandler:)): callbacks de datos/completado seriales, cancelación por ID. [fullSizePairedVideo](https://developer.apple.com/documentation/photos/phassetresourcetype/fullsizepairedvideo) disponible desde iOS10. [PHAssetResourceProgressHandler](https://developer.apple.com/documentation/photos/phassetresourceprogresshandler) recibe Double. [networkAccessRequired](https://developer.apple.com/documentation/photos/phphotoserror-swift.struct/code/networkaccessrequired) desde iOS14, compatible con mínimo17. Consulta oficial 2026-11-07; no sustituye compilación.
