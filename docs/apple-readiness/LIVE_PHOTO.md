# R-07 · Live Photo inline (CW-CX-022)

2026-11-07. Base: main cd717f9. iOS 17 mínimo; versiones y monetización intactas.

## Implementación local

- La carta conserva el botón LIVE aprobado: play/pausa explícitos, bucle; al pausar se oculta el vídeo y queda la miniatura de PhotoKit (foto clave actual).
- Anclar muestra inicialmente la foto clave; ofrece play/pausa y línea de tiempo, con pausa al buscar. Pinch/pan transforma la imagen y el vídeo en la misma geometría. Sin reproductor independiente ni fullscreen de Live Photo.
- Sin preparación automática de movimiento. Reduce Motion requiere una acción explícita. Pausar durante preparación no se pierde al llegar la URL; la tarjeta oculta no sobrescribe la intención del visor. Salir libera el elemento/decoder y cancela preparaciones fuera de la ventana.
- iOS prepara fullSizePairedVideo (edición actual) o pairedVideo mediante PHAssetResourceManager. Escritura por bloques en caché propia, cancelación, progreso, watchdog, límite 512 MiB/archivo y presupuesto existente de 1 GiB. Ninguna escritura en la fototeca. Se conserva el contrato prepareVideo; Android no incorpora Live Photo.
- La foto sigue siendo kind=live en decisiones, filtros, compartir y borrado; la conversión temporal a video solo permite reutilizar la planificación/caché de movimiento. No se cambian decisiones ni recuperación.

## Evidencia y límites

Cierre2026-11-08: [5 escenarios PASS](evidence/cx025/live-photo.json), añadiendo mantener pulsada una Live Photo en reproducción y arrastrar al anclaje tras cargar el vídeo. Esta transición ya pasaba: no se cambió código por una hipótesis. Se conserva debajo la evidencia original de4 escenarios.

**PASS web**: [4 escenarios](evidence/cx022/live-photo.json), Edge 390×844 con postal/vídeo sintéticos: explícito/bucle/pausa con y sin Reduce Motion; pausa durante carga y retorno de visibilidad; visor, timeline, pinch y liberación. Inspección de captura local anchor.png: controles dentro del marco y composición conservada. Esto no representa una Live Photo nativa ni VoiceOver.

**BLOCKED nativo**: Windows no compila Swift/PhotoKit. Hay que ejecutar rc-native-gate.yml sobre este commit tras autorizar su publicación en GitHub. No se declara compilada esta ampliación del puente, ni validada la foto clave elegida por Apple.

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
