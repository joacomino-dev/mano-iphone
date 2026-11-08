# Propuesta R-02: dominios observados y límite de la evidencia

2026-11-08. **Dos hosts aprobados por el propietario y añadidos al manifiesto. No cierra privacidad.**

Run42514971530, fuente662e67d, ambos estados PASS: XCTest real, ATT mediante diálogo,
`tracking=1 npa=0` al permitir y `tracking=0 npa=1` al denegar. SDK recibe anuncio de
prueba en ambos. Proxy calibrado con URLSession, configuración restaurada sin errores.
Solo hosts; no payloads, identificadores, consultas ni TLS descifrado. Los reportes
[evidencia allowed](evidence/strategic/ad-hosts-allowed-662e67d.json) y
[denied](evidence/strategic/ad-hosts-denied-662e67d.json) conservan baseline.

## Lista inicial propuesta para aprobación

| Host exacto | Evidencia | Propuesta / certeza |
| --- | --- | --- |
| googleads.g.doubleclick.net | Observado en ambos estados, ausente en baseline; cadena presente en binarios oficiales GMA13.12.0 arm64 y simulador | Incluir como endpoint publicitario que puede participar en tracking; inferencia sustentada por política del proveedor, no listado oficial específico para esta versión |
| pagead2.googlesyndication.com | Igual evidencia de captura y binarios GMA | Igual propuesta y límite |
| fundingchoicesmessages.google.com | Captura ambos estados, cadena en UMP3.1.0 | Consentimiento; no declararlo tracking solamente por contacto |
| imasdk.googleapis.com | Captura ambos estados, cadena en GMA13.12.0 | Recurso de SDK de anuncios; investigar finalidad específica, no incluir por conjetura |
| fonts.googleapis.com / fonts.gstatic.com / lh3.googleusercontent.com | Captura ambos estados | Recursos de creatividad/consentimiento posiblemente; atribución y tracking no demostrados |
| odf.app-ads-services.com | Captura ambos estados, no hallado en los binarios GMA/UMP fijados | NO VERIFICADO dueño/finalidad; podría ser tráfico del sistema u otro recurso. Requiere atribución, no adivinar por nombre |
| Hosts Apple | Tráfico del runner/simulador en baseline y app | No listarlos como tracking de CocoWash sin atribución |

Google identifica doubleclick.net y googlesyndication.com como dominios publicitarios
y explica vínculos entre identificadores móviles y actividad. El SDK declara DeviceID
para tracking. Esto sustenta la inferencia conservadora, pero no demuestra que cada
petición observada haya rastreado a alguien ni que la lista sea exhaustiva. No se
utilizan listas comunitarias como certificación del proveedor.

## Impacto antes de aprobar

Apple bloquea los dominios declarados cuando ATT no está autorizado. Ambos hosts se
contactaron también para anuncios no personalizados: incluirlos puede impedir esos
anuncios aunque UMP permita solicitarlos. La app debe seguir organizando fotos sin
anuncios ante ese fallo; verificarlo con la lista aprobada. No forzar ATT ni alterar
la elección de la persona. Las categorías de privacidad actuales ya contemplan SDK
publicitario/DeviceID; no convertir etiquetas en "datos no recopilados".

Aprobar dos hosts no acredita exhaustividad. Antes de envío: contrastar proveedor y
configuración comercial efectiva, Privacy Report del archivo real, firmas y recursos
empaquetados, casos ATT permitido/denegado/revocado y política ES/EN/Data safety.
Mantener `check-apple-privacy.py --submission` en FAIL hasta cambiar el manifiesto con
aprobación; después su PASS será coherencia estática, no aprobación de Apple.

## Fuentes oficiales

- [Google, publicidad y dominios](https://policies.google.com/technologies/ads?hl=en-US).
- [GMA13.12, datos y manifiesto](https://developers.google.com/admob/ios/privacy/data-disclosure).
- [Apple, efecto de tracking domains](https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacytrackingdomains).
- [Apple TN3182](https://developer.apple.com/documentation/technotes/tn3182-adding-privacy-tracking-keys-to-your-privacy-manifest).

Comprobación binaria reproducible: descargar los ZIP oficiales de `rc-sdk-summary.json`,
verificar SHA256 fijado, leer solo el ejecutable arm64/simulador de cada XCFramework y
buscar los hostnames exactos como bytes UTF8. Presencia de cadena demuestra referencia,
no ejecución de todas sus rutas. Medición nativa y contrato independiente en
`ad-traffic-lab.yml` / `verify-native-gate-evidence.py ... ads`.

## Decisión del propietario

2026-11-08: «Aprobar los dos hosts y sus pruebas». Solo los dos hosts exactos de la
lista inicial se incorporan. Cinco regresiones del validador y check --submission PASS
en su alcance estático; repetición ATT/uso de fotos con el manifiesto nuevo pendiente.
La aprobación no afirma exhaustividad ni sustituye el archivo final.
