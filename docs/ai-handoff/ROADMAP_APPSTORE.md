# CocoWash · Hoja de ruta a la App Store (1.0)

Estado (2026-11-07): **0.9.9.1 (41)** en `main` (desarrollo) y en `release` (canal App Store
con anuncios reales), ambas con CI en verde. Diseño y funciones aprobados por el usuario. App solo para iPhone
(`TARGETED_DEVICE_FAMILY = 1`), iOS 17+, 7 idiomas (es, en, fr, de, it, ar, ja).

Quién: **U** = usuario (cuentas, dinero, decisiones legales, arte), **C** = Claude/Codex
(código, CI, textos), **U+C** = juntos.

## Fase 1 · Cuentas y legal (U) — bloquea todo lo demás

1. **Apple Developer Program** activo (99 USD/año) con el bundle `work.joaquin.mano`.
2. **App Store Connect**: crear la app «CocoWash» (comprobar que el nombre está libre),
   idioma principal español, SKU.
3. **Acuerdo de apps de pago**, datos bancarios y fiscales (necesario aunque la app sea
   gratis, porque vende compras dentro de la app).
4. **DSA (UE)**: declarar si eres «comerciante». Como hay compras y anuncios, lo normal es
   que sí: tu dirección, teléfono y correo serán públicos en la ficha europea.
5. ~~AdMob~~ — hecho el 2026-11-06 (Codex): app iOS sin publicar, bloque «CocoWash iOS
   Nativo», clasificación máxima G, mensajes RGPD (6 idiomas) y estados de EE. UU. (inglés de
   EE. UU., español, español latinoamericano) publicados. **Falta: perfil de pagos (U).**
6. ~~Web de soporte y privacidad~~ — publicada el 2026-11-06 en
   https://joaquinmino.work/cocowash/ (idéntica a `web/cocowash/` de `3ff1b20`, comprobada).
   ~~Correo `cocowash@joaquinmino.work`~~ — operativo (SPF, DKIM y DMARC en pass).
   ~~`app-ads.txt`~~ — publicado en https://joaquinmino.work/app-ads.txt (200 text/plain).
7. **Marca**: comprobar que «CocoWash» no choca con una marca registrada en tus mercados.

## Fase 2 · Arte (U)

1. Icono del basurero (sello «Eliminar») definitivo y la otra imagen pendiente.
2. **Icono de la app** 1024×1024 sin transparencia (revisar el actual en
   `Assets.xcassets`).
3. Revisar en el iPhone las 4 estampas con la palabra debajo junto al basurero nuevo.

## Fase 3 · Versión 1.0 en código (C)

1. ~~Fusionar las ramas 9.8.x en `main`~~ — hecho (0.9.9.1, autorizado por el usuario).
2. ~~Retirar el modo de prueba~~ — resuelto con el canal: en `release`, `DEVELOPER = false`
   oculta «Modo developer» y fuerza el modo de prueba y los anuncios de prueba a apagados;
   `CocoWashTestAds` solo lo añade el flujo de desarrollo. `verify-release.yml` lo comprueba.
3. ~~IDs reales de AdMob~~ — en la rama **`release`** desde 0.9.9.1 (40): app
   `ca-app-pub-5676353604168025~4587143429`, bloque nativo `…/8219266678` (no son secretos:
   van en cada IPA y el ID de editor está en `app-ads.txt`).

   **Ramas (desde 0.9.9.1 (40)):** `main` es desarrollo — IDs de muestra y bloque de prueba
   de Google, «Modo developer» en Ajustes (modo de prueba y anuncios sí/no), IPA en cada
   push (`build-people-dev.yml`). `release` = `main` + un único commit de canal: IDs reales
   y `DEVELOPER = false` en `mano/src/channel.ts`; `verify-release.yml` lo compila sin firmar
   y comprueba IDs reales, sin anuncios de prueba ni modo developer. Para publicar: fusionar
   `main` en `release` (esas dos líneas no se tocan en `main`), subir versión y firmar.
4. ~~Manifiesto de privacidad~~ — hecho en 0.9.9.1: seguimiento declarado e
   identificador, datos de anuncios, interacción, ubicación aproximada y fallos para
   publicidad de terceros (revisar si cambian los formatos de anuncio).
