# Instrucciones para Codex y Gemini — 2026-11-10

Copia **todo** este archivo a Codex y a Gemini. Cada uno hace **solo su bloque**; el otro bloque es contexto.

---

## 0. Contexto (léelo entero antes de tocar nada)

- Repositorio: `joacomino-dev/mano-iphone` (público), **una sola rama: `main`**. App en `mano/`.
- Punto de partida: `main` en `faa6a4f` o posterior. Último build iOS: 0.9.9 (44), commit `3106075`.
  **El usuario lo probó en su iPhone y está todo correcto**, salvo la mejora del ojo VHS (tarea A0).
- Antes de empezar, en este orden: `AGENTS.md` (raíz), `mano/AGENTS.md`, la última entrada de
  `docs/ai-collaboration/CLAUDE_LOG.md` (CW-CL-072) y de `CODEX_LOG.md`, `docs/ai-collaboration/CURRENT_STATE.md`,
  `docs/ai-collaboration/PROTOCOL.md` y `docs/ROADMAP.md`.
- Gemini es nuevo en el proyecto: crea `docs/ai-collaboration/GEMINI_LOG.md` con el mismo formato que
  `CODEX_LOG.md` y entradas `CW-GM-001`, `CW-GM-002`… Codex sigue con `CW-CX-…`.

### Reglas que no se negocian

1. Trabajar sobre `main`. **Antes de cada commit:** `git pull --rebase origin main`. Commits pequeños, solo con
   tus archivos. Nada de `stash`, `reset`, `clean`, `restore` ni `push --force`. No crear ramas en GitHub.
2. Commits que solo tocan documentación llevan `[skip ci]` en el mensaje.
3. Checks desde `mano/` antes de cualquier push con código: `npm test`, `npm run check:runtime`, `npm run build`,
   `npm run build:native`. Si uno falla, no se hace push.
4. **No debilitar** los hashes del runtime protegido (`scripts/check-mobile-runtime.mjs`). No cambiar iOS mínimo 17,
   bundle id, permisos, monetización, precios, IDs de AdMob ni versión/build sin permiso del usuario.
5. Sin fotos personales: QA de borrado solo con fixtures o demo. **Nunca** confirmar borrados en la fototeca real.
6. **Nunca** pedir ni escribir contraseñas, certificados, keystores ni claves en el chat, en archivos o en logs.
   Si hace falta un secreto, se dan al usuario los comandos para que **él** los ejecute.
7. Al usuario de la app **nunca** se le muestran avisos técnicos (almacenamiento, diario, errores internos).
   Todo se resuelve en segundo plano.
8. En `mano/src/InlineVideo.tsx` **no** volver a meter `sound` en las dependencias del efecto de reproducción:
   silenciar no debe pausar ni reproducir (bug ya corregido).
9. Nada de publicar la app, subir a App Store Connect ni a Play Console, ni pulsar «Enviar para revisión».
   Las acciones que este documento autoriza están marcadas con **AUTORIZADO**.
10. Al terminar cada tarea: fila de `docs/ROADMAP.md` actualizada (estado + evidencia: commit, run de CI),
    una línea en «Registro de avance», tu entrada en tu bitácora y `CURRENT_STATE.md` al entregar.

### Reparto (para no pisarse)

| | Codex — Bloque A (código, nativo, CI) | Gemini — Bloque B (web, tienda, capturas, probador) |
|---|---|---|
| Archivos | `mano/src/**`, `mano/tests/**`, `mano/scripts/**`, `mano/ios/**`, `mano/android/**`, `scripts/**`, `.github/workflows/**` | `web/cocowash/**`, `docs/appstore/**`, `docs/playstore/**`, `docs/apple-readiness/storefront/**`, `docs/testers/**` (nuevo) |
| No toca | Textos de tienda ni web | Código de la app ni workflows |

Si una tarea te obliga a tocar archivos del otro, **para** y escríbelo en tu bitácora para que el otro lo haga.
Orden: Codex hace **A0 primero** (las capturas de Gemini, tarea B4, dependen de él).

---

## BLOQUE A — CODEX

### A0. El ojo VHS desaparece si «Letras VHS» está apagado en Ajustes (mejora pedida por el usuario)

