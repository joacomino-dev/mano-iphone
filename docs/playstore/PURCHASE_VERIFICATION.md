# Verificación de compras Android

Actualizado2026-11-09: verificador JVM y plugin Kotlin **PASS** en
fa318ba/42634538249; claves y transacciones reales **BLOCKED** por configuración
del propietario. La prueba de firma local no equivale a compras Play sandbox. No servidor
nuevo, telemetría, subida de recibos ni cambio de productos/precios.

Fallo comprobado en el código anterior: `entitlements` y `onPurchasesUpdated`
confiaban en PURCHASED/SKU y llamaban acknowledge/consume sin comprobar la firma.
Además restoreInto convertía un error de consulta en adFree=false y podía informar
éxito de compra sin un derecho confirmado.

Ahora se verifican los bytes originales UTF-8, firma RSA del recibo y clave pública
de licencias; paquete, SKU único permitido, cantidad1, token y fecha válidos. Tanto
consulta/restore como callback y acknowledge/consume exigen verificación. Una firma
incorrecta no concede derechos ni consume/reconoce el recibo. Errores de consulta
no anuncian una restauración/compra completada. Pendientes no otorgan derechos.

No hay bypass de firma en Debug. Sin clave válida, catálogo/buy/restore rechazan;
la interfaz existente oculta ofertas sin productos reales y muestra su error
localizado. Esto conserva la estrategia de monetización y bloquea una configuración
incompleta, sin inventar productos o precios. Anuncios y fotos permanecen separados.

Siete pruebas del verificador real con claves RSA efímeras: recibo UTF-8 correcto,
SKU/paquete/formato alterados, otra clave, firma malformada y configuración ausente.
`verify-android-signatures.yml` las ejecuta sin Android/Play; build-android ejecuta
además testDebugUnitTest y compila el plugin Kotlin. No equivalen a una compra Play.

## Configuración del propietario

1. En Play Console de **work.joaquin.mano**, obtener la clave pública de licencias
   RSA/Base64 y ponerla en GitHub Secret **COCO_PLAY_LICENSE_PUBLIC_KEY**. No es la
   clave privada de subida, ni certificado, ni service account. No enviar por chat.
2. Poner IDs Android reales en Repository Variables **COCO_ADMOB_ANDROID_APP_ID**
   y **COCO_ADMOB_ANDROID_NATIVE_UNIT**; son identificadores públicos. No usar iOS.
   No se han creado/editado estas variables ni la cuenta AdMob durante esta tarea.
3. El Gradle de main admite esos valores y usa samples cuando faltan. Debug siempre
   usa app/unidad de prueba. `./gradlew verifyStoreConfiguration` debe pasar antes
   de distribución; **COCO_ANDROID_STORE_READY=true** obliga ese gate antes de
   preReleaseBuild. Samples/iOS/clave ausente o malformada lo bloquean. La CI regular
   puede construir AAB de prueba unsigned, que no se declara listo para tienda.
4. Tras configurar productos y versión/code libres, prueba interna instalada desde
   Play: comprar/cancelar/pending, reiniciar, restore, rechazo de firma alterada en
   fixture, anual/lifetime/coffee, interrupción y errores de ack/consume. No usar
   pagos reales durante QA sin autorización.

## Límite de seguridad

La firma local comprueba autenticidad/integridad del recibo; no comprueba en tiempo
real revocación/reembolso con la API de Google ni protege frente a un cliente
modificado. Google recomienda backend para esos controles. Esta misión prohíbe
añadir servicios; no se da por implementada esa protección ni se cambia arquitectura.
Consultar compras vigentes al reanudar sigue siendo obligatorio.

Fuentes oficiales:
[Purchase/getSignature](https://developer.android.com/reference/com/android/billingclient/api/Purchase),
[verificación antes de conceder derechos](https://developer.android.com/google/play/billing/security),
[cliente y acknowledge](https://developer.android.com/google/play/billing/integrate),
[formato RSA-SHA1 del backend de Play](https://developer.android.com/games/playgames/native-pc/billing#client-side-purchase-verification).
La última explica el formato de firma en el SDK PC; la aceptación específica del
recibo Android real queda pendiente de sandbox con la clave de esta aplicación.
