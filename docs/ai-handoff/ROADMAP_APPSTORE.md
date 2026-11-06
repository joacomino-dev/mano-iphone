# CocoWash · Hoja de ruta a la App Store (1.0)

Estado (2026-11-06): **0.9.9.1 (35) es la versión principal en `main`**, probada por el
usuario y aprobada en diseño y funciones. App solo para iPhone
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
5. **AdMob**: crear la app iOS, una unidad **nativa** y anotar el ID de app y el de unidad.
   Configurar en «Privacidad y mensajes» el mensaje RGPD y el de estados de EE. UU. (la app
   ya pide el permiso de rastreo por sí misma desde 0.9.9.1 (37) y limita los anuncios a G).
6. ~~Web de soporte y privacidad~~ — hecha en `web/cocowash/` (es/en, responsable, bases
   legales RGPD/LOPDP, aviso de EE. UU.). Falta publicarla en
   https://joaquinmino.work/cocowash/, crear `cocowash@joaquinmino.work` y poner en la raíz
   del dominio `app-ads.txt` con el ID de editor de AdMob (lo hace ChatGPT/Codex).
7. **Marca**: comprobar que «CocoWash» no choca con una marca registrada en tus mercados.

## Fase 2 · Arte (U)

1. Icono del basurero (sello «Eliminar») definitivo y la otra imagen pendiente.
2. **Icono de la app** 1024×1024 sin transparencia (revisar el actual en
   `Assets.xcassets`).
3. Revisar en el iPhone las 4 estampas con la palabra debajo junto al basurero nuevo.

## Fase 3 · Versión 1.0 en código (C)

1. ~~Fusionar las ramas 9.8.x en `main`~~ — hecho (0.9.9.1, autorizado por el usuario).
2. **Retirar el modo de prueba**: sección en Ajustes, chip, `testMode.ts`, rondas de
   postales y el flag `CocoWashTestAds` del flujo de publicación.
3. **IDs reales de AdMob** en `COCO_ADMOB_APP_ID` y `COCO_ADMOB_NATIVE_UNIT_ID` (hoy son
   los de prueba de Google). Nunca en un repositorio público si decides que no deben verse;
   como mínimo, fuera de los registros de la CI.
4. ~~Manifiesto de privacidad~~ — hecho en 0.9.9.1: seguimiento declarado e
   identificador, datos de anuncios, interacción, ubicación aproximada y fallos para
   publicidad de terceros (revisar si cambian los formatos de anuncio).
5. **Compras en App Store Connect** con estos IDs exactos:
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
   - «Abrir Fotos» usa `photos-redirect://`, un esquema no documentado. Si Apple lo objeta,
     el botón se quita y quedan solo los tres pasos (ya escritos en pantalla).
   - Anuncios nativos: deben verse claramente como anuncio («Publicidad» ya lo está).
   - El café es una propina: no desbloquea nada; el texto ya lo dice.

## Fase 4 · Ficha de la tienda (U+C)

1. Borrador listo en `docs/appstore/listing.md` (7 idiomas, límites comprobados). Falta
   revisión nativa o con `asodev`/`unslop`.
2. **Capturas** de iPhone 6,9" (obligatorias) y, opcionalmente, 6,5": pila con estampa,
   «Una última mirada», resumen, Filtros y Ajustes. Mejor desde la versión 1.0 en un iPhone
   real; C puede preparar marcos y textos superpuestos por idioma.
3. **Etiquetas de privacidad** (App Privacy) coherentes con el punto 3.4: datos usados para
   anuncios de terceros; «seguimiento» solo si el usuario lo permite en ATT.
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
2. Lanzamiento manual o programado; vincular la app publicada en AdMob (necesario para que
   `app-ads.txt` se verifique).

## Después del lanzamiento

- Primera semana: fallos en el Organizador, valoraciones, rendimiento de AdMob (relleno,
  tasa de cumplimiento del consentimiento).
- 1.0.1 para lo que salga; revisar el texto en contexto de cada idioma con hablantes
  nativos.

## Ruta corta

U: Fases 1–2 (cuentas, AdMob, web con privacidad y `app-ads.txt`, iconos) → C: Fase 3
(1.0 sin modo de prueba, IDs reales, privacidad, PR a `main`) → U+C: Fase 4 (ficha y
capturas) → Fase 5 (TestFlight) → Fase 6 (envío).
