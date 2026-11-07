# Prompt para un chat nuevo: CocoWash para Android (Google Play)

Copia todo lo que hay debajo de la línea.

---

Vamos a empezar la versión **Android** de **CocoWash** y a prepararla para **Google Play**, mientras la versión de iPhone espera la cuenta de Apple. El objetivo es llegar a producción en Play con la misma calidad que la de iOS, sin romper nada de iOS.

## Contexto del proyecto

- **Qué es CocoWash:** una app para ordenar la biblioteca de fotos con decisiones rápidas. Cada foto llega como una postal y se decide con un gesto:
  - derecha conserva; izquierda marca para eliminar; arriba favorita; abajo «Más tarde»;
  - «Terminar» abre «Una última mirada», donde se puede recuperar todo, y solo «Eliminar» borra, siempre con la confirmación del sistema.
  - Lema: «Lo que importa, se queda». Personajes: Coqui (un coco) y Memo (un cerebro). Marca «Sello y papel»: papel cálido `#F3ECE1`, tinta `#253A3A`, turquesa `#1E7470`, rosa `#EF9A98`, café `#8A4B2D`; fuentes Fredoka y Patua One.
- **Repositorio:** GitHub público `joacomino-dev/mano-iphone`, con dos ramas:
  - `main` (desarrollo): anuncios de prueba de Google y «Modo developer» en Ajustes.
  - `release` (App Store): `main` más un commit con los IDs reales de AdMob y `DEVELOPER = false` en `mano/src/channel.ts`.
- **Copia de trabajo:** `C:\Users\Joaco\Developer\CocoWash-b24` (rama `claude/cocowash-9.8.6`, igual que `main`). No uses ni sobrescribas la copia de OneDrive (`C:\Users\Joaco\OneDrive\Documentos\ChatGPT\iPhone`): está atrasada y tiene cambios de otros sin guardar.
- **Node:** no está en el PATH. Usa `C:/Users/Joaco/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe` y los binarios de `mano/node_modules/.bin`.
- **Lee primero:**
  - `AGENTS.md`, `CLAUDE.md` y `mano/AGENTS.md` (reglas comunes);
  - `mano/README.md` (arquitectura y ramas);
  - `docs/ai-handoff/ROADMAP_APPSTORE.md`;
  - `docs/appstore/` (ficha, compras, privacidad, capturas);
  - `docs/ai-collaboration/CLAUDE_LOG.md` desde CW-CL-045.
- **Versión actual:** iOS 0.9.9.1 (build 42), diseño y funciones aprobados por el usuario.
- **Pila técnica:**
  - React 19 + TypeScript en WebView con Capacitor 8.
  - Dos plugins nativos en Swift con API JS fija:
    - `PhotoLibrary` (`mano/ios/App/App/PhotoLibrary.swift`): PhotoKit, Vision, vídeo, compartir, borrar, nombres de lugar, enlaces;
    - `CocoMonetization` (`CocoMonetization.swift`): AdMob nativo con tarjeta propia, UMP + ATT, StoreKit 2.
  - Contrato JS: `mano/src/library.ts` y `mano/src/Monetization.tsx`.
  - 7 idiomas (es, en, fr, de, it, ar con RTL, ja), con el español como clave en `mano/src/locales/`.
- **Reglas que no se rompen:**
  - Procesamiento en el dispositivo. Sin servidores propios, cuentas, analítica, telemetría ni APIs de pago.
  - Las fotos nunca salen del teléfono.
  - Deslizar nunca borra: solo «Eliminar» en la revisión, confirmado por el sistema, volviendo a comprobar favoritas.
  - El QA de borrado se hace solo con la demo o el modo de prueba, nunca con la biblioteca personal del usuario.
  - Solo APIs públicas y documentadas.
  - No subir a `main` ni publicar nada sin aprobación del usuario. Commits con autor `joacomino-dev <joaco.mino@gmail.com>` y `Co-Authored-By` de Claude.

## Ya existe y se reutiliza

- **Web de soporte y privacidad:** https://joaquinmino.work/cocowash/ (fuente en `web/cocowash/`).
  - Correo: cocowash@joaquinmino.work. Responsable: Joaquin Miño, Quito (Ecuador).
  - La política cubre RGPD, la LOPDP de Ecuador y los estados de EE. UU., pero habla de iPhone, Apple, StoreKit y ATT: hay que ampliarla a Android (ver la sección «Privacidad»).
  - **Pendiente de antes:** redesplegar `web/cocowash/index.html` y `support.html`. La FAQ de espacio ya no menciona «Abrir Fotos»; ese botón se retiró de la app.
  - `https://joaquinmino.work/app-ads.txt` ya está verificado con el ID de editor `pub-5676353604168025`; vale también para Android.
