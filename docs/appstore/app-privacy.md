# App Privacy — propuesta RC, 7 noviembre 2026

**No enviada. BLOCKED hasta contrastar archivo, tráfico y configuración comercial.**
Responsable confirmado: Joaquin Miño, Quito, Ecuador; cocowash@joaquinmino.work.
Monetización actual conservada por decisión expresa del propietario.

La respuesta propuesta a «¿Recoges datos?» es **Sí**, por los SDK publicitarios.
El análisis local no elimina las obligaciones de esos SDK.

| Tipo Apple | Vinculado | Rastreo | Usos propuestos |
| --- | --- | --- | --- |
| ID de dispositivo | Sí | Sí, condicionado a ATT | Publicidad de terceros, publicidad del desarrollador, analítica |
| Ubicación aproximada | Sí | No | Los tres anteriores y funcionalidad de la app (UMP) |
| Interacción con producto | Sí | No | Los tres anteriores y funcionalidad (UMP) |
| Datos publicitarios | Sí | Sí, declaración conservadora propia | Publicidad de terceros, publicidad del desarrollador, analítica |
| Datos de fallos | No | No | Analítica; publicidad de terceros conservada del manifiesto propio |
| Datos de rendimiento | No | No | Publicidad de terceros, del desarrollador, analítica y funcionalidad (UMP) |
| Otros datos de diagnóstico | No | No | Publicidad de terceros, del desarrollador, analítica |

Evidencia: [manifiestos de los binarios fijados y checksums](../apple-readiness/evidence/rc-sdk-summary.json).
Ads 13.12.0 declara vinculación para ID, ubicación, interacción y datos publicitarios;
la tabla anterior decía «No» y era incorrecta. UMP 3.1.0 añade funcionalidad.
Ads marca rastreo para DeviceID; la app conserva además su declaración previa
para AdvertisingData. Se mantiene una unión conservadora, sin minimizarla porque
una prueba con ATT denegado no muestre IDFA. No se declara que los siete tipos
sean siempre enviados, ni que estas etiquetas hayan sido aprobadas.

## Tratamientos separados

- Fotos, vídeos, índices Vision y decisiones: locales; sin backend de análisis.
  Compartir explícitamente usa la hoja del sistema y el destino elegido.
- Preferencias y sesión: almacenamiento local, sujeto al backup del dispositivo.
- Geocodificación opcional: coordenadas redondeadas a ~1 km a Apple; no imagen.
  Contrastar su tratamiento con el informe y tráfico antes de completar etiquetas.
- Ads/UMP: IP, identificadores, interacciones y diagnóstico según SDK/configuración.
  `npa=1` cuando ATT no autoriza; si UMP no permite pedir anuncios, no se solicitan.
  No personalizado no equivale a anónimo o a cero recogida.
- StoreKit: transacciones firmadas verificadas localmente; sin backend propio ni
  datos de tarjeta. Sandbox/restauración/caducidad aún BLOCKED aquí.
- Soporte: email fuera de la app; el responsable recibe el correo y su contenido.
- Diagnóstico: sin telemetría propia; el SDK tiene diagnóstico y Apple puede
  proporcionar informes según ajustes del usuario. «Sin analítica» debe decir «propia».
- Vision existente detecta cantidad de caras como señal de clasificación local;
  no identifica personas ni ofrece agrupación facial/Personas/Breakup.

## Puertas pendientes

1. Xcode Organizer: generar y conservar Privacy Report del **archivo candidato**.
2. Verificar firmas de SDK en Xcode. Rutas `_CodeSignature` no son firma validada.
3. Inspeccionar tráfico con ATT/UMP concedido, rechazado, sin decidir, revocado
   y offline, usando solo fixtures y una cuenta de QA.
4. Resolver `NSPrivacyTrackingDomains`: los manifiestos inspeccionados no aportan
   lista explícita y el propio está vacío. Obtener dominios documentados por el
   proveedor y contrastarlos con tráfico; no inventar nombres ni marcar PASS.
5. Publicar con autorización las políticas ES/EN locales corregidas y verificar
   GET público. Las URLs reales responden, pero alojan la versión previa.
6. Cuestionario de edad real: clasificación G de anuncios no determina por sí
   sola la edad App Store. No responder todo «Ninguno» automáticamente.
7. Titular: contratos, fiscalidad, países y condición DSA; contacto comercial
   verificado si procede. Revisar obligaciones regionales y representación
   aplicables al responsable establecido en Ecuador.

Referencias: [Apple App Privacy](https://developer.apple.com/app-store/app-privacy-details/),
[Google disclosure 13.12.0](https://developers.google.com/admob/ios/privacy/data-disclosure),
[SDKs de terceros](https://developer.apple.com/support/third-party-SDK-requirements/),
[DSA](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/).
