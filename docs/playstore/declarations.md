# Declaraciones de Play Console · respuestas

Todas en Play Console › la app › **Contenido de la aplicación** (Policy › App content).
Textos en inglés cuando Play los muestra a revisores; el usuario los pega tal cual.

## Política de privacidad

- URL: **https://joaquinmino.work/cocowash/privacy.html** (inglés; la española es
  …/privacidad.html). Debe incluir la sección Android antes de enviar (ver `web/cocowash/`).

## Anuncios

- ¿Tu app contiene anuncios? **Sí** (AdMob, anuncios nativos con la etiqueta «Publicidad»).

## Acceso a la app

- **Todas las funciones están disponibles sin restricciones especiales** (no hay inicio de
  sesión ni cuentas). Nota para revisores (opcional):
  > No account or sign-in. Allow photo access on the last intro card. To try deleting
  > without touching real photos, open Filters › Settings › Developer mode › Test mode
  > (sample postcards) on development builds; on the store build use any test photos.

## Público objetivo y contenido

- Grupos de edad: **18 o más** y **16-17** y **13-15** (no se marca ningún grupo menor de
  13). La app no está dirigida a menores de 13 (coherente con la política, sección Menores).
- ¿Podría atraer sin querer a niños? **No** (herramienta para ordenar fotos; personajes
  ilustrados pero sin contenido infantil). Si Play pide justificación:
  > CocoWash is a utility to sort and delete photos from the device gallery. Its mascots are
  > a design element; there is no game, story or content aimed at children.
- No se participa en el programa «Diseñado para familias».

## Clasificación de contenido (cuestionario IARC)

- Categoría: **Utilidad, productividad, comunicación u otra** (no juego).
- Violencia, sexualidad, lenguaje soez, sustancias, apuestas: **No** en todo.
- ¿Los usuarios interactúan o intercambian contenido? **No** (sin chat ni contenido
  compartido entre usuarios; «Compartir» abre el menú del sistema con una foto propia).
- ¿Comparte la ubicación del usuario con otros usuarios? **No**.
- ¿Permite compras digitales? **Sí** (compras dentro de la app).
- ¿Contiene anuncios? **Sí** (limitados a clasificación G en código y en AdMob).
- Resultado esperado: la clasificación más baja en todas las regiones (PEGI 3, ESRB
  Everyone, etc.).

## Seguridad de los datos

- Respuestas en `docs/playstore/data-safety.md`.

## Aplicaciones gubernamentales / financieras / de salud

- **No** en todas.

## ID de publicidad

- ¿Tu app usa el ID de publicidad? **Sí**. Finalidades: **Publicidad o marketing**,
  **Analítica**, **Prevención de fraude, seguridad y cumplimiento**. (El SDK de anuncios añade
  el permiso `AD_ID`; no se quita.)

## Categoría y datos de contacto

- Categoría: **Fotografía**. Correo: cocowash@joaquinmino.work. Web:
  https://joaquinmino.work/cocowash/ (sin teléfono público salvo que Play lo exija para
  cuentas de comerciante en la UE).

## Permisos de fotos y vídeos (READ_MEDIA_IMAGES / READ_MEDIA_VIDEO)

Play pide explicar por qué el selector de fotos del sistema no basta. Formulario en
**Contenido de la aplicación › Permisos de fotos y vídeos**. Texto propuesto (inglés,
≈ 900 caracteres; ajustar si el campo tiene otro límite):

> CocoWash is a gallery-cleaning app: its core function is to go through the user's whole
> photo and video library, one item at a time, so they can keep, favorite, postpone or
> delete each one, and to find near-duplicate photos, screenshots and blurry shots across
> the entire library. This requires broad, persistent access to all photos and videos:
> the app enumerates the library (MediaStore), shows every item in order, measures file
> sizes to report the space freed, and moves the items the user confirms to the system
> trash with MediaStore.createTrashRequest (Android shows its own confirmation; items stay
> 30 days in the trash). The Photo Picker returns only items the user selects once, so it
> cannot offer a full review of the library, keep track of what was already reviewed, or
> detect similar photos and screenshots the user has not picked. All analysis runs on the
> device; no photo or video is uploaded. On Android 14+ users may grant partial access
> («Select photos») and the app works on that selection, with a button to choose more.

- Vídeo demostrativo (si Play lo pide): grabación de la app con fotos de prueba del
  emulador, sin fotos personales.

## Permiso de ubicación multimedia (ACCESS_MEDIA_LOCATION)

No es un permiso restringido de Play, pero conviene explicarlo en la ficha de privacidad:
lee la ubicación EXIF de una foto para mostrar el lugar en la postal (solo con «Ubicación»
activado en Ajustes); las coordenadas salen redondeadas a ~1 km hacia el geocodificador.

## Compras dentro de la app

Ver `docs/playstore/in-app-products.md`.
