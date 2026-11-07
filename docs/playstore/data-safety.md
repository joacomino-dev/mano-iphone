# Seguridad de los datos (Data safety) · respuestas para Play Console

Deben coincidir con tres cosas: la política publicada
(https://joaquinmino.work/cocowash/privacidad.html, sección Android), el manifiesto de la
app (`mano/android/app/src/main/AndroidManifest.xml` + los que añaden los SDK de Google) y lo
que hace el código (rama `android`). Si cambia qué datos salen del teléfono, se actualizan
los tres a la vez.

Definiciones de Play: **recoger** = transmitir datos fuera del dispositivo (la app o un SDK
incluido); **compartir** = transferirlos a un tercero. No cuenta como recogida lo que se
procesa solo en el dispositivo. Un proveedor que actúa por cuenta del desarrollador
(«service provider») no cuenta como compartir.

CocoWash no tiene servidor ni cuentas: todo lo que se declara lo recoge un SDK de Google
integrado (AdMob/UMP) o el geocodificador del sistema.

## Resumen de la sección «Recogida y seguridad de los datos»

| Pregunta | Respuesta |
|---|---|
| ¿Tu app recoge o comparte alguno de los tipos de datos de usuario obligatorios? | **Sí** |
| ¿Todos los datos de usuario recogidos están cifrados en tránsito? | **Sí** (HTTPS en los SDK de Google y en el geocodificador) |
| ¿Ofreces una forma de que los usuarios soliciten que se eliminen sus datos? | **Sí**: por correo a cocowash@joaquinmino.work (y desinstalar borra todo lo local). Ver «Eliminación». |
| ¿Has hecho una revisión de seguridad independiente (MASA)? | No |

## Tipos de datos

| Categoría › tipo | Recogido | Compartido | Efímero | Obligatorio u opcional | Finalidades |
|---|---|---|---|---|---|
| Ubicación › **Ubicación aproximada** | Sí | Sí (Google, anuncios) | No | Obligatorio para la versión con anuncios | Publicidad o marketing; Analítica; Prevención de fraude, seguridad y cumplimiento |
| Ubicación › Ubicación aproximada (nombres de lugar) | Sí | No (Google actúa como proveedor del sistema) | **Sí** | **Opcional** (Ajustes › «Ubicación») | Funciones de la app |
| Actividad en la app › **Interacciones con la app** (anuncios vistos y tocados) | Sí | Sí (Google) | No | Obligatorio para la versión con anuncios | Publicidad o marketing; Analítica; Prevención de fraude |
| Información y rendimiento de la app › **Registros de fallos** | Sí | Sí (Google) | No | Obligatorio para la versión con anuncios | Analítica; Prevención de fraude |
| Información y rendimiento de la app › **Diagnóstico** | Sí | Sí (Google) | No | Obligatorio para la versión con anuncios | Analítica; Prevención de fraude |
| Información y rendimiento de la app › Otros datos de rendimiento | Sí | Sí (Google) | No | Obligatorio para la versión con anuncios | Analítica |
| Dispositivo u otros identificadores › **ID de dispositivo u otros ID** (ID de publicidad de Android, conjunto de ID de la app) | Sí | Sí (Google) | No | Obligatorio para la versión con anuncios | Publicidad o marketing; Analítica; Prevención de fraude |

Notas para rellenar:
- La ubicación aproximada aparece dos veces porque Play pide una fila por tipo con todas sus
  finalidades: en el formulario es **un solo tipo** («Ubicación aproximada») marcado como
  recogido y compartido, con las finalidades de ambas filas. En la pregunta «¿es opcional?»
  responde **No** (la de los anuncios no se puede apagar sin comprar «sin anuncios»).
- La de los nombres de lugar son coordenadas de una foto redondeadas a ~1 km, enviadas al
  geocodificador de Android (`android.location.Geocoder`, que en la mayoría de teléfonos
  resuelve Google Play Services); el nombre se guarda solo en el teléfono.
- «Sin anuncios» (compra) apaga toda la recogida de AdMob: la app deja de pedir anuncios.
- Fuente de lo que recoge el SDK: la guía de Google «Prepare for the Google Play data
  disclosure requirements» de AdMob y la de UMP. Revisarla al actualizar el SDK.

## Lo que **no** se declara, y por qué

- **Fotos y vídeos**: se leen y analizan en el teléfono (MediaStore, miniaturas del sistema,
  nitidez, caras con el detector de Android, «casi iguales» por firma de la imagen). Nunca se
  transmiten. No hay ML Kit ni otra librería que envíe métricas.
- **Ubicación precisa**: las coordenadas EXIF se leen en el teléfono; solo salen redondeadas.
- **Historial de compras**: Google Play procesa los pagos; la app consulta las compras en el
  propio teléfono (`queryPurchasesAsync`) y no las envía a ningún sitio.
- **Información personal, contactos, mensajes, archivos, calendario, salud**: no.
- **Analítica propia o telemetría**: no hay. Los registros de la app (`devLog`) solo existen
  en compilaciones de depuración.
- **Copia de seguridad**: `allowBackup=false` y reglas de extracción que excluyen todo: las
  decisiones no se suben a la copia de Google ni pasan a otro teléfono.

## Eliminación

- Datos en el teléfono (decisiones, ajustes, cachés): se borran al desinstalar la app o en
  Ajustes › Aplicaciones › CocoWash › Almacenamiento › Borrar datos.
- Datos de anuncios que guarda Google: el usuario puede borrar o restablecer su ID de
  publicidad (Ajustes de Android › Privacidad › Anuncios) y gestionar su actividad en
  https://myadcenter.google.com. Para cualquier otra solicitud, cocowash@joaquinmino.work.
- Play pide un **enlace web** para solicitar la eliminación cuando hay cuentas; CocoWash no
  tiene cuentas, así que la pregunta de «eliminación de cuenta» se responde **No** (no se
  crean cuentas). Aun así, la política explica cómo pedir la eliminación de datos.

## Comprobación final (obligatoria antes de enviar)

1. Abrir el AAB firmado en Play Console › App bundle explorer › «Permisos» y confirmar que
   solo aparecen: `INTERNET`, `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`,
   `READ_MEDIA_VISUAL_USER_SELECTED`, `ACCESS_MEDIA_LOCATION`, `READ_EXTERNAL_STORAGE`
   (≤ API 32), `com.google.android.gms.permission.AD_ID`, `ACCESS_NETWORK_STATE`,
   `com.android.vending.BILLING` y los internos de los SDK (p. ej. `WAKE_LOCK`,
   `FOREGROUND_SERVICE`, `RECEIVE_BOOT_COMPLETED` si los añaden). Si aparece otro, se revisa.
2. Repasar la guía de datos de AdMob y UMP para la versión del SDK incluida.
3. Que la política publicada tenga la sección Android con la misma lista.