**Lo que ve el usuario en su iPhone (build 44):**
- Ajustes › Vídeos › «Letras VHS» **encendido** → en la carta de vídeo se ven las letras VHS y el botón del ojo;
  con el ojo las apaga. ✅ Correcto.
- Ajustes › Vídeos › «Letras VHS» **apagado** → en las cartas de vídeo **desaparece el ojo**, así que no hay forma
  de encender las letras desde la carta. ❌

**Comportamiento esperado (exacto):**
1. El ojo aparece **siempre** en toda carta de vídeo, con el ajuste encendido o apagado, en la misma posición,
   junto al botón de sonido y Compartir (`.video-toggles`).
2. Icono: ojo abierto (`EyeIcon`) cuando las letras se ven; ojo tachado (`EyeSlashIcon`) cuando están ocultas.
   `aria-pressed` y `aria-label` («Ocultar letras VHS» / «Mostrar letras VHS») acordes.
3. Tocar el ojo alterna las letras **al instante**, sin pausar, reanudar ni reiniciar el vídeo y sin tocar el sonido
   (igual que el botón de silencio).
4. El ojo y el interruptor de Ajustes son **el mismo valor** (`display.video.osd`): cambiar uno se refleja en el otro
   y se recuerda al reabrir la app. Esto ya es así hoy; no crear un segundo estado.
5. Con «Letras VHS» apagado, en Ajustes siguen visibles «Fecha», «Hora», «Ubicación», «Duración», «Peso»
   (solo se oculta «Tamaño de las letras», como ahora).
6. Mismo comportamiento en iOS y Android.

**Dónde mirar:** el botón está en `mano/src/InlineVideo.tsx:207`; el valor se cambia en `mano/src/ManoApp.tsx:736`
(`onOsd`); el interruptor en `mano/src/DisplaySettings.tsx:78`; la superposición en `mano/src/Vhs.tsx:27`;
estilos en `mano/src/prototype.css` (`.video-toggles`, líneas ~850 y ~1045). Leyendo el código, el botón parece
renderizarse siempre, así que **la causa no está a la vista: reprodúcela primero** (navegador con la fixture de
Apple y `display.video.osd=false`, y si no se reproduce, con el WebView nativo del simulador). Candidatos a
descartar: que la fila se oculte o quede tapada cuando no hay superposición VHS, que la condición de la línea 202
cambie la disposición, que el botón quede fuera de la zona visible o que el arranque con `osd:false` no pase `onOsd`.
No arregles a ciegas.

**Terminado cuando:**
- Nueva prueba de navegador `mano/tests/vhs-eye-flow.mjs` (mismo estilo que `tests/mute-flow.mjs`): arranca con
  `osd:false` → el ojo existe y es visible (caja > 0 y dentro de la carta) → tocar enciende las letras → tocar las
  apaga → el vídeo no se pausó en ningún momento → Ajustes refleja el valor. Debe fallar antes del arreglo y pasar
  después.
- Los cuatro checks PASS. Captura antes/después en tu bitácora.

### A1. R-67 y presupuesto de CPU del gate nativo (prioridad 1)

**Problema:** (a) R-67: a veces, tras relanzar, el WKWebView queda vacío 120 s (run `42634699746`). (b) El gate
nativo `42682535759` (commit `afbd2f9`) falla el presupuesto: la app queda ~70 % de CPU en reposo desde la ronda 7 y
su memoria (RSS) crece ronda a ronda.

**Material ya hecho:** rama **local** `claude/wip-r67-startup` (commit `ccf393e`, en la carpeta
`C:\Users\Joaco\Developer\CocoWash-android`; no está en GitHub). Contiene: esperas acotadas al abrir IndexedDB y
adopción del espejo de `localStorage` en `mano/src/durableSession.ts`; pruebas en `mano/tests/durable-session.test.mjs`
y `mano/tests/startup-flow.mjs`; captura de pila con `sample` cuando la CPU se dispara en
`scripts/apple-fixtures/collect-cycles.py`. Revísalo con `git diff main...claude/wip-r67-startup`.