- **AdMob:** cuenta creada, clasificación G y mensajes de consentimiento RGPD y de estados de EE. UU. publicados (para la app iOS). Hay que crear la app Android y su bloque nativo.
- **Textos de la tienda:** `docs/appstore/listing.md` (7 idiomas), `in-app-purchases.md` y `screenshots.md`. Adáptalos a Play.

## Qué hay que hacer

### 0. Antes de nada, el camino crítico (el usuario)

Explica al usuario, paso a paso y en este orden:

1. **Cuenta de Google Play Console** (pago único de 25 USD) como persona física. Requiere verificación de identidad.
2. **Prueba cerrada:** las cuentas personales nuevas deben hacer una prueba cerrada con al menos **12 testers** durante **14 días seguidos** antes de pedir acceso a producción. Es lo que más tarda: planifícalo pronto. Comprueba el requisito vigente en la ayuda de Play Console.
3. **Testers:** pregúntale si tiene un teléfono Android para probar y cómo va a reunir a esos 12 testers.

### 1. Plan y estructura (presenta el plan antes de programar)

- **Plataforma:** añadir la plataforma Android de Capacitor en `mano/android`, con `applicationId` `work.joaquin.mano`, el mismo que iOS; decídelo con el usuario, porque es permanente.
- **Versión mínima:** propón `minSdk` 30 (Android 11), porque la papelera y las favoritas del sistema existen desde ahí. Justifica la elección.
- **Versión objetivo:** `targetSdk` la que Google exija en la fecha (comprueba si es API 35 o 36).
- **Ramas:** `android` para el trabajo, sin tocar iOS. Mantén el mismo esquema: los IDs reales de AdMob para Android solo en `release`.
- **Plugins en Kotlin** con **la misma API JS** que los de Swift, para que la web no cambie. Donde haga falta, detecta la plataforma con `Capacitor.getPlatform()`. Ojo: `Monetization.tsx` solo activa anuncios si la plataforma es `ios`.

### 2. Equivalencias nativas (Kotlin)

- **Fotos:**
  - MediaStore para listar fotos y vídeos, con fecha, tamaño, favoritas y ubicación.
  - Permisos `READ_MEDIA_IMAGES` y `READ_MEDIA_VIDEO`, y en Android 14+ el acceso parcial `READ_MEDIA_VISUAL_USER_SELECTED`, equivalente al «Acceso limitado» de iOS. Debe existir un botón para elegir más fotos.
  - **Política de Google sobre permisos de fotos y vídeos:** una app de limpieza de galería necesita acceso amplio, y hay que rellenar la **declaración en Play Console** con una justificación clara. Prepara el texto.
- **Borrar:**
  - `MediaStore.createTrashRequest`, que muestra el diálogo del sistema y deja los elementos 30 días en la papelera, igual que «Eliminado recientemente».
  - Volver a comprobar las favoritas justo antes de borrar.
  - Los textos del resumen tienen que nombrar la papelera de Android en lugar de «Eliminado recientemente» y explicar cómo vaciarla, sin abrir otras apps con trucos. Usa textos por plataforma en los 7 idiomas.
- **Favoritas:** `MediaStore.createFavoriteRequest`.
- **Análisis en el dispositivo:**
  - parecido: MediaPipe Image Embedder con el modelo dentro de la app;
  - texto en capturas: ML Kit Text Recognition con el modelo incluido;
  - nitidez: varianza del laplaciano.
  - Comprueba qué envía cada biblioteca a Google (ML Kit puede enviar métricas) y decláralo, o elige la opción que no envíe nada.
  - Las librerías nativas (`.so`) deben ser compatibles con **páginas de 16 KB**, un requisito de Play.
- **Nombres de lugar:** `android.location.Geocoder`, que es una consulta de red. Coordenadas redondeadas a ~1 km, caché local y solo con «Ubicación» activada, como en iOS.
- **Vídeo:** el esquema propio `cocowash-media` de iOS se sustituye por `WebViewAssetLoader` o `shouldInterceptRequest`, con rangos.
- **Compartir, hápticos, abrir ajustes y `openLink`:** solo `https://joaquinmino.work`.
- **Botón Atrás y gesto predictivo:** deben cerrar las hojas (Filtros, Ajustes, Apoyo) y no salir de la app.
- **Pantalla completa (edge-to-edge),** obligatoria desde Android 15: respeta las barras del sistema.
- **Registros solo en desarrollo** (como `devLog` en iOS).
- **Mantener en Android las piezas recientes:** el gesto de deslizar para cerrar hojas, el «Modo developer» con anuncios sí/no y el resumen sin el botón «Abrir Fotos».

### 3. Anuncios y compras

