# Prompt para ChatGPT / Codex: publicar la web de CocoWash en joaquinmino.work

Copia todo lo que hay debajo de la línea.

---

Eres responsable de publicar la web de soporte y privacidad de **CocoWash**, una app de iPhone para ordenar fotos, en mi dominio **joaquinmino.work**, al que tienes acceso. La web ya está terminada y revisada. Tu trabajo es publicarla, crear el correo y dejar listo `app-ads.txt`, sin cambiar el contenido.

## Archivos

Repositorio público `joacomino-dev/mano-iphone`, rama `main`, carpeta **`web/cocowash/`**:
`index.html` (soporte en español), `support.html` (soporte en inglés), `privacidad.html`, `privacy.html`, `style.css`, `assets/` (logo, ilustraciones, fuentes con su licencia OFL) y `app-ads.txt` (plantilla).
La misma web está en local en `C:\Users\Joaco\.codex\visualizations\2026\11\06\01a1b177-e369-7903-b187-58121f584419\cocowash-soporte\dist`. Si las dos copias difieren, manda la del repositorio.

## Qué debes hacer

1. **Publicar la web en `https://joaquinmino.work/cocowash/`** con todos los archivos y sus rutas relativas tal cual.
   - Deben responder con 200 y HTTPS válido: `/cocowash/`, `/cocowash/support.html`, `/cocowash/privacidad.html` y `/cocowash/privacy.html`.
   - Redirige `http` a `https` y `/cocowash` a `/cocowash/`.
   - Tipos MIME correctos: `.woff2` → `font/woff2`, `.webp` → `image/webp`, `.svg` → `image/svg+xml`, `.txt` → `text/plain`.
   - No rompas nada de lo que ya exista en joaquinmino.work.
   - No añadas analítica, cookies, píxeles, fuentes externas ni CDN. La política dice que no hay rastreo propio, y la web debe cumplirlo.
   - Sin cambios de diseño ni de texto. Si algo no funciona en el servidor, corrígelo de la forma mínima y dime qué cambiaste.
2. **Correo `cocowash@joaquinmino.work`**:
   - Créalo como buzón o como reenvío a mi buzón principal, y que yo pueda responder desde esa dirección.
   - Configura SPF, DKIM y DMARC para que no acabe en spam.
   - Envía un correo de prueba de ida y vuelta y confirma que llega.
3. **`app-ads.txt` en la raíz del dominio**: `https://joaquinmino.work/app-ads.txt`, no dentro de `/cocowash/`.
   - Debe responder 200 con `text/plain`, sin redirigir a otro dominio.
   - Contenido: la plantilla de `web/cocowash/app-ads.txt` con `pub-XXXXXXXXXXXXXXXX` sustituido por mi ID de editor real de AdMob (AdMob › Configuración › Información de la cuenta › ID de editor). Formato exacto: `google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0`.
   - Si ya existe un `app-ads.txt`, añade la línea sin borrar las otras.
   - Si todavía no tengo cuenta de AdMob o no ves el ID, no publiques la plantilla con las X: avísame.
   - Puedes borrar la copia de plantilla de `/cocowash/app-ads.txt` en el servidor.
4. **AdMob** (solo si tienes acceso; si no, dame estos pasos como lista):
   - Crear la app iOS «CocoWash» y una unidad de anuncio **nativa**. Dame el ID de app (`ca-app-pub-…~…`) y el de la unidad (`ca-app-pub-…/…`) por privado, sin publicarlos.
   - En «Privacidad y mensajes», crear y publicar:
     - el mensaje del **RGPD** (EEE, Reino Unido y Suiza);
     - el de **regulaciones de estados de EE. UU.**.
     - Ambos en español, inglés, francés, alemán, italiano, árabe y japonés.
   - En ambos mensajes, la URL de privacidad es `https://joaquinmino.work/cocowash/privacy.html`.
   - El mensaje explicativo del IDFA es opcional: la app ya pide el permiso de rastreo de Apple después del formulario de Google.
   - En «Controles de bloqueo», clasificación máxima del contenido de los anuncios: **G**. La app también lo fuerza en el código.
   - Cuando la app esté publicada en la App Store, vincularla en AdMob para que se verifique `app-ads.txt`.
5. **Comprobar al final**, en el navegador y en un ancho de iPhone (390 px):
   - las 4 páginas cargan, sin errores en la consola;
   - el menú, el cambio de idioma y los enlaces internos funcionan;
   - las preguntas frecuentes se abren;
   - el enlace `mailto:` abre el correo;
   - `https://joaquinmino.work/app-ads.txt` devuelve la línea correcta.

## Qué no debes cambiar

- Los textos legales, el responsable (Joaquin Miño, Quito, Ecuador), la fecha (6 de noviembre de 2026) ni el correo `cocowash@joaquinmino.work`.
- Si de verdad hay que cambiar la política, actualiza también la fecha en las dos versiones y avísame para que la app y el repositorio sigan coincidiendo.
- No publiques credenciales, claves, tokens ni datos personales míos en el repositorio ni en la web.

## Qué debes entregarme

1. Las URL finales funcionando.
2. Qué registros DNS y qué configuración del servidor o del correo cambiaste.
3. El resultado de la prueba del correo y de `app-ads.txt`.
4. Los IDs de AdMob, si los creaste, o los pasos que me faltan.
5. Estos datos listos para copiar en App Store Connect:
   - **URL de soporte:** `https://joaquinmino.work/cocowash/`
   - **URL de marketing:** `https://joaquinmino.work/cocowash/`. AdMob busca `app-ads.txt` en la raíz de este dominio.
   - **URL de la política de privacidad:** `https://joaquinmino.work/cocowash/privacidad.html` (en inglés: `https://joaquinmino.work/cocowash/privacy.html`)
   - **Copyright:** `2026 Joaquin Miño`
