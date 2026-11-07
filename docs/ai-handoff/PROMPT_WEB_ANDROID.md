# Prompt para ChatGPT / Codex: actualizar la web de CocoWash (Android) y AdMob Android

Copia todo lo que hay debajo de la línea.

---

Mantienes la web de soporte y privacidad de **CocoWash** en **https://joaquinmino.work/cocowash/**
(ya publicada el 6-11-2026). Ahora hay que **redesplegarla** con la versión para Android y
preparar AdMob para la app Android. No cambies el contenido ni el diseño.

## Archivos

Repositorio público `joacomino-dev/mano-iphone`, rama **`android`**, carpeta **`web/cocowash/`**.
Cambian `index.html`, `support.html`, `privacidad.html` y `privacy.html`; el resto (`style.css`,
`assets/`, `app-ads.txt`) no cambia. Si la rama `android` ya se fusionó en `main`, usa `main`.

Cambios que verás:
- Política (es/en): título «Tus fotos se quedan en tu teléfono», nueva sección «En teléfonos
  Android» / «On Android phones» (`#android`), resumen y derechos con Android y Google Play,
  fecha **7 de noviembre de 2026**.
- Ayuda (es/en): grupo «En Android» / «On Android» con 4 preguntas (acceso, papelera,
  favoritas, compras de Google Play).
- Pendiente de antes, incluido aquí: la pregunta del espacio ya no menciona «Abrir Fotos».

## Qué debes hacer

1. **Redesplegar** los cuatro HTML en `https://joaquinmino.work/cocowash/` con las mismas rutas.
   - Comprueba que responden 200 con HTTPS: `/cocowash/`, `/cocowash/support.html`,
     `/cocowash/privacidad.html`, `/cocowash/privacy.html`, y que existen las anclas
     `privacidad.html#android` y `privacy.html#android`.
   - Que la caché no sirva la versión anterior (invalida la CDN si la hay).
   - Sin analítica, cookies, píxeles, fuentes externas ni CDN nuevos.
2. **`app-ads.txt`**: no cambia. Sigue en `https://joaquinmino.work/app-ads.txt` con
   `pub-5676353604168025`; vale para la app Android. Solo confirma que responde 200 `text/plain`.
3. **AdMob** (si tienes acceso; si no, dame los pasos como lista):
   - Crear la app **Android** «CocoWash» (sin publicar todavía en Play; paquete
     `work.joaquin.mano`) y una unidad de anuncio **nativa** «CocoWash Android Nativo».
   - Clasificación máxima de contenido: **G** (como la de iOS).
   - En «Privacidad y mensajes», añadir la app Android a los mensajes ya publicados del
     **RGPD** y de **estados de EE. UU.** (mismos idiomas y la misma URL de privacidad
     `https://joaquinmino.work/cocowash/privacy.html`).
   - Dame por privado el **ID de app** (`ca-app-pub-5676353604168025~…`) y el de la **unidad**
     (`ca-app-pub-5676353604168025/…`). No son secretos (van dentro de la app), pero no los
     publiques: van solo en la rama `release`.
4. Al terminar, dime qué URL comprobaste, el resultado (código y tipo) y cualquier cambio
   mínimo que hiciste en el servidor.

## Límites

- No toques otras partes de joaquinmino.work.
- No publiques fotos personales, credenciales ni claves.
- No es asesoramiento legal: si ves algo en la política que no cuadra con la app, avísame
  en vez de cambiarlo.
