# CocoWash 9.7.2.3 · build 23 de desarrollo

La rama histórica de Claude en `dddccbb` está en la historia de la base.
El checkout de OneDrive conserva cambios locales de documentación y skills.
La revisión del diff local de `mano/src` y `mano/ios` no mostró un parche
pendiente para integrar en este relevo.

## Personas

La comparación de fuentes entre build 19 (`d6d6f21`) y build 21 (`a477ac0`)
muestra que el segundo añadió poda del índice, un reconciliador separado y
cancelación por ciclo de vida. La comparación ejecutable se hizo en Edge
contra build 21 con el puente nativo simulado.

Al activar una pausa multimedia durante una tanda, el efecto de `usePeople`
se desmontaba y descartaba su respuesta. Además, el estado ignoraba respuestas
que solo cambiaban los contadores. En la regresión dirigida, la base pierde el
resultado de 4 fotos. El build 23 publica esas 4 y continúa después de la pausa.
El límite de espera de 45 s muestra un error recuperable y pide cancelar
la tanda. La plaza queda ocupada hasta que responde el bridge.

PhotoKit cancelado conserva la foto pendiente. El log local
`COCOWASH_PEOPLE` registra generación, fase y duración de la tanda,
con puntos antes de poda, inserción, agrupación, lectura y reconciliación.
No se encontraron informes del cierre físico en Descargas. Para atribuirlo
hace falta el último punto de la traza y, si iOS lo generó, el `.ips` o
`JetsamEvent` del mismo build.

El análisis conserva la pausa nativa al salir o bloquear. Se evaluó
`BGContinuedProcessingTask`. El directorio facial y sus entradas emplean
protección completa. El IPA CI se genera sin firmar y no acredita un
aprovisionamiento con GPU en segundo plano ni la compatibilidad del
agrupador bajo bloqueo. La continuación nativa queda pendiente de ese
recorrido físico y de decidir la política de protección del índice.
[Protección completa de archivos](https://developer.apple.com/documentation/Foundation/FileProtectionType/complete?changes=_6) · [Documentación de ejecución continua de Apple](https://developer.apple.com/documentation/BackgroundTasks/performing-long-running-tasks-on-ios-and-ipados)

## Producto y comprobaciones

- Personas muestra progreso, espera y fotos sin vista local. Coqui acompaña
  la primera pasada y los grupos provisionales permanecen ocultos.
- El vídeo visible empieza al estar listo. El sonido se inicia apagado en
  una sesión nueva y se conserva al recorrer tarjetas y al usar Deshacer.
  VHS vuelve a medir la superficie cuando reaparece.
- Los sellos I–IV conservan sus intervalos. V requiere selección explícita.
  Los registros, filtros y valores de Deshacer de VI–VIII migran a V.
- Compartir prepara el archivo elegido al pulsar. En censura, la acción
  requiere una vista protegida y el bridge solo entrega un derivado temporal
  censurado a la hoja de iOS. Para originales, PhotoKit puede pedir iCloud.
- El contador de la pila tiene ancho fijo y un texto completo para VoiceOver.
  Los bordes de selección siguen la transformación de cada tarjeta.

Windows: 114 pruebas Node y 4 Sites, TypeScript, builds web/native-web e
integridad de 28 archivos. Edge con demo o puente simulado: regresión de
pausa de Personas, progreso, reapertura, publicación, mosaicos y censura.
Antes/después de la pila con movimiento normal y reducido. Verificados
autoplay y sonido en el siguiente vídeo, con Deshacer y al recuperar un descarte,
pausa al cerrar el visor,
y medida VHS tras ocultar/mostrar con el ojo y desde Ajustes. El puente simulado
de Compartir verificó el ID activo y la ruta protegida. Las capturas locales están en `work/qa-9723/`. Al reutilizar la carpeta de QA
anterior se reemplazaron dos capturas y un JSON. Los regeneré desde `a477ac0`
y los marqué como regenerados en `work/qa-972/REGENERATED-BASELINE.txt`.

## IPA

Commit `67a69e0e98fdb6a9d30a4ca2d40dcc57d8d44978`.
[CI de desarrollo](https://github.com/joacomino-dev/mano-iphone/actions/runs/42042256247).
Swift, API pública del SDK y Release para iPhone compilados en CI. El smoke
nativo de simulador pasó el arranque, reset inicial y reapertura del mismo
build conservando datos nuevos. Usó datos sintéticos y no ejecutó reconocimiento.
Archivo `C:/Users/Joaco/Downloads/CocoWash-9.7.2.3-build23-67a69e0.ipa`,
5.805.757 bytes. SHA-256
`bd2413f3b1e0fc2feeb7998e57504d3aaa493c4999997cdc956618c972805519`.
Bundle `work.joaquin.mano`, versión 9.7.2, build 23, mínimo iOS 17 y reset
de desarrollo verificados en el artefacto. IPA sin firma para instalación personal.

## Recorrido físico pendiente

1. Instalar el build 23 con el procedimiento habitual. Usar una biblioteca de
   prueba. Abrir Filtros → Ver grupos de personas → Activar Personas. Esperar
   que suba el contador mientras se clasifica y que aparezcan los grupos.
2. Ir a Inicio durante una tanda, volver y comprobar el avance guardado.
   Repetir bloqueando y forzando cierre. Si vuelve a cerrarse, guardar el
   informe del sistema y la traza del build, sin subir datos de Fotos.
3. Abrir un grupo, activar Rostro censurado, cambiar rápido de foto y pulsar
   Compartir. Comprobar que la hoja muestra únicamente el derivado protegido.
4. Abrir un vídeo, activar sonido, avanzar y usar Deshacer. Ocultar/mostrar VHS
   y abrir el visor. Probar Compartir en foto y vídeo y cancelar.
5. Aplicar Sello V junto con otro filtro. En una pila seleccionar una, varias,
   todas y ninguna. Comprobar orden y Deshacer.

