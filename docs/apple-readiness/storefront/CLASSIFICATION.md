# Clasificación, compras y localización para revisión

2026-11-08. Borrador operativo; no se ha respondido ningún cuestionario de tienda.

- Fuente de ficha: metadata.json,7 idiomas es/en/fr/de/it/ar/ja. Los locales de ambas consolas están mapeados explícitamente; el titular confirma los países y el idioma principal.
- Explicación de permisos/notas de revisión: review-localizations.json,7 idiomas. No se pide cuenta/login. No introducir credenciales ni nombres de bibliotecas personales en notas o capturas.
- Compras: textos7 idiomas existentes en docs/appstore/in-app-purchases.md y docs/playstore/in-app-products.md. Mantener IDs y tipos; nombres/precios/productos de consola requieren propietario. Pase anual de pago único, nunca anunciar renovación automática; café no elimina anuncios.
- Cuestionarios de edad Apple/IARC: declarar publicidad y compras activas; no hay chat, contenido público aportado por usuarios, navegación web general, apuestas ni juegos de azar implementados. Las fotos privadas del dispositivo no forman una comunidad pública de contenido. Contrastar las preguntas exactas de la consola y la clasificación del inventario publicitario, y guardar el resultado calculado por tienda/región. No asignar automáticamente una edad mundial ni declarar una aprobación.
- Accesibilidad en tienda: no marcar VoiceOver, texto grande o Reduce Motion como certificados globalmente por las comprobaciones DOM. Faltan pruebas nativas de todas las funciones y7 idiomas.
- Publicación global: el propietario debe elegir territorios y completar requisitos de comerciante y regionales aplicables. La existencia de traducciones no acredita registros comerciales/legales ni disponibilidad efectiva en una tienda.

## Verificación ejecutada

8 pruebas Release PASS:se añadieron dos regresiones que fallaban antes (idioma omitido y palabras clave UTF-8 que superan100bytes pese a tener menos100caracteres). Cada localización pasa nombre/subtítulo30,keywords100bytes,promocional170,descripción/notas4000. Las fichas de Play existentes pasan7 idiomas y30/80/4000.

Fuentes oficiales consultadas2026-11-08: [Apple versión de plataforma](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information), [información de app](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information), [compras](https://developer.apple.com/help/app-store-connect/reference/in-app-purchases-and-subscriptions/in-app-purchase-information). La validación de longitud no certifica una traducción revisada por hablantes nativos ni la publicación de URLs.
