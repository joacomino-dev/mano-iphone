# CocoWash · Hoja de ruta a Google Play (Android)

Estado (2026-11-07): **fase 1 hecha, fase 2 en curso** en la rama `android` (worktree
`C:\Users\Joaco\Developer\CocoWash-android`). iOS no se toca: `main` y `release` siguen
como estaban. Plan aprobado por el usuario el 2026-11-07.

Quién: **U** = usuario (cuentas, dinero, testers, arte), **C** = Claude (código, CI,
textos), **U+C** = juntos.

## Decisiones (usuario, 2026-11-07)

- **`applicationId` `work.joaquin.mano`**, igual que el bundle de iOS. Permanente al subir
  el primer AAB.
- **`minSdk 30` (Android 11)**: `MediaStore.createTrashRequest` (papelera de 30 días) y
  `createFavoriteRequest` existen desde ahí; por debajo habría que borrar sin papelera.
- **`targetSdk 36`, `compileSdk 36`**: obligatorio para apps nuevas desde el 31-08-2026.
- **Ramas**: `android` para el trabajo; `main` (desarrollo) y `release` (IDs reales) siguen el
  mismo esquema que en iOS cuando Android se fusione. Los IDs reales de AdMob de Android,
  solo en `release`.
- **Análisis en el dispositivo con LiteRT** y modelos incluidos (embedder para «parecidas»,
  detector de texto ligero, laplaciano para nitidez): no se envía nada a Google. ML Kit se
  descartó porque recoge métricas de uso y diagnóstico sin opción documentada para apagarlas.
- **«Un año sin anuncios»**: producto único que se reconoce y **no se consume** mientras dura;
  caduca a `purchaseTime` + 365 días (calculado en el teléfono, como en iOS) y entonces la app
  lo consume para que se pueda volver a comprar. El alquiler de Play dura como máximo 60 días y
  las suscripciones renovables chocan con la regla «sin suscripciones».

## Requisitos de Play comprobados (fuentes oficiales, 2026-11-07)

| Requisito | Valor vigente |
|---|---|
| Cuenta personal | 25 USD una vez, identidad (documento + tarjeta no prepago), correo y teléfono verificados, **verificar un dispositivo Android** con la app Play Console |
| Prueba cerrada (cuentas personales desde 13-11-2023) | ≥ 12 testers con opt-in **14 días seguidos**; quien se da de baja no cuenta; poca actividad puede alargarla; revisión de producción ≤ 7 días normalmente |
| Nivel de API objetivo | Android 16 (API 36) para apps nuevas y actualizaciones |
| Páginas de 16 KB | obligatorio para actualizaciones desde el 1-02-2027; lo cumplimos ya (AGP ≥ 8.5.1, `zipalign -P 16` en la CI) |
| Play Billing Library | versión 8 o posterior |
| Permisos de fotos y vídeos | `READ_MEDIA_*` solo si el selector del sistema no basta; declaración en Play Console |
| Verificación de desarrolladores | los paquetes de Play se registran en Play Console; el bloqueo de APK sin registrar empezó el 30-09-2026 en Brasil, Indonesia, Singapur y Tailandia (global en 2027) |

## Fase 0 · Cuenta y testers (U) — camino crítico

1. Cuenta de Google Play Console (persona física), identidad y dispositivo verificados.
2. Reunir **15–20 testers** (12 + margen). Recomendado: un grupo de Google como lista de
   testers de la prueba cerrada.
3. Cuando C tenga la primera build usable: crear la app en Play Console, activar Play App
   Signing, crear la clave de subida y guardarla en los secretos de GitHub (ver «Firma»).
4. Empezar la **prueba cerrada en cuanto haya una build usable**: el reloj de 14 días corre
   mientras se terminan análisis, anuncios y compras (cada mejora es una actualización).

## Fase 1 · Plataforma y CI (C) — en curso

- [x] `@capacitor/android` 8.6.0 (integridad verificada contra el registro de npm).
- [x] Proyecto `mano/android`: `minSdk 30`, `targetSdk 36`, Kotlin, versión 0.9.9.1 (1),
      vertical, sin copia de seguridad en la nube ni transferencia, idiomas por app (7),
      tema claro con barras transparentes, arranque en papel liso (sin segundo logo).
- [x] Icono adaptativo y temático desde el icono aprobado de iOS
      (`brand/generate-android-icons.mjs`).
- [x] `npm run sync:android`.
- [x] CI `build-android.yml` (`ubuntu-latest`): tests, `sync:android`, APK de desarrollo +
      AAB, comprobación de paquete/SDK/16 KB, arranque en emulador propio
      (`scripts/android-emulator.sh`: límites de tiempo, un reinicio, fallos como anotaciones
      legibles sin iniciar sesión).