5. **Compras en App Store Connect** (textos en 7 idiomas listos en
   `docs/appstore/in-app-purchases.md`) con estos IDs exactos:
   - `work.joaquin.mano.noads.year`: **suscripción no renovable** (1 año).
   - `work.joaquin.mano.noads.lifetime`: **no consumible**.
   - `work.joaquin.mano.coffee`: **consumible** (propina).
   Precios a tu elección. Cada uno lleva nombre y descripción en los 7 idiomas y una
   captura para la revisión.
6. **Versión 1.0 (build 1)**, `CAPACITOR_DEBUG` desactivado, sin reinicio de desarrollo ni
   diagnósticos de desarrollo en Release.
7. **Firma y subida**: certificado de distribución y perfil App Store; subir con Xcode en un
   Mac o con un flujo de CI que use una clave de la API de App Store Connect guardada como
   secreto (nunca en el repositorio ni en los registros).
8. **Riesgos de revisión ya identificados**:
   - ~~«Abrir Fotos» (`photos-redirect://`, esquema no documentado)~~ — retirado en
     0.9.9.1 (42): el resumen deja solo los tres pasos.
   - Anuncios nativos: deben verse claramente como anuncio («Publicidad» ya lo está).
   - El café es una propina: no desbloquea nada; el texto ya lo dice.

## Fase 4 · Ficha de la tienda (U+C)

1. Borrador listo en `docs/appstore/listing.md` (7 idiomas, límites comprobados). Falta
   revisión nativa o con `asodev`/`unslop`.
2. **Capturas** de iPhone 6,9": plan y textos en 7 idiomas en `docs/appstore/screenshots.md`
   (siempre con Modo de prueba y anuncios apagados: ninguna foto personal).
3. **Etiquetas de privacidad** (App Privacy): respuestas listas en
   `docs/appstore/app-privacy.md` (también clasificación por edad y campos de la ficha).
4. Clasificación por edad (cuestionario), categoría (Fotografía o Utilidades), URL de soporte
   y de privacidad, copyright.
5. **Notas para la revisión**: borrador en `docs/appstore/review-notes.md`.
6. **Países**: todos menos, al principio, **China continental** (exige número ICP).

## Fase 5 · TestFlight y pruebas finales (U+C)

1. TestFlight interno con la 1.0 firmada (anuncios reales en modo prueba de AdMob con tu
   iPhone registrado como dispositivo de prueba, para no generar clics inválidos).
2. Comprobar en el iPhone:
   - compras en sandbox: comprar, restaurar, año que caduca, café repetido;
   - consentimiento RGPD (con VPN a la UE) y ATT aceptando y rechazando;
   - biblioteca grande (10 000+ fotos), muchas en iCloud, modo avión, acceso limitado;
   - los 7 idiomas, árabe de derecha a izquierda, texto grande, VoiceOver básico;
   - un iPhone pequeño (SE) y uno con iOS 17 si es posible.
3. Leer los informes de fallos de TestFlight / Organizador de Xcode (sin telemetría propia).

## Fase 6 · Envío y lanzamiento (U)

1. Enviar a revisión (normalmente 1–3 días). Si rechazan, se responde o se corrige y se
   reenvía.
2. Lanzamiento manual o programado; vincular la app publicada en AdMob (URL de marketing
   https://joaquinmino.work/cocowash/) y comprobar que `app-ads.txt` figura como verificado.

## Después del lanzamiento

- Primera semana: fallos en el Organizador, valoraciones, rendimiento de AdMob (relleno,
  tasa de cumplimiento del consentimiento).
- 1.0.1 para lo que salga; revisar el texto en contexto de cada idioma con hablantes
  nativos.

## Ruta corta

Hecho: AdMob, web, correo, `app-ads.txt`, IDs reales, canal `release`, privacidad (manifiesto,
ATT, enlaces en la app, política RGPD/LOPDP/EE. UU.). Siguiente: U: Apple Developer, App Store
Connect, acuerdo de pago, DSA, pagos de AdMob, marca, iconos → C: compras en 7 idiomas,
1.0 (1) en `release`, firma y subida → U+C: ficha, capturas, etiquetas de privacidad →
TestFlight → envío.
