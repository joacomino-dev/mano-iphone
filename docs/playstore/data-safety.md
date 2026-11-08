# Seguridad de los datos (Data safety) · borrador para Play Console

Revisado2026-11-08. No enviado ni aprobado. El redondeo a dos decimales del geocodificador es **ubicación precisa según Play**, aunque Apple lo clasifique como coarse. Retención, rol del proveedor y cifrado de todo el geocodificador necesitan evidencia; no marcar esas casillas como verificadas.

Deben coincidir con tres cosas: la política publicada
(https://joaquinmino.work/cocowash/privacidad.html, sección Android), el manifiesto de la
app (`mano/android/app/src/main/AndroidManifest.xml` + los que añaden los SDK de Google) y lo
que hace el código (rama única `main`). Si cambia qué datos salen del teléfono, se actualizan
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
| ¿Todos los datos de usuario recogidos están cifrados en tránsito? | **PENDIENTE**: contrastar SDKs y el backend efectivo del geocodificador; no generalizar el transporte de cualquier proveedor Android |
| ¿Ofreces una forma de que los usuarios soliciten que se eliminen sus datos? | **Sí**: por correo a cocowash@joaquinmino.work (y desinstalar borra todo lo local). Ver «Eliminación». |
| ¿Has hecho una revisión de seguridad independiente (MASA)? | No |

## Tipos de datos

| Categoría › tipo | Recogido | Compartido | Efímero | Obligatorio u opcional | Finalidades |
|---|---|---|---|---|---|
| Ubicación › **Ubicación aproximada** | Sí | Sí (Google, anuncios) | No | Obligatorio para la versión con anuncios | Publicidad o marketing; Analítica; Prevención de fraude, seguridad y cumplimiento |
| Ubicación › **Ubicación precisa (nombres de lugar)** | Sí | PENDIENTE: verificar excepción de proveedor de servicios/backend concreto | NO VERIFICADO; no asumir procesamiento efímero del proveedor | **Opcional** (Ajustes › «Ubicación») | Funciones de la app |
| Actividad en la app › **Interacciones con la app** (anuncios vistos y tocados) | Sí | Sí (Google) | No | Obligatorio para la versión con anuncios | Publicidad o marketing; Analítica; Prevención de fraude |
| Información y rendimiento de la app › **Registros de fallos** | Sí | Sí (Google) | No | Obligatorio para la versión con anuncios | Analítica; Prevención de fraude |
| Información y rendimiento de la app › **Diagnóstico** | Sí | Sí (Google) | No | Obligatorio para la versión con anuncios | Analítica; Prevención de fraude |
| Información y rendimiento de la app › Otros datos de rendimiento | Sí | Sí (Google) | No | Obligatorio para la versión con anuncios | Analítica |
| Dispositivo u otros identificadores › **ID de dispositivo u otros ID** (ID de publicidad de Android, conjunto de ID de la app) | Sí | Sí (Google) | No | Obligatorio para la versión con anuncios | Publicidad o marketing; Analítica; Prevención de fraude |

Notas para rellenar:
- Anuncios y geocodificación son finalidades y precisiones distintas: no fusionar ambas como una única ubicación aproximada. La definición de Play usa un área de3 km²; dos decimales forman celdas de como máximo≈1,24 km². Es una inferencia geométrica de la precisión que el código transmite, no una medición de retención del proveedor.
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
- Las coordenadas EXIF completas permanecen locales, pero las que salen con dos decimales deben tratarse como **ubicación precisa** bajo la definición de Play, aunque estén redondeadas. Véase la fila anterior.
- **Historial de compras**: PENDIENTE contrastar la guía de Play Billing y sus operaciones query/acknowledge/consume. No equiparar automáticamente una llamada al servicio de Play con ausencia de tratamiento fuera del dispositivo. CocoWash no tiene backend propio de pagos.
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

## Fuentes y verificación pendiente

- [Definiciones oficiales Play](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en): la distinción es por área, no por el nombre del permiso. Se revisó2026-11-08.
- [Definición Apple](https://developer.apple.com/app-store/app-privacy-details/): precise incluye resolución de tres o más decimales; no trasladar su clasificación directamente a Play.
- Código comprobado: PhotoLibraryPlugin.place redondea lat/lng a dos decimales y llama Geocoder.getFromLocation; el permiso no es ACCESS_FINE_LOCATION y no se solicita posición actual del teléfono.
- Antes de enviar: contrato/proveedor y tráfico real, coherencia con política pública tras despliegue autorizado, reglas de excepción y respuestas finales del titular. Este borrador no cambia la conducta de geocodificación ni el manifiesto Apple, que sigue bloqueado por R-02.
