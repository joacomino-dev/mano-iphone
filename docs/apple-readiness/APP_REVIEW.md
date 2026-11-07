# Checklist de preparación para App Review

Revisión técnica 2026-11-07 sobre build 43 y diff local CW-CX-018. **No enviado a
Apple; no se acredita aprobación ni cumplimiento legal mundial.**

Se consultaron las [App Review Guidelines vigentes](https://developer.apple.com/app-store/review/guidelines/)
(2.1 integridad, 2.3 metadatos, 2.5 API, 3.1 compras, 5.1 privacidad), las
[exigencias de envío](https://developer.apple.com/news/upcoming-requirements/) y
[App Privacy](https://developer.apple.com/app-store/app-privacy-details/).
Se aplican al producto real: organiza medios locales e incluye publicidad y compras.

| Requisito | VERIFICADO | PENDIENTE / NO VERIFICABLE | Responsable / tipo |
| --- | --- | --- | --- |
| Integridad / 2.1 | 119 pruebas, builds y contratos ficticios; CI nativa de la base | Matriz nativa del diff y validación física; ningún crash desconocido puede darse por cerrado | Código + QA |
| API pública / 2.5.1 | PhotoKit/Vision/AVFoundation públicos; retirado esquema privado photos-redirect en build 42 | Analizar binario firmado y dependencias; revisión de API requerida por versión de SDK | Código + archivo macOS |
| Permiso de Fotos | readWrite, acceso limitado y guard nativo; rechazo/cancelación no se presenta como éxito | Diálogos full/limited/denied/restricted/revoked, picker y cambios en vivo reales | Código + QA |
| Purpose strings | NSPhotoLibraryUsageDescription, Add y ATT en plist y es/en/fr/de/it/ar/ja; recurso registrado | Ver cada prompt en sistema por idioma y validar calidad de traducción | Código + lingüística |
| Borrado fiable | Cola reversible; confirmación PhotoKit separada; filtrado de favoritas/ocultas; estado JS usa IDs confirmados | Cancelación/error/parcial real, edición favorita concurrente, pérdida de permiso y reanudación | P0 si falla; QA solo fixtures |
| Política accesible / 5.1.1 | Enlace dentro de Ajustes; fuentes en web/cocowash; URLs es/en respondieron HTTPS 200 | Exactitud y vigencia de todas las declaraciones, datos del responsable y obligaciones regionales | Administración + revisión de privacidad |
| Tratamiento local | Análisis de fotos local; no backend de fotos encontrado; compartir usa acción explícita del usuario | Verificar tráfico en dispositivo. No describir la app entera como sin red: Ads/UMP, StoreKit y geocodificación usan servicios | Código + QA |
| Datos faciales | Personas/Breakup retirados; limpieza de derivados antiguos; Vision aún cuenta rectángulos de caras para clasificación local | Verificar migración desde builds antiguos y que el archivo no incorpore motor/índice retirado ni datos personales | Código + QA |
| Publicidad / ATT / UMP | Consentimiento, canRequestAds, ATT antes del primer request y npa=1 cuando no hay tracking; rating G en código | ATT permitido/denegado/restringido, regiones, revocación, ausencia de red; creatividad/AdChoices/clic accidental durante swipe | Código + AdMob + QA |
| Privacy manifest | Propio incluido en Resources: tracking=true, categorías y razones CA92.1/C617.1 | Informe agregado del archive, dominios/manifiestos/firmas de Google y Capacitor; cobertura de diagnósticos/performance; etiquetas coherentes | Código + archivo + ASC |
| Compras integradas / 3.1.1 | StoreKit 2; transacciones verificadas, restore, cancel/pending; año no autorrenovable, vitalicio, café consumible | Alta de IDs exactos, contratos/pagos/impuestos, precios/regiones, compra/reembolso/restore/caducidad sandbox | Código + administración |
| Accesibilidad | Alternativas por botones, foco, labels, live regions y reduced-motion presentes; navegación por Anclar ejecutada en Edge | VoiceOver y orden de lectura iOS, tamaño de accesibilidad, Switch Control, contraste medido actual y auditoría sin gestos | Código + QA |
| Sin conexión | Recursos UI locales, cachés y mensajes de nube en fuente | Arranque en modo avión, operaciones locales, cache miss, compras/Ads fallan sin bloquear; prueba iCloud real | QA |
| Internacionalización | 7 idiomas en UI, plurales y plist; fallback inglés, RTL árabe; tests i18n y capturas de estrés | Traducción de errores Swift/Live Photo, errores de servicios, texto grande, revisión lingüística y todas las capturas | Código + contenido |
| Requisitos de build | Base compila con SDK 27.1; mínimo 17 configurado | Archive firmado, validación/upload y ejecución de esta entrega | macOS + administración |
| Destinos Apple | Familia iPhone, arm64; sin targets propios iPad/macOS/visionOS | Decidir y revisar modo iPhone en iPad y disponibilidad Mac/visionOS en ASC | Producto + administración + QA |
| Metadatos / 2.3 | Borradores en docs/appstore: ficha 7 idiomas, IAP, notas, privacidad y plan de screenshots | Campos reales, capturas reales del canal tienda, edad, disponibilidad territorial y contacto de revisión | Contenido + administración |

Las etiquetas deben incluir prácticas de los SDK externos. El documento de
[Google sobre divulgación](https://developers.google.com/admob/ios/privacy/data-disclosure)
incluye identificadores, actividad y diagnósticos/rendimiento según configuración.
La presencia de un manifest propio con dominios vacíos no basta para certificar
el agregado: inspeccionarlo antes de añadir o quitar valores especulativos.

El mínimo vigente de envío consultado es Xcode 26+ con SDK iOS 26+; la base
compilada con 27.1 supera ese umbral. **Deployment target 17 no significa SDK 17**.
La optimización Duo necesita su propia validación con SDK 27.1 y Device Hub.

## Lo que se resuelve en código

Permisos/recarga, confirmación veraz, errores y persistencia; geometría y áreas
seguras; accesibilidad y localización; manifests y API justificadas; canal tienda
sin modo developer/reset/anuncios de prueba. La mayoría existe en fuente, con
las limitaciones registradas; no se marca todo como validado.

## Lo que necesita al titular o acceso administrativo

- Apple Developer Program, equipo de firma, App Store Connect y bundle vinculado.
  No se solicitaron claves privadas ni se inspeccionaron certificados personales.
- Elegir versión de lanzamiento, nombre/subtítulo, categoría y territorios; completar
  edad, derechos, contacto, soporte y las respuestas de privacidad/exportación.
- Configurar productos `work.joaquin.mano.noads.year`,
  `work.joaquin.mano.noads.lifetime` y `work.joaquin.mano.coffee`, precios, localizaciones, impuestos,
  contratos y datos bancarios. Confirmar semántica comercial del año no renovable.
- Revisar disponibilidad en Mac y visionOS; familia 1 en Xcode no sustituye estos
  controles. No anunciar un destino que aún no haya sido validado.
- AdMob: catálogo comercial, vínculo de ficha pública, pagos, mensajes regionales
  y verificación del vendedor; no se reconfiguró ninguna cuenta en esta tarea.
- Revisar política y obligaciones de privacidad por mercados. Esta auditoría
  técnica no determina por sí sola la suficiencia jurídica de los textos.
- Proporcionar a revisión instrucciones y medios de ejemplo que no incluyan fotos
  personales. El modo developer de main no debe llegar a producción como atajo.

## Puerta de envío

No enviar hasta cerrar P0/P1 aplicables de [ISSUES](ISSUES.md), demostrar el canal
`release` firmado sin flags de desarrollo y completar los campos reales de ASC.
El valor `ITSAppUsesNonExemptEncryption=false` está declarado; la respuesta de
exportación debe contrastarse con el binario final, incluidos los SDK externos.

## Actualización Fase 2

Se reconsultaron Guidelines, requisitos de SDK y guía TestFlight oficiales. Sin
cambios de política comercial o nuevos servicios. Los checks estáticos pasan para
registros/handlers TS-Swift, escena, mínimo, bundle y recursos; plist/manifiesto
parsean como XML. **No son una compilación Swift ni un informe de privacidad Apple.**

Se añadieron protecciones frente a respuestas fuera de orden y recuperación durante
el borrado; [evidencia](PHASE2.md). Se mantiene pendiente validar PhotoKit,
consentimiento/StoreKit nativos, etiquetas/manifiestos agregados, destinos y firma.
Procedimiento administrativo/técnico concreto en [TESTFLIGHT](TESTFLIGHT.md).