**Pasos:**
1. Lleva a `main` lo que sirva de esa rama con `git cherry-pick ccf393e` (o a mano si choca). No mezcles con otros cambios.
2. Lanza el gate (**AUTORIZADO**, CI gratuita): `gh workflow run rc-native-gate.yml --ref main -f gate=full -f simulator=auto`.
3. Con la pila de `sample` del artefacto, identifica **qué** consume CPU en reposo (temporizador, `requestAnimationFrame`,
   animación de Framer Motion que no se detiene, observador, bucle de reconexión del diario, vídeo oculto que sigue
   decodificando…). Corrige la causa real. **No** subas los umbrales del presupuesto ni añadas reintentos para que pase.
4. Repite el gate hasta: R-67 sin pantalla vacía en todas las rondas y CPU en reposo y RSS dentro de presupuesto.
5. Cuando lo de la rama esté en `main` y verificado, borra la rama local: `git branch -D claude/wip-r67-startup`.

**Terminado cuando:** gate completo PASS en `main` (número de run en el roadmap), filas R-67 y CPU en PASS.

### A2. Live Photo nativa (R-07b)

El usuario confirmó en su iPhone que funciona (bucle en la carta, pausa en foto clave, anclada con
reproducir/pausa y línea de tiempo, pellizco). Lo que falla es **la prueba** del gate: busca el destino por label
(ver fila R-07b y `docs/apple-readiness/LIVE_PHOTO.md`).
1. Corrige el test XCTest (elegir el contenedor de la línea de tiempo, no el label), **sin cambiar el comportamiento
   de la app**.
2. `gh workflow run rc-native-gate.yml --ref main -f gate=live -f simulator=auto` (**AUTORIZADO**) hasta PASS.

### A3. Prueba E2E de Android inestable

Run `42852601987`: en la ronda 2 queda sin pulsar el diálogo del sistema «Allow CocoWash to move this photo to trash?».
El script es `mano/scripts/android-native-cycles.mjs` (función `systemAllow`, línea ~83).
1. Haz que `systemAllow` **espere** hasta que el diálogo aparezca (sondeo de `uiautomator dump` con plazo, p. ej.
   15 s), lo pulse y **confirme** que desapareció; si no aparece en plazo, que falle con mensaje claro.
2. Es un fallo de la prueba, **no** de la app: no cambies la app ni quites rondas.
3. `build-android.yml` en `main` debe salir verde **tres veces seguidas** (reejecutar el mismo commit vale).

### A4. Tamaño del bundle (R-06)

1. Mide: `npm run build` y anota el tamaño de cada chunk (antes).
2. Carga diferida (`React.lazy` + `Suspense`) solo para pantallas que no se ven al abrir: Ajustes
   (`DisplaySettings`), recorrido (`Onboarding`), vista anclada (`Inspector`) y hoja de revisión, si procede.
   Nada de cambiar dependencias.
3. Sin parpadeos: el `fallback` no debe mostrar un hueco visible (precarga el chunk cuando la app queda inactiva).
4. `npm run check:runtime` debe seguir PASS **sin tocar hashes**. Todas las pruebas de navegador PASS.
5. Terminado cuando el aviso de Vite (> 500 kB) desaparezca o, si no es posible, el roadmap diga cuánto bajó y por qué no más.

### A5. APK para el amigo probador de Android

1. Cuando A3 esté verde, descarga el artefacto del último run verde de `build-android.yml` en `main`
   (`gh run download <run> -n <artefacto>`). Contiene el **APK de desarrollo** (anuncios de prueba, «Modo developer»
   visible) y `VALIDATION.txt`. Al amigo se le da **el APK**, no el AAB.
2. Cópialo a `C:\Users\Joaco\Downloads\CocoWash-android-<versión>-<commit>.apk` y anota su SHA-256 en tu bitácora.
3. **Firma (importante):** si el run dice `Development key: not configured (throw-away debug key)`, cada build va
   firmado con una clave distinta y **el amigo tendrá que desinstalar antes de instalar la siguiente** (pierde su
   progreso). Para evitarlo, el usuario debe guardar su clave de desarrollo existente en GitHub (R-42). Dale al usuario
   estos comandos para que los ejecute **él** (tú no veas ni escribas los valores):
   ```bash
   base64 -w0 RUTA/A/LA/CLAVE.jks | gh secret set COCO_DEV_KEYSTORE_B64 -R joacomino-dev/mano-iphone
   gh secret set COCO_DEV_KEYSTORE_PASSWORD -R joacomino-dev/mano-iphone
   gh secret set COCO_DEV_KEY_ALIAS -R joacomino-dev/mano-iphone
   gh secret set COCO_DEV_KEY_PASSWORD -R joacomino-dev/mano-iphone
   ```
   (los tres últimos piden el valor por teclado). Después, reejecuta `build-android.yml` y entrega ese APK.
