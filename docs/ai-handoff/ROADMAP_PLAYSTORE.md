# CocoWash · Hoja de ruta a Google Play (Android)

> **Histórico (2026-11-07).** El roadmap vigente y único es [docs/ROADMAP.md](../ROADMAP.md). Este archivo
> conserva el detalle de Google Play; las referencias a ramas `release`/`android` quedaron obsoletas: solo existe `main`.

Estado (2026-11-07, tarde): **fases 1–5 hechas en código y documentos** en la rama `android`
(worktree `C:\Users\Joaco\Developer\CocoWash-android`); falta lo que necesita cuentas, un
teléfono o modelos (tabla). iOS no se toca: `main` y `release` siguen como estaban. Plan
aprobado por el usuario el 2026-11-07.

## Equivalencia con iOS (0.9.9.1)

| Pieza | iOS | Android | Cómo se comprueba sin teléfono |
|---|---|---|---|
| Interfaz, gestos, 7 idiomas, RTL | React | La misma | Vista previa del navegador con «Pixel 10» (textos Android) |
| Permiso completo / limitado | PhotoKit | MediaStore, «Seleccionar fotos» (14+) | E2E en emulador (completo) |
| Pila, miniaturas, tamaños, metadatos, lugar | PhotoKit, CLGeocoder | MediaStore, loadThumbnail, EXIF, Geocoder | E2E |
| Vídeo en la carta | Esquema `cocowash-media` | Rangos 206 desde MediaStore | E2E (206, 100 bytes) |
| Eliminar | Fotos confirma, 30 días | Android confirma, papelera 30 días | E2E (cancelar y confirmar) |
| Favoritas nunca se borran | Recomprobación | Recomprobación | E2E |
| Favoritas | Al instante | **Juntas al terminar** (decisión) | Tests de la cola |
| Parecidas | Vision feature prints | dHash 64 bits (casi iguales) | — (pendiente: embedder LiteRT) |
| Borrosas / oscuras / caras | Vision + laplaciano | Laplaciano, brillo, FaceDetector | — |
| Texto y documentos | Vision OCR | **Pendiente** (modelo de detección) | — |
| Mejor toma | Estética iOS 18 o nitidez | Nitidez | — |
| Atrás / gesto predictivo | — | Cierra hojas y vista anclada | E2E |
| Pantalla completa del vídeo | AVPlayer | Reproductor del sistema | — |
| Live Photos, «ocultas», iCloud | Sí | No existen en Android (ocultos) | — |
| Álbum | Sí | **Decisión pendiente** (hoy da aviso) | — |
| Anuncios + consentimiento | AdMob nativo, UMP + ATT | AdMob nativo, UMP (sin ATT) | E2E con anuncio de prueba |
| Compras | StoreKit 2 | Play Billing 8 | Solo con Play Console (licencias de prueba) |
| Modo developer, cerrar hojas deslizando, resumen sin «Abrir Fotos» | Sí | Sí (mismo código web) | Vista previa |

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
- ~~*Favoritas*~~ — decidido (usuario, 2026-11-07): **juntas al terminar la ronda**. En
  Android el corazón es decisión de CocoWash al instante y llega a la galería en un lote al
  abrirse el resumen (un diálogo para añadir y otro, si hace falta, para quitar). Antes de
  «Eliminar» se envían primero los corazones quitados de esos elementos. Pendientes guardados
  en `localStorage` si se cierra la app; «Cancelar» en el diálogo descarta ese lote
  (`favoriteQueue.ts`). `MANAGE_MEDIA` descartado: quitaría también el diálogo de la papelera.
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

Hecho sin modelos (CW-CL-056): nitidez, brillo y caras; «parecidas» por dHash con caché.
Pendiente: embedder LiteRT para «parecidas» de verdad y detector de texto (modelos incluidos,
licencia y `.so` a 16 KB); la caché de `classify` ya está versionada para recalcular.

## Fase 4 · Anuncios y compras (C, con U en AdMob/Play)

AdMob nativo (G en código, carta de papel con «Publicidad», retirar en segundo plano, sin
huérfanos al recargar, oculta mientras el hueco se mueve), UMP (sin ATT en Android),
Billing 8 (`acknowledge`, consumo del café, `queryPurchasesAsync`). U: app Android y bloque
nativo en AdMob; productos en Play Console con los mismos IDs que iOS.