- **AdMob Android:** crear la app y un bloque **nativo** en AdMob, con la clasificación G forzada en el código.
- **Consentimiento:** el SDK de UMP de Android, con los mismos mensajes. En Android no existe ATT; el identificador publicitario lo gestiona el sistema. Anuncios no personalizados si no hay consentimiento.
- **La tarjeta del anuncio:** la misma carta de papel nativa, con «Publicidad» visible, colocada sobre el hueco que mide la web. Reproduce las protecciones de iOS:
  - retirarla al pasar a segundo plano;
  - no dejarla huérfana si se recarga la WebView;
  - ocultarla mientras el hueco se mueve.
- **Google Play Billing** (versión actual):
  - «Sin anuncios para siempre»: producto único no consumible, que hay que **reconocer** (acknowledge).
  - «Invítame un café»: consumible, que hay que consumir.
  - «Un año sin anuncios»: Play no tiene suscripciones no renovables. Propón la mejor opción vigente (un producto único con opción de alquiler de un año, si está disponible, o un producto único con caducidad calculada en el teléfono a partir de la compra firmada). Explica las ventajas e inconvenientes.
  - Restaurar con `queryPurchasesAsync`.

### 4. Privacidad, tienda y web

- **Formulario «Seguridad de los datos» de Play:** prepara las respuestas exactas en un documento (`docs/playstore/data-safety.md`):
  - datos compartidos con Google para publicidad: ID de publicidad, ubicación aproximada, interacción con la app y diagnósticos;
  - lo que no se recoge;
  - cifrado en tránsito;
  - cómo pedir el borrado.
  - Debe ser coherente con la política.
- **Declaraciones de Play Console:**
  - anuncios: sí;
  - acceso a la app: sin inicio de sesión;
  - público objetivo: no dirigida a menores de 13;
  - cuestionario IARC de clasificación del contenido;
  - categoría: Fotografía;
  - declaración de permisos de fotos y vídeos.
- **Ficha de Play** en los 7 idiomas: título ≤ 30 caracteres, descripción breve ≤ 80 y completa ≤ 4000. Compruébalo con un script.
- **Recursos gráficos:** icono de 512 × 512, gráfico destacado de 1024 × 500 y capturas de teléfono hechas siempre con el modo de prueba (postales de ejemplo) y sin fotos personales.
- **Web** (`web/cocowash/`): añadir Android a la política y a la ayuda, en español e inglés:
  - Google Play Billing, el geocodificador de Android, la papelera de Android, los permisos de Android y la gestión del ID de publicidad;
  - la nueva fecha de actualización.
  - Después, un prompt para que Codex o ChatGPT la redespliegue en joaquinmino.work.

### 5. Compilación, pruebas y CI

- **Flujo de GitHub Actions** en `ubuntu-latest`, gratuito y para repositorio público:
  - tests de Node, `npm run build:native`, `cap sync android` y Gradle;
  - un **APK de desarrollo** para probar y un **AAB** para Play.
  - Un test de arranque en el emulador, con límites de tiempo y reintento, como el script de iOS.
- **Firma:** Play App Signing. La clave de subida (keystore) **nunca** va al repositorio ni a los registros: va en secretos de GitHub, cuando el usuario la cree. Explícale cómo.
- **Pruebas:**
  - el informe previo al lanzamiento de Play;
  - la prueba cerrada;
  - lista de comprobación: permisos completo y parcial, una biblioteca grande, la papelera, compras de prueba (licencias de prueba en Play Console), consentimiento con VPN a la UE, los 7 idiomas, árabe RTL, letra grande, TalkBack básico, un teléfono pequeño y uno grande.

## Cómo quiero que trabajes

- **Primero:** lee los archivos indicados y comprueba el estado de Git y de la CI. Después preséntame un plan por fases con lo que haré yo (cuentas, pagos, testers, recursos gráficos) y lo que harás tú. Empieza por lo que desbloquea el camino crítico.
- **Antes de responder sobre políticas de Google Play:** comprueba los requisitos vigentes en las fuentes oficiales (ayuda de Play Console, developer.android.com, ayuda de AdMob). No inventes cifras.
- **Diseño:** usa las skills de diseño del proyecto (`/coco-mobile-ui`, `ui-ux-pro-max`, `frontend-design`) para cualquier cambio visual; Android no debe parecer un port.
- **Calidad:** tests y CI en verde antes de cada entrega. Me entregas un APK de desarrollo en `C:\Users\Joaco\Downloads` con el nombre `CocoWash-<versión>-android-build<n>-<sha>.apk`.
- **Registro:** cada intervención relevante en `docs/ai-collaboration/CLAUDE_LOG.md`, y mantén al día una hoja de ruta `docs/ai-handoff/ROADMAP_PLAYSTORE.md`.
- **Comunicación:** háblame en español, claro y directo. Pide permiso antes de publicar, subir a `main` o tocar cuentas.
