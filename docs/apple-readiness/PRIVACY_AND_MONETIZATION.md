# Privacidad y monetización de la RC

2026-11-07. PASS significa comprobación del alcance indicado, no aprobación legal.

## Decisiones confirmadas

El propietario confirmó Joaquin Miño, Quito (Ecuador),
cocowash@joaquinmino.work y **mantener monetización actual**. No se activó una
versión gratuita sin monetización. No se añadieron servicios, productos o precios.

| Tratamiento | Evidencia y estado |
| --- | --- |
| PhotoKit, medios/iCloud | PASS inspección: procesamiento local; descargas desde iCloud de la persona. Sin endpoint propio de subida. BLOCKED tráfico/runtime nativo |
| Vision | PASS: parecido, nitidez, OCR y conteo de caras existentes; no identidad facial ni agrupación Personas. No se amplió el análisis |
| Decisiones/preferencias | PASS: claves locales existentes y envelope atómico. Puede entrar en backups; fallo de cuota se comunica; terminación antes del flush de 350 ms sigue como prueba nativa pendiente |
| Lugares | PASS código: geocodificación Apple opcional con coordenadas redondeadas. No equivale a cero comunicaciones |
| Compartir | PASS código: elección explícita, hoja iOS/destino de la persona. Se corrigió la promesa demasiado amplia «nunca salen» |
| Ads y UMP | PASS integración real, binarios oficiales fijados y manifiestos inspeccionados. BLOCKED consentimiento regional, tráfico, inventario comercial y SDK firmado en archivo |
| Identificadores | PASS declaración de DeviceID vinculado/rastreo del proveedor; ATT en fuente. No se ha medido IDFA real ni dominios |
| Compras | PASS StoreKit local verificado en fuente; catálogo dinámico y restore. BLOCKED productos, precios/países, contratos y sandbox reales |
| Diagnósticos | Sin telemetría propia en fuente; Ads declara diagnóstico y analítica. No usar «Data Not Collected» |

## Corrección de manifiestos

[Recibo de SDKs](evidence/rc-sdk-summary.json): ZIPs oficiales comparados con
SHA-256 de Package.swift inmutable. Ads13.12.0, UMP3.1.0. La inspección no ejecuta
binarios. Se corrigió vinculación falsa en la propuesta anterior y se añadió una
unión conservadora de categorías/usos al manifiesto propio.

La app conserva Required Reason APIs UserDefaults CA92.1 y FileTimestamp C617.1;
Ads declara SystemBootTime35F9.1, UserDefaultsCA92.1 y DiskSpaceE174.1; UMP declara
UserDefaultsCA92.1. Capacitor8.6.0 instalado incluye manifiestos Capacitor/Cordova
sin recogida declarada. Falta confirmar el empaquetado/resolución real del archivo.
No se copian justificaciones del SDK al código propio sin uso que las sustente.

**BLOCKED:** Privacy Report agregado, validación Xcode de firmas SDK y dominios de
rastreo. Los `_CodeSignature` presentes no verifican identidad/integridad Apple.
**FAIL P1 para envío:** tracking=true con lista de dominios vacía incumple la
declaración esperada por [Apple TN3182](https://developer.apple.com/documentation/technotes/tn3182-adding-privacy-tracking-keys-to-your-privacy-manifest).
La evidencia confirma la ausencia; resolver los valores requiere proveedor/tráfico.
`python scripts/check-apple-privacy.py --submission` falla explícitamente y el
script de archivo lo exige antes de firmar/exportar. No se inventa una lista
de dominios para rellenar el array vacío. Las
[etiquetas propuestas](../appstore/app-privacy.md) siguen pendientes de contraste.

Reproducir desde raíz: `python scripts/inspect-apple-sdks.py` y
`python scripts/check-apple-privacy.py`. Python3 estándar; descarga de SDKs en
`work/` ignorado, sin instalar/ejecutar SDK ni subir repositorio.

## Política completa en español e inglés

Fuentes preparadas: [ES](../../web/cocowash/privacidad.html) y
[EN](../../web/cocowash/privacy.html), fecha7noviembre2026. Incluyen responsable,
medios/iCloud, lugares, almacenamiento local, SDK/consentimiento/ATT, compras,
soporte, bases, transferencias, conservación, derechos, menores y contacto.
Se aclararon compartir explícito, no-personalizado frente a anonimato y la
ausencia de analítica **propia**. No se afirma que la app ya notificase cambios
de política ni se inventa un historial de doce meses de recogida.

Las URLs reales [ES](https://joaquinmino.work/cocowash/privacidad.html),
[EN](https://joaquinmino.work/cocowash/privacy.html) y soporte dieron GET200 con
PowerShell; urllib sin ese agente recibió403. [Recibo](evidence/rc-public-web.json).
**BLOCKED publicación del texto corregido:** la web actual sigue en versión
anterior. Ningún despliegue fue realizado. Antes de enviar, publicar con permiso,
volver a descargar y contrastar contenido/idioma/enlaces desde una conexión pública.

El responsable debe adoptar las prácticas de soporte/conservación, revisar bases
y transferencias según territorios y decidir condición DSA y datos comerciales
verificables. Nombre/ciudad/email confirmados no aportan dirección postal,
teléfono, representante cuando proceda ni acuerdos con proveedores. No se declara
cumplimiento legal universal por tener un HTML.

## Monetización conservada y congelada

| ID existente | Diseño/implementación | Estado real |
| --- | --- | --- |
| `work.joaquin.mano.noads.year` | Año, no autorrenovable, pago único; estado/caducidad en Swift | BLOCKED ASC/sandbox/restore/reembolso/fecha |
| `work.joaquin.mano.noads.lifetime` | No consumible, sin vencimiento | BLOCKED ASC/sandbox/restore/revocación |
| `work.joaquin.mano.coffee` | Consumible de apoyo; no quita anuncios | BLOCKED ASC/sandbox/consumo |

Precios de diseño no se convierten en precios configurados. El catálogo vacío o
fallido ahora ofrece reintento y no muestra sellos de compra indisponibles/«Pronto».
PASS ocho contratos Edge con fixtures, sin compras ni solicitudes reales.
Restaurar compras y privacidad siguen accesibles. El canal RC oculta developer y
Release usa los IDs ya existentes en release4c43d0c; Debug conserva configuración
de pruebas. La existencia de IDs no acredita propiedad o aprobación de AdMob.

Una primera versión sin anuncios/compras fue alternativa considerada, **no elegida**
por el propietario. Los bloqueos de monetización deben resolverse antes del envío;
no se cambian silenciosamente estrategia, cadencia ni composiciones de las cartas.