- [x] CI en verde ([42387226062](https://github.com/joacomino-dev/mano-iphone/actions/runs/42387226062))
      y primer APK en Descargas: `CocoWash-0.9.9.1-android-build1-4412172.apk`.

## Fase 2 · `PhotoLibrary` en Kotlin (C) → primera build de la prueba cerrada

Hecho (CW-CL-054): `PhotoLibraryPlugin.kt` con la API de `library.ts` (permisos completo y
parcial, MediaStore, miniaturas en caché acotada, EXIF y lugar con `Geocoder`, tamaños,
papelera con `createTrashRequest` y favoritas recomprobadas, favoritas con
`createFavoriteRequest`, compartir, ajustes, `openLink`, hápticos); vídeo por rangos desde
MediaStore (`CocoWebViewClient`, sin copias); Atrás y gesto predictivo cierran hojas y vista
anclada (`androidBack.ts`); textos Android en 7 idiomas (`locales/android.ts`: galería,
papelera, teléfono, rutas de permisos); Ajustes sin «Fotos en iCloud».

Pendiente: las dos decisiones de abajo, prueba en un teléfono real y «parecidas»/limpieza
(fase 3).

**Decisiones abiertas (U):**
- *Favoritas*: Android pide confirmación del sistema en cada `createFavoriteRequest`. Opciones:
  un diálogo en cada deslizamiento hacia arriba, o guardarlas en CocoWash y pasarlas a la
  galería todas juntas al terminar la ronda (un solo diálogo). `MANAGE_MEDIA` quitaría los
  diálogos, pero también el de la papelera: descartado.
- *Álbum*: en Android los álbumes son carpetas; añadir a uno movería o copiaría el original.
  Hoy el plugin lo rechaza; propuesta: ocultar «Álbum» en Android.

Misma API JS (`src/library.ts`). Permisos `READ_MEDIA_IMAGES`/`VIDEO`, acceso parcial
(`READ_MEDIA_VISUAL_USER_SELECTED`, «Elegir más fotos»), `ACCESS_MEDIA_LOCATION`;
MediaStore (fecha, tamaño, favoritas, ubicación), miniaturas en caché acotada, papelera con
nueva comprobación de favoritas, favoritas del sistema, `Geocoder` (~1 km, caché, solo con
«Ubicación»), vídeo con `WebViewAssetLoader` y rangos, compartir, hápticos, ajustes,
`openLink` (solo https://joaquinmino.work), Atrás y gesto predictivo para cerrar hojas,
márgenes del sistema, `devLog`. Ocultar lo que no existe en Android (iCloud, «ocultas»,
Live Photos). Textos del resumen con la papelera de Android en 7 idiomas.

## Fase 3 · Análisis en el dispositivo (C)

LiteRT con modelos incluidos; caché de vectores como en iOS; comprobar `.so` a 16 KB.

## Fase 4 · Anuncios y compras (C, con U en AdMob/Play)

AdMob nativo (G en código, carta de papel con «Publicidad», retirar en segundo plano, sin
huérfanos al recargar, oculta mientras el hueco se mueve), UMP (sin ATT en Android),
Billing 8 (`acknowledge`, consumo del café, `queryPurchasesAsync`). U: app Android y bloque
nativo en AdMob; productos en Play Console con los mismos IDs que iOS.

## Fase 5 · Tienda y web (U+C)

`docs/playstore/`: seguridad de los datos, declaraciones (anuncios, acceso, público objetivo,
IARC, Fotografía, permiso de fotos), ficha en 7 idiomas (título ≤ 30, breve ≤ 80, completa
≤ 4000, comprobado con script), icono 512, gráfico destacado 1024 × 500, capturas con el modo
de prueba. Web es/en con Android y prompt de redespliegue.

## Fase 6 · Pruebas y producción (U+C)

Informe previo al lanzamiento, prueba cerrada, lista de comprobación (permiso completo y
parcial, biblioteca grande, papelera, compras de prueba, consentimiento con VPN a la UE, 7
idiomas, árabe RTL, letra grande, TalkBack, teléfono pequeño y grande), solicitud de
producción, rama `release` con los IDs reales de Android.

## Firma (cuando U cree las claves)

Nunca en el repositorio ni en los registros. La CI lee estos secretos (todos opcionales):

- **Desarrollo** (APK que se instala encima del anterior): `COCO_DEV_KEYSTORE_B64`,
  `COCO_DEV_KEYSTORE_PASSWORD`, `COCO_DEV_KEY_ALIAS`, `COCO_DEV_KEY_PASSWORD`.
- **Subida a Play** (AAB): `COCO_UPLOAD_KEYSTORE_B64`, `COCO_UPLOAD_KEYSTORE_PASSWORD`,
  `COCO_UPLOAD_KEY_ALIAS`, `COCO_UPLOAD_KEY_PASSWORD`.

Sin ellos, el APK usa una clave desechable (hay que desinstalar el anterior) y el AAB sale
sin firmar.