Hecho en código (CW-CL-056): `CocoMonetizationPlugin.kt` + `CocoNativeAdCard.kt`. Pendiente U:
IDs reales de AdMob Android (prompt en `PROMPT_WEB_ANDROID.md`), productos en Play Console
(`docs/playstore/in-app-products.md`), clave pública de licencias para verificar compras.

## Fase 5 · Tienda y web (U+C)

`docs/playstore/`: seguridad de los datos, declaraciones (anuncios, acceso, público objetivo,
IARC, Fotografía, permiso de fotos), ficha en 7 idiomas (título ≤ 30, breve ≤ 80, completa
≤ 4000, comprobado con script), icono 512, gráfico destacado 1024 × 500, capturas con el modo
de prueba. Web es/en con Android y prompt de redespliegue.

Hecho (CW-CL-056): `docs/playstore/` (ficha comprobada por la CI, seguridad de los datos,
declaraciones con el texto del permiso de fotos, productos, plan gráfico), web es/en con la
sección Android (sin publicar: `PROMPT_WEB_ANDROID.md`). Pendiente U: gráfico destacado y capturas.

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

## Auditoría crítica (2026-11-07, tras probar el usuario en el navegador)

Comparación visual (`mano/tests/qa-android-compare.mjs`, capturas en `work/qa-android-compare/`):
la interfaz es la misma en iPhone y Pixel 10; cambian el marco del sistema y los textos de
plataforma. Fallos visibles en Android: «Live Photos» en Filtros › Contenido, «Texto y
documentos» siempre vacío en un teléfono real (sin detector), «Álbum» sin función.

**P0 · antes de la prueba cerrada**
1. U: teléfono Android 11+ (Play Console exige verificar uno; sin él no hay cuenta).
2. ~~C: ocultar en Android «Live Photos», «Texto y documentos» y «Álbum»~~ — hecho (build 3).
3. ~~C: E2E del emulador en verde~~ — 17/17 ([CI 42416406276](https://github.com/joacomino-dev/mano-iphone/actions/runs/42416406276)); la carta de anuncio queda para un teléfono real (Play services del emulador antiguo).
4. C + U aprueba: fusionar `android` en `main`. iOS verificado en la rama ([CI 42413945600](https://github.com/joacomino-dev/mano-iphone/actions/runs/42413945600): IPA y arranque). Falta la aprobación.
5. U: keystore de desarrollo ya creado en `C:UsersJoacoDevelopercocowash-keys` (LEEME); falta pegarlo en los secretos.

**P1 · antes de pedir producción**
6. C: detector de texto LiteRT incluido (16 KB, sin red).
7. C: «parecidas» con embedder LiteRT (mejora «Mejor toma»).
8. C + U (IDs): rama `release` Android (IDs reales, `DEVELOPER=false`, AAB firmado, comprobación sin anuncios de prueba).
9. C + U (clave): verificar la firma de compras con la clave de licencias.
10. C: carta de anuncio con Fredoka y espejo RTL; captura con anuncio de prueba.
11. C: vídeo a pantalla completa dentro de la app.
12. Testers + informe previo: rendimiento (10 000+), gama baja, letra grande, TalkBack, árabe.

**P2 · después**: animación del Atrás predictivo, vibración por gama, icono temático.

## Ruta de publicación (con anuncios)

| Etapa | Cuándo | Quién | Pasa cuando |
|---|---|---|---|
| Teléfono, cuenta Play Console, grupo de 15–20 testers | días 1–3 | U | cuenta verificada, grupo ≥ 15 |
| AdMob Android + mensajes, web redesplegada, app en Play Console, App Signing + clave de subida, productos + licencias de prueba, ficha/datos/declaraciones/IARC | días 2–6 | U + C | AAB firmado sin IDs de prueba, ficha completa |
| Prueba interna + informe previo al lanzamiento | días 5–7 | U + C | sin fallos graves, compras de prueba OK |
| Prueba cerrada (≥ 12 testers, 14 días seguidos, una actualización por semana) | días 7–21 | U + testers + C | 14 días cumplidos, sin P0/P1 abiertos |
| Solicitud de producción (cuestionario) | día ~22 | U (C redacta) | aprobada (≤ 7 días normalmente) |
| Producción escalonada 10 → 50 → 100 %, vincular AdMob, `app-ads.txt` verificado | días ~25–35 | U + C | vitals sanos, anuncios sirviendo |

Riesgos: sin teléfono (bloquea todo), prueba cerrada floja, declaración del permiso de fotos,
anuncio en la pila (política de anuncios: etiqueta y sin toques accidentales), romper iOS al fusionar.