4. Avisa a Gemini en tu bitácora de la ruta y el SHA-256 del APK (lo necesita para B5).

---

## BLOQUE B — GEMINI

### B1. Textos de tienda sin Memo (punto 6)

Memo se retiró de la app el 2026-11-10 (ver `docs/ai-handoff/PENDING_COQUI_ART.md`). Siguen nombrándolo:
`docs/apple-readiness/storefront/metadata.json` (texto promocional, 7 idiomas), `docs/appstore/listing.md`,
`docs/appstore/screenshots.md`, `docs/playstore/listing.md`, `docs/playstore/graphics.md`.
1. Reescribe solo las frases que mencionan a Memo para que hablen **solo de Coqui** (en singular: «Coqui te ayuda…»),
   en los 7 idiomas: es, en, fr, de, it, ar, ja. Misma voz que la app: fresca, cercana, desenfadada.
   Frase de referencia de la app: ES «Coqui te ayuda a ordenar tu carrete con decisiones rápidas. Tú eliges qué se
   queda.» / EN «Coqui helps you tidy your camera roll with quick decisions. You choose what stays.»
2. Respeta los límites: App Store nombre 30, subtítulo 30, texto promocional 170, palabras clave 100 (bytes, sin
   espacios tras comas), descripción 4000; Google Play título 30, descripción corta 80, completa 4000.
3. Valida con los scripts existentes, desde `mano/`: `node scripts/check-release.mjs` (ficha Apple, `metadata.json`) y
   `node scripts/check-play-listing.mjs` (ficha Play); ambos deben dar PASS. Además,
   comprueba que `grep -ri "memo\|ميمو\|メモ" docs/appstore docs/playstore docs/apple-readiness/storefront` = 0 resultados
   (salvo menciones históricas marcadas como tales).

### B2. Publicar la política de privacidad (**AUTORIZADO** por el usuario)

Los archivos están en el repo, en `web/cocowash/` (`index.html`, `support.html`, `privacidad.html`, `privacy.html`,
`style.css`, `assets/`, `app-ads.txt`). Las versiones del repo ya incluyen Android; las publicadas hoy en
`https://joaquinmino.work/cocowash/` son antiguas (sin Android; ver
`docs/apple-readiness/evidence/strategic/0992-public-policies.json`).
1. Antes de publicar, revisa que la política coincide con la app actual: todo el procesamiento en el teléfono, sin
   subir fotos, AdMob (anuncios), compras dentro de la app, iOS y Android, contacto. Si algo no coincide, corrige el
   texto mínimo en `web/cocowash/` y explícalo en tu bitácora.
2. Sube **solo** la carpeta `cocowash/` al hosting de `joaquinmino.work` usando el acceso que el usuario tenga abierto
   (panel del hosting o FTP en su sesión). **No pidas la contraseña.** Si no tienes acceso, dale al usuario los pasos
   exactos (qué archivos, a qué carpeta) y espera a que confirme.
3. No romper nada más del dominio. Sin analítica, cookies, píxeles ni fuentes externas.
4. **No** publiques `app-ads.txt` con `pub-XXXXXXXXXXXXXXXX`: queda pendiente hasta que el usuario dé su ID de AdMob.
5. Verifica: `https://joaquinmino.work/cocowash/`, `/support.html`, `/privacidad.html`, `/privacy.html` → HTTP 200,
   HTTPS válido y **SHA-256 igual al del repo**. Guarda el resultado en
   `docs/apple-readiness/evidence/strategic/<fecha>-public-policies.json` (mismo formato que el de 0992) y marca R-17.

### B3. Ficha de la tienda (App Store y Google Play)

El usuario aún no tiene cuentas listas (R-10…R-15, R-40…). El objetivo es que **pegar la ficha sea copiar y pegar**:
1. Crea `docs/appstore/FICHA_LISTA.md` y `docs/playstore/FICHA_LISTA.md`: por idioma, cada campo con su texto final y
   su contador de caracteres; URL de privacidad (`https://joaquinmino.work/cocowash/privacy.html`; ES:
   `.../privacidad.html`), URL de soporte, categoría, clasificación por edad (respuestas del cuestionario),
   etiquetas de privacidad de Apple (de `docs/appstore/app-privacy.md`), Data safety de Google
   (de `docs/playstore/data-safety.md`) y notas para la revisión (de `docs/appstore/review-notes.md`).
2. Coherencia: lo que diga la ficha debe coincidir con la política publicada (B2) y con la app (sin Memo).
3. Si el usuario tiene App Store Connect o Play Console abiertos y te lo pide, puedes rellenar los campos como
   **borrador**. **Prohibido** pulsar «Enviar para revisión», «Publicar» o aceptar contratos.

### B4. Capturas de tienda nuevas (punto 7) — después de que Codex termine A0

Las 28 capturas iOS (1206×2622) y 28 Android (1080×1920) actuales muestran a Memo y el arte antiguo.
1. Espera a que A0 esté en `main` (mira `CODEX_LOG.md`).
2. Lanza (**AUTORIZADO**, CI gratuita): `gh workflow run apple-store-screens.yml --ref main` y
   `gh workflow run android-store-screens.yml --ref main`.
3. Revisa **cada** captura: sin Memo, arte nuevo de Coqui (sellos Eliminar/Favorita/Más tarde, Coqui principal,
   caja fuerte en privacidad), textos en su idioma, árabe de derecha a izquierda correcto, sin fotos personales,
   sin texto cortado.
4. Si alguna falla, describe cuál y por qué en tu bitácora (si es de la app, se lo pasas a Codex).
5. Actualiza `docs/appstore/screenshots.md` y `docs/playstore/graphics.md` con el número de run. Marca R-21.
6. Nota: los espacios `coqui-review` y `coqui-wonder` aún usan poses provisionales de Coqui (falta ilustración del
   usuario). No es bloqueo, pero anótalo.

### B5. Guía y mensaje para el amigo que prueba en Android

1. Crea `docs/testers/ANDROID_PRUEBA.md` (español, claro, sin tecnicismos):
   - Instalar: descargar el APK, permitir «Instalar apps desconocidas» para la app con la que lo abre
     (WhatsApp, Drive o Archivos), instalar, abrir.
   - Qué probar, con casillas: recorrido inicial; decidir fotos (Conservar, Eliminar, Favorita, Más tarde);
     deshacer; vídeos (sonido, ojo VHS encendido y apagado desde Ajustes, Compartir); anclar y hacer zoom (doble
     toque, pellizco, deslizar para cerrar); salir y volver a la app 5 veces seguidas (que no se vuelva lenta);
     «Terminar» y revisar; Ajustes.
   - **Aviso destacado:** «Eliminar» manda las fotos a la papelera del teléfono tras confirmar en la revisión. Que
     pruebe primero con fotos que no le importen o con capturas de pantalla hechas para la prueba.
   - Si una nueva versión no se instala encima («conflicto de paquete»), desinstalar la anterior y volver a instalar.
   - Cómo informar: modelo de teléfono y versión de Android, qué hizo, qué esperaba, qué pasó, captura o vídeo.
2. Escribe en esa guía, al final, un **mensaje corto listo para que el usuario se lo envíe** a su amigo (no lo envíes
   tú) con: qué es CocoWash, el enlace o archivo del APK (ruta y SHA-256 que Codex anotó en A5) y el enlace a la guía.

---

## Lo que tiene que hacer el usuario (nadie más puede)

- Si quiere que el amigo actualice sin desinstalar: ejecutar los comandos de A5.3 con su clave de desarrollo.
- Dar acceso al hosting de `joaquinmino.work` (B2) en su sesión, sin compartir contraseñas.
- Enviar el APK y la guía al amigo (B5).
- Cuando tenga las cuentas: Apple Developer y App Store Connect, Play Console, ID de editor de AdMob.

## Entrega final de cada agente

Un resumen breve en el chat al usuario: qué quedó **PASS** (con run o commit), qué quedó **pendiente** y **por qué**,
y qué tiene que hacer él. Sin afirmar nada que no esté verificado.
