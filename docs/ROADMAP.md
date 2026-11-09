# CocoWash · Roadmap compartido (Codex ↔ Claude ↔ usuario)

Documento vivo y **único** para saber qué falta y cómo avanzamos. Sustituye como referencia a
[ROADMAP_APPSTORE](ai-handoff/ROADMAP_APPSTORE.md) y [ROADMAP_PLAYSTORE](ai-handoff/ROADMAP_PLAYSTORE.md),
que quedan como historial detallado (fuentes, requisitos de Play, firma Android).

## Cómo trabajamos (decisión del usuario, 2026-11-07)

Al empezar **cada** tarea, Codex o Claude:

1. Actualiza desde `main` (única rama) y comprueba Git real.
2. Lee **la última entrada del otro agente** (`docs/ai-collaboration/CODEX_LOG.md` o `CLAUDE_LOG.md`)
   y `CURRENT_STATE.md`.
3. Lee **este roadmap** y compara: qué avanzó, qué se cerró, qué falta. Si cree que falta algo que no
   está aquí, o que algo está mal clasificado, lo **añade o corrige aquí** (con su nombre y la fecha),
   no solo en el chat.
4. Al terminar: marca los puntos cerrados con su evidencia (commit, run de CI, archivo), añade una línea
   al [registro de avance](#registro-de-avance) y escribe su entrada de bitácora.

Un punto solo pasa a **Hecho** con evidencia comprobable. Preparar un script o documento no cierra
una puerta nativa, comercial o de distribución.

**Estados:** Hecho · En curso · Pendiente · Bloqueado (falta herramienta, acceso o decisión) · FAIL
(comprobado y fallando). **Quién:** U = usuario · CX = Codex · CL = Claude · C = cualquiera de los dos.

## Dónde estamos (2026-11-09, CW-CX-060 — candidato 0.9.9.2)

- Usuario autoriza cerrar ambas plataformas con etiqueta **0.9.9.2**. iOS mantiene versión nativa
  **0.9.9**, build candidato **44**; Android **0.9.9.2**, código **4**. Consultar disponibilidad en las
  consolas antes del envío; no se publicará ni se tocarán cuentas o certificados.
- PASS local: 138 Node, TypeScript, protected28, ambos builds web, 9 release, 4 contratos, 25 Python
  y 56 escenarios Edge. Revisión integrada sin hallazgos. Es evidencia local, no aceptación nativa.
- [Android fa318ba](https://github.com/joacomino-dev/mano-iphone/actions/runs/42634538249) **PASS completo**:
  17 checks, Back conservando reproductor/posición/sonido, cancelación, favoritas, diez rondas y
  decisiones reconocidas conservadas tras force-stop ×5. Presupuestos originales PASS: PSS total
  243919→246092 KiB, pendiente 765,83 KiB/ciclo, CPU inactiva tardía 0,47 %. Solo emulador y biblioteca pequeña.
- [Tienda iOS](https://github.com/joacomino-dev/mano-iphone/actions/runs/42634699549) y
  [desarrollo iOS](https://github.com/joacomino-dev/mano-iphone/actions/runs/42634699515) **PASS** en fa318ba.
  [Fotos iOS2794e4b](https://github.com/joacomino-dev/mano-iphone/actions/runs/42669952998) **FAIL**:
  5 PASS, 1 FAIL, 2 SKIP. Pasan cancelación, relanzamiento ×5, key/timeline/bucle y diez rondas;
  solo falla encontrar el vídeo para el gesto de zoom. Ajuste CW-CX-062 hacia el padre del timeline.
- R-67 **P1 abierto**: WKWebView vacío después de relanzar, antes de cualquier operación de borrado;
  causa sin determinar; no reproducido en2794e4b. No se oculta con reintentos. R-07b corrige solo XCTest: marco visible del medio
  (gestos en el padre) y ventana de cuatro bucles para lecturas AX que tardan 2,87 s. Conserva todas
  las aserciones finales. Nuevo gate completo pendiente; [evidencia](apple-readiness/evidence/strategic/0992-native-fa318ba.json).
- Sonido/reproducción, Inspector, PhotoKit, recuperación silenciosa R-64 y arte intactos.
  Siguen QA física/visual, privacidad del archivo, comercio y firma.
  **No apta para enviar.**
- Actualización CW-CX-061: Android `2794e4b` /42669935821 confirma PASS completo.
  IPA iOS build44 y APK/AAB Android code4 verificados en Descargas; AAB unsigned,
  APK con firma temporal. No desinstalar apps con decisiones por conflicto de firma.
  Políticas públicas200 pero anteriores sin Android; ZIP corregido preparado sin publicar.
  Capturas1206×2622 cubren clase mediana que exige el resumen vigente de Apple;
  no se lanzó otra CI ni se modificó el selector por la tabla contradictoria.

CW-CX-060: revisión integrada sin defectos nuevos; release9 y protected28 PASS.
El próximo gate prueba únicamente las correcciones de XCTest; R-67 sigue abierto.

CW-CX-062: 2794e4b confirma bucle y todos los casos de seguridad; solo falla destino
de zoom. Se elige el ancestro real del timeline con centro encima de los controles.
Revisión integrada sin hallazgos; afbd2f9 enviado y [full42682535759](https://github.com/joacomino-dev/mano-iphone/actions/runs/42682535759)
en curso. No duplicarlo ni repetir builds de app sin cambios.

### Estado anterior 0.9.9.1 (CW-CX-057)

- Código `6386f55`, sobre la última versión funcional de Claude; sin cambios de app en esta entrega.
- IPA `CocoWash-0.9.9.1-build43-6386f55.ipa` descargada en Descargas para iLoader. Fuente, digest,
  CRC, bundle, arm64, mínimo iOS17 y ausencia de reset verificados. No se ha instalado en el teléfono.
- [Tienda iOS 42623207314](https://github.com/joacomino-dev/mano-iphone/actions/runs/42623207314) y
  [desarrollo 42623186747](https://github.com/joacomino-dev/mano-iphone/actions/runs/42623186747) **PASS**,
  incluido arranque/relanzamiento. Esto no equivale a superar todos los casos de Fotos o TestFlight.
- [Gate completo iOS 42623622241](https://github.com/joacomino-dev/mano-iphone/actions/runs/42623622241)
  **en curso**. El anterior 42620548423 falla prerrequisitos de sesión/autorización; no valida el nuevo
  gesto de pellizco. R-07b y persistencia adversa del candidato siguen pendientes.
- [Android 42623186603](https://github.com/joacomino-dev/mano-iphone/actions/runs/42623186603) **FAIL**:
  17 checks PASS, pero Atrás sigue sin devolver del fullscreen al visor. Cero ciclos completados.
  R-47b continúa abierto; no se declara corregido por la compilación o la revisión estática.
- Siguen pendientes QA física (permisos, iCloud, bibliotecas grandes, memoria, accesibilidad, compras),
  aceptación visual de Claude y los pasos del [paquete del usuario](#paquete-del-usuario--pasos-en-orden).
  No se relanzó CI ni se publicó nada. **No apta para enviar.**

### Estado recibido de Claude (2026-11-08, CW-CL-063/064)

- **Última prueba del usuario en su iPhone (IPA `37d1ad2`) y lo que se corrigió (CW-CL-064):**
  1. **R-00 lentitud al salir/volver (P0):** desde la RC (CW-CX-018) cada vuelta a la app releía TODA la
     fototeca (enumeración nativa completa + puente + reconciliación + guardado). Build 43 no lo hacía.
     Ahora iOS usa `PHPhotoLibraryChangeObserver`: al volver solo se consulta el permiso y un contador de
     cambios de Fotos; se relee solo si cambió el permiso, si Fotos informó un cambio (o no puede decirlo,
     p. ej. Android), si el acceso es limitado o si aún no hay nada cargado. Prueba `tests/resume-flow.mjs`.
  2. **Avisos de almacenamiento (R-64):** «No se pudo guardar el progreso…» y «Una operación de Fotos quedó
     interrumpida…» **ya no se muestran nunca** (decisión del usuario). Causa del primero: iOS corta la
     conexión IndexedDB en segundo plano y el diario la reutilizaba. Ahora el diario reabre y reintenta; si
     sigue fallando conserva el estado en memoria y en el espejo localStorage y el siguiente guardado
     sobrescribe. Sin diario legible la app arranca con la copia local. Una intención antigua se resuelve
     sola con la primera enumeración fresca; nunca se repite una operación de Fotos.
  3. **Vista anclada (R-65):** solo «Cerrar» (se quitó «Anclada»); arrastrar la foto/vídeo sin zoom más
     de ~110 px (o rápido) la cierra, como un visor de fotos; con zoom el arrastre mueve. `tests/anchored-flow.mjs`.
  4. **Rectángulo blanco al anclar un vídeo (R-66):** `backdrop-filter` de la barra de controles dentro de
     un ancestro que se anima; en la vista anclada se usa fondo sólido del mismo color. Confirmar en iPhone.
- Antes (CW-CL-063): gate nativo iOS `37d1ad2` 7/8 PASS (álbum, cancelar borrado, **R-61 relanzar ×5**,
  pulsación larga sin menú, 10 rondas, anclar, pellizco); Live: la foto clave ya PASS con criterio visual
  (máx. 12 niveles, <1 % canales, 20× más cerca de la clave que del movimiento); faltaba el paso de la
  línea de tiempo (XCTest no puede `adjust()` un range HTML: ahora arrastra el punto).
- **Abierto:** Android Atrás no sale de pantalla completa de vídeo en el emulador (R-47b, FAIL; Android no
  publicable aún, no se quemaron ciclos); R-02 Privacy Report/ATT físico; cuentas, firma, TestFlight.
- CI: los tres builds automáticos ya no arrancan por suites locales, tests de UI ni archivos de la otra
  plataforma (107 ejecuciones en un día antes). Pushes de solo docs con `[skip ci]`.
- No apta para enviar.

### Estado anterior (2026-11-08, CW-CX-050)

- Fuente única: `main`, `C:/Users/Joaco/Developer/CocoWash-android`; checkpoint d362af4 enviado.
- R-61 P0 reproducido y corrección de diario local **aprobada**. Implementación local y 8 regresiones IndexedDB PASS (CW-CX-051); force-stop nativo pendiente.
- R-01 tiene un PASS nativo anterior; el gate completo 42518372819 falla otra vez en álbum y otros casos. No hay aceptación global.
- R-07 reproduce movimiento real, pero no restaura píxeles idénticos en pausa: 42519482281 FAIL.
- R-63 PASS nativo acotado en 42539523601: diez rondas y favorita confirmada. R-61 aún requiere force-stop; el test se detuvo antes por idioma incorrecto.
- Capturas nativas: 28 por plataforma, siete idiomas. Claude debe aceptar Live, anuncio y ausencia de selección/lupa. No se ha generado un IPA/APK final aceptado.
- Dos hosts aprobados en manifiesto; declaración estática y firmas del proveedor PASS. Privacy Report del archivo y bloqueo ATT físico pendientes; no repetir sondas de bloqueo en simulador.
- Medición e infraestructura congeladas. No apta para enviar; no se ha publicado ni cambiado cuentas.

### Base integrada anterior (CW-CL-060)

- Una sola rama: `main`. Código verificado `376855d`; IPA de desarrollo
  `C:/Users/Joaco/Downloads/CocoWash-0.9.9.1-build43-376855d.ipa`.
- iOS 0.9.9 (43), visible 0.9.9.1, iOS 17+, solo iPhone, 7 idiomas. Android versionCode 3.
- `main` = canal de tienda (sin modo developer, IDs AdMob iOS reales). La IPA de desarrollo se deriva
  en CI. CI en verde en `main`: tienda iOS, desarrollo iOS (arranque en simulador), Android.
- Compila nativo en Xcode 27.1 y abre sesión con acceso real a Fotos en simulador.
- **No está lista para enviar**: quedan abiertos R-00 (P0), R-07, R-01, R-02 y todo lo de cuentas, QA física y firma.

## 0 · Prioridad máxima (defectos reportados por el usuario, 2026-11-07)

| ID | Qué | Quién | Estado | Evidencia / siguiente paso |
|---|---|---|---|---|
| R-00 | **P0 · El iPhone se vuelve cada vez más lento** tras eliminar unas fotos y terminar la sesión 4–5 veces seguidas (reporte del usuario en su teléfono). Ver [detalle R-00](#detalle-r-00) | CX | **PASS regresión nativa pequeña; QA física BLOCKED** | CW-CX-021/033:11→1 búsquedas sintéticas y10rondas nativas reales iOS42492831273/Android42492831172,PASS presupuestos. [Métricas ylímites](apple-readiness/NATIVE_LAB.md). Recuento finalPhotoKit pendiente;no acredita teléfono físico/biblioteca grande |
| R-07 | **Live Photo**: reproducción en la carta y en la vista anclada. Ver [detalle R-07](#detalle-r-07) | CX (+CL visual) | **En curso (P1), nativo bloqueado** | CW-CX-022/025: reproducción inline, foto clave en pausa, anclaje/timeline/pinch implementados;5 escenarios web PASS. [Evidencia y QA nativa](apple-readiness/LIVE_PHOTO.md) |
| R-64 | **Sin avisos de almacenamiento** («No se pudo guardar…», «operación interrumpida»): recuperación silenciosa (usuario, 2026-11-08) | CL | Corregido local; nativo pendiente | CW-CL-064; `durableSession.ts`, `native.tsx`, `ManoApp.tsx`; persistencia 8+7 PASS en navegador |
| R-65 | Vista anclada: solo «Cerrar» y deslizar para cerrar (usuario, 2026-11-08) | CL | Corregido local | `Inspector.tsx`; `tests/anchored-flow.mjs` 3/3 |
| R-66 | Raya/rectángulo claro abajo al anclar un vídeo (usuario, 2026-11-08) | CL | **PASS (usuario en iPhone)** | 1) barra del vídeo sin `backdrop-filter`; 2) causa real según la captura del usuario: `frame.focus()` sin `preventScroll` desplazaba el WebView y asomaba el fondo crema de la página bajo la vista anclada → `focus({preventScroll:true})` y desplazamiento del documento fijo en 0 mientras está anclada (`Inspector.tsx`) |
| R-07b | Live anclada: bucle y pellizco del gate nativo | CX | **PASS en iPhone (usuario); FAIL de gate, corrección de test pendiente** | 2794e4b pasa bucle y falla solo destino por label; CW-CX-062 elige padre del timeline. Conserva píxeles cambiados y controles sin escalar; no cambia reproducción |
| R-47b | Android: Atrás sale de fullscreen y luego cierra visor | CX | **PASS emulador API35; físico pendiente** | fa318ba / 42634538249 y2794e4b/42669935821: mismo reproductor/fuente/posición/sonido/galería, E2E17 + diez rondas + force-stop ×5 y presupuestos PASS |
| R-67 | **P1 · Arranque iOS intermitente sin contenido accesible tras relanzar** | CX | **FAIL, causa pendiente** | fa318ba / 42634699746 testV línea504: 120s sin Eliminar, WKWebView vacío; bridge listo y documento principal comprometido. La prueba no llegó al borrado. No reproducido en2794e4b, causa abierta. No añadir retry |

## A · Código y pruebas iOS (antes de firmar)

| ID | Qué | Quién | Estado | Evidencia / siguiente paso |
|---|---|---|---|---|
| R-01 | Álbum iOS: teclado no recibe texto con WKPreferences desactivada | CX | **PASS estándar; Duo/min17 pendientes** | Matriz42513277098 falseFAIL/truePASS; fix662e67d probado sin observer42514969280: nombreexacto/creación/relectura/avancePASS. Gestos pinch/anclajePASS. |
| R-02 | Privacidad de distribución ydominios de tracking | CX + U | **PASS declaración; BLOCKED final** | Usuario aprueba2hosts;423e79eincorpora y5tests/strictPASS. Captura real anteriorATT2estadosPASS42514971530; repetir conmanifestnuevo42516799297. SDKfirmasPASS42516183457; archivo/exhaustividad/web pendientes. |
| R-03 | Captura del fallo del smoke en dispositivos de 2 pantallas (`simctl io screenshot` exige `--display`) | CX | **PASS (colector)** | CW-CX-027/030:simctl real displays3/1 exit0 yxcresult42488119404 exporta la captura exacta durante el fallo. No acredita adaptación visual Duo |
| R-04 | Invalidación de snapshots y cola de favoritas Android | CX | **PASS emulador; físico pendiente** | fa318ba / 42634538249: favoritas/undo/flush nativo y diez rondas. Regresiones web de CW-CX-024 conservadas |
| R-05 | QA destructiva ypermisos adversos con fixtures | CX | **PASS confirmación/postaudit; pendiente adverso completo** | iOS42514969280:10rondas/10ausentes/unknown0PASS. Cancel/error/favorita externa/revocado/interrupción yR61 pendientes. AndroidE2E nativo enCI, ningún borrado personal. |
| R-06 | Tamaño del bundle web (> 500 kB, aviso de Vite) | C | Pendiente | Solo con medición en Instruments; no tocar sin evidencia |

## B · Cuentas, legal y tienda Apple (usuario)

| ID | Qué | Quién | Estado | Evidencia / siguiente paso |
|---|---|---|---|---|
| R-10 | Apple Developer Program activo con `work.joaquin.mano` | U | Pendiente | — |
| R-11 | App en App Store Connect, acuerdo de apps de pago, banco e impuestos | U | Pendiente | — |
| R-12 | DSA (UE): condición de comerciante y datos públicos | U | Pendiente | — |
| R-13 | Perfil de pagos de AdMob | U | Pendiente | AdMob iOS y mensajes ya hechos (2026-11-06) |
| R-14 | Marca «CocoWash» sin conflicto en los mercados | U | Pendiente | — |
| R-15 | Productos en ASC con IDs exactos: `noads.year` (no renovable), `noads.lifetime` (no consumible), `coffee` (consumible); precios | U (+C textos) | Pendiente | Textos en `docs/appstore/in-app-purchases.md` |
| R-16 | Versión y build de envío | U + C | **Configuración PASS; disponibilidad BLOCKED** | Visible0.9.9.2; iOS0.9.9/build44; Android0.9.9.2/code4. Consultar ambas consolas antes de firmar |
| R-17 | Publicar políticas corregidas ES/EN con Android | U autoriza, C prepara | **Preparadas; publicación BLOCKED** | 9nov: ambas URL y soporte200 con agente navegador; archivos anteriores sin Android. [Recibo](apple-readiness/evidence/strategic/0992-public-policies.json); sin despliegue |
| R-18 | Ficha, etiquetas de privacidad, clasificación por edad, notas de revisión | U + C | En curso | Borradores en `docs/appstore/` y `docs/apple-readiness/storefront/`; revisión nativa de textos pendiente |

## C · Arte y capturas

| ID | Qué | Quién | Estado | Evidencia / siguiente paso |
|---|---|---|---|---|
| R-20 | Icono definitivo del basurero (sello «Eliminar») y la otra imagen pendiente | U | Pendiente | — |
| R-21 | Capturas nativas reales sin fotos personales | CL + U | **Generación PASS; aceptación pendiente** | 28 iOS1206×2622 y28 Android1080×1920 RGB24, siete idiomas, runs42516036408/42516038859. Claude debe aceptar textos/arte/RTL y vigencia frente a la app final |

## D · Distribución iOS

| ID | Qué | Quién | Estado | Evidencia / siguiente paso |
|---|---|---|---|---|
| R-30 | Certificado de distribución y perfil App Store; firma y archivo con `scripts/archive-apple-release.sh` | U + C | Bloqueado | Depende de R-02, R-10, R-16 |
| R-31 | TestFlight interno y QA en iPhone real: sandbox (comprar, restaurar, caducidad, café), RGPD/ATT, biblioteca grande, iCloud, 7 idiomas, árabe RTL, texto grande, VoiceOver, SE e iOS 17 | U + C | Bloqueado | Plantilla `docs/apple-readiness/device-results.template.csv` |
| R-32 | Envío a App Review y lanzamiento | U | Bloqueado | Tras R-01…R-31 |

## E · Android / Google Play

| ID | Qué | Quién | Estado | Evidencia / siguiente paso |
|---|---|---|---|---|
| R-40 | Teléfono Android 11+ y cuenta de Play Console verificada | U | Pendiente | Bloquea todo Play |
| R-41 | Si corresponde por tipo/fecha de cuenta personal: mínimo12 testers inscritos continuamente14 días en prueba cerrada y solicitar acceso a producción | U | Pendiente | [Regla oficial Google](https://support.google.com/googleplay/android-developer/answer/14151465): cuentas personales posteriores al13-11-2023. Confirmar requisito de la cuenta real; no es regla universal de15–20 |
| R-42 | Keystore de desarrollo en secretos GitHub | U | **BLOCKED configuración** | Run42669935821 confirma clave de desarrollo no configurada: firma temporal. Usar la clave existente local, sin enviarla por chat ni desinstalar para actualizar |
| R-43 | IDs reales AdMob Android y canal de tienda | U (IDs) + CX | **Mecanismo PASS; IDs BLOCKED** | fa318ba valida canales por hash. Faltan variables reales Android y verifyStoreConfiguration; no usar muestras ni IDs iOS |
| R-44 | Con `main` en canal de tienda, el APK de desarrollo oculta «Modo developer»: decidir si su CI cambia su copia a desarrollo como la IPA | CX | **PASS** | CW-CX-028: run42486725664 valida hashes de APK developer/AAB tienda,5 regresiones yE2E emulador PASS. IDs reales/firma/compras siguen en sus gates |
| R-45 | P3 posterior: detector de texto/embedder adicional Android | CX si se autoriza | Pendiente, fuera de primera publicación | Texto no disponible se mantiene oculto; parecido dHash existente no equivale a embedder. No incorporar modelos nuevos ni anunciar funciones incompletas para cerrar la primera versión |
| R-46 | Firma de compras Android | CX + U | **JVM/Kotlin PASS; Play sandbox BLOCKED** | fa318ba compila y prueba verificador; sin clave no ofrece compras falsas. Clave pública/configuración/transacciones Play pendientes. [Límites](playstore/PURCHASE_VERIFICATION.md) |
| R-47 | Carta de anuncio Fredoka/RTL y vídeo fullscreen | CX + CL | **Fullscreen PASS emulador; visual BLOCKED** | R-47b confirmado en fa318ba. Claude conserva aceptación visual de capturas reales; no altera monetización |
| R-48 | Prueba interna, cerrada (14 días) y solicitud de producción | U + C | Bloqueado | Tras R-40…R-43 |
| R-49 | Firma de producción Android: Play App Signing, clave de subida/recuperación y AAB del canal real; contratos de pagos/productos Play y Data safety contrastado con SDK/tráfico | U configura + CX verifica | Pendiente | La clave de desarrollo R-42 y una CI verde no acreditan firma comercial ni productos Google Play funcionales |

## F · Repositorio y entorno

| ID | Qué | Quién | Estado | Evidencia / siguiente paso |
|---|---|---|---|---|
| R-50 | Una sola rama `main`; copia de las 21 ramas en `work/backup/mano-iphone-all-branches-2026-11-07.bundle` | CL | Hecho | CW-CL-060 |
| R-51 | Copias locales antiguas (`CocoWash-b24`, `CocoWash-stage1` con cambios sin confirmar, worktree de Codex, OneDrive) | U decide | Pendiente | No usarlas como base; archivar tras revisar los cambios de `CocoWash-stage1` |
| R-52 | Workflows heredados (`build-ios.yml`, `build-ios-package.yml`) y avisos de Node 20 en acciones | C | Pendiente | Solo manuales; decidir si se retiran |
| R-53 | Elegir/verificar disponibilidad efectiva iPhone en iPad, Mac Apple silicon y visionOS; pruebas y accesibilidad para destinos ofrecidos | U decide + CX/CL verifican | Pendiente | Familia iPhone no sustituye opciones de disponibilidad de ASC. No prometer destinos sin QA |
| R-54 | Gate final por tienda: cero P0/P1 abiertos, recurso/capturas reales, accesibilidad/locales, privacidad/SDK/consentimiento y compras del artefacto exacto | CX técnico + CL visual + U envío | Bloqueado | Separar fuente, simulador, hardware y distribución. R-67/Live, QA física, privacidad y comercio impiden aceptar la RC; scripts preparados no cierran gates |

## Detalle R-00

**Reproducción (usuario):** en el iPhone, eliminar algunas fotos desde «Una última mirada», terminar la
sesión y empezar otra; repetir 4–5 veces. El teléfono va cada vez más lento.

**Medido por Claude (navegador, puente sintético, `mano/tests/leak-cycles.mjs`; no es evidencia de iPhone):**
- Capa web sin fuga clara: heap JS 36,9 → 39,4 MB en 6 ciclos, cada vez menos; listeners (331), nodos DOM
  y `<video>` constantes. Cachés JS acotadas (precarga 24, nítidas 80; EXIF nativo 256).
- **Al volver a la app después de borrar** (la pantalla final invita a ir a Fotos a vaciar «Eliminado
  recientemente»), cada ciclo relanza trabajo sobre **toda** la biblioteca: `assets` (enumeración completa),
  `analyze` (búsqueda de parecidas con Vision sobre todas las fotos) y reindexado (`sizes`, `classify`).
  Sin salir de la app no ocurre. Causa: `visibilitychange` → `invalidateLibrary` + `loadLibrary` → nuevo
  `fingerprint`/`generation` → efectos de `analyze` (ManoApp) y de `useLibraryIndex` (indexer.ts).

**Sospechosos a medir en el iPhone (en este orden):** 1) el trabajo de biblioteca completa en cada ciclo
(CPU/temperatura; `analyze` lee y desarchiva un `VNFeaturePrintObservation` por foto desde `Caches/ManoPrints`
y compara); 2) memoria nativa que no vuelve tras cada ciclo (Vision, `PHImageManager`, vídeos preparados,
caché de vistas previas, SDK de anuncios en la carta final); 3) memoria del proceso WebContent de WKWebView;
4) `placeCache` nativo sin límite (menor). Herramientas: Instruments (Allocations, Leaks, VM Tracker, Time
Profiler, Energy) y Safari Web Inspector (Timelines › Memory) sobre la app instalada, con biblioteca de
fixtures, nunca la personal.

**Aceptación:** 10 ciclos borrar → terminar → volver → nueva ronda sin crecimiento sostenido de memoria
(app + WebContent) ni CPU en reposo; una actualización de biblioteca tras borrar solo procesa lo que cambió
(o se difiere y se cancela al empezar otra ronda); prueba automatizada que lo vigile.

**CW-CX-021:** confirmado11→1 búsquedas/4.180→400 IDs en10 ciclos sintéticos.
Se conserva refresco de permisos/biblioteca y se reutiliza cobertura de fotografías
sin editar tras borrados; añadidos/ediciones y revocación se prueban por separado.
Con índices válidos, sizes/classify ya conservaban supervivientes; la recurrencia
de todos esos IDs provenía del mock vacío. [Resultados y límites](apple-readiness/R00_CYCLES.md).
Misión estratégica2026-11-08: aceptación técnica exige10 ciclos nativos con métricas app+WebContent/CPU en simulador (XCTest/Instruments), umbrales y baseline; protocolo físico queda para el usuario. No basta benchmark JS; el resultado no acredita el iPhone físico.

## Detalle R-07

Especificación del usuario (2026-11-07):
- **Carta:** el botón de abajo a la izquierda es **play/pausa** de la Live Photo **dentro de la carta**
  (hoy abre un reproductor nativo aparte a pantalla completa, `LivePhotoController`). En play se reproduce
  **en bucle hasta pausar**. En pausa se muestra la **foto clave que eligió Apple** (key photo).
- **Anclar / zoom con pellizco:** se ve la **foto clave anclada** (ampliable) **con play/pausa y una línea
  de tiempo** para pausar en cualquier momento, como un vídeo anclado. **No** debe abrirse un reproductor
  independiente.
- Conservar el diseño aprobado de controles de carta, Reduce Motion (sin reproducción automática) y la
  accesibilidad (nombre del botón según estado). Solo iOS: Android no ofrece Live Photos.

## Después del lanzamiento

Fallos en el Organizador y en Play Vitals, valoraciones, AdMob (relleno, consentimiento), revisión de
textos con hablantes nativos, 1.0.1 para lo que salga.

## Registro de avance

Una línea por intervención: fecha · agente · entrada · puntos cerrados/abiertos.

- 2026-11-09 · Codex · CW-CX-057 · IPA 6386f55 descargada y verificada para iLoader; tienda y desarrollo iOS PASS. Android mantiene FAIL fullscreen, gate completo iOS en curso. Roadmap actualizado sin cambios de app ni nueva CI.

- 2026-11-09 · Codex · CW-CX-055/056 · 571b1e5 y 6386f55 enviados tras revisión integrada. R-07b cambia solo el destino del pellizco; R-47b cubre la entrada de Back antes de WebView. Tienda iOS PASS; Android y desarrollo en curso, gate completo en cola. Se conserva sonido, Inspector y R-64.

- 2026-11-09 · Claude · CW-CL-067 · Silenciar un vídeo ya no hace play/pausa (toque redirigido por iOS); doble toque para zoom/deshacer en la vista anclada. Claude para por cupo; relevo en `PROMPT_CODEX_2026-11-09.md`.
- 2026-11-09 · Claude · CW-CL-066 · Usuario confirma en iPhone: raya al anclar resuelta y pellizco en Live anclada OK. Regla: zoom y anclar en todo (fotos, Live, vídeos) → vídeos anclados ahora hacen pellizco/arrastre como fotos (`Inspector.tsx`, `anchored-flow` 4/4). Sin «popping» ni bordes visibles en ninguna animación.
- 2026-11-08 · Claude · CW-CL-065 · Usuario: «la app se siente excelente y súper fluida». R-66: raya crema bajo la vista anclada = desplazamiento por `focus()` (corregido). Gate 8f2549e 7/8; R-07b pellizco en Live anclada a confirmar en iPhone.
- 2026-11-08 · Claude · CW-CL-064 · Defectos del usuario en iPhone: R-00 vuelta a la app sin releer la fototeca (observador de cambios de Fotos), R-64 sin avisos de almacenamiento (reconexión/espejo), R-65 vista anclada solo «Cerrar» + deslizar para cerrar, R-66 rectángulo blanco (backdrop-filter). 138 Node, 80 casos navegador + 8 runtime PASS. Pendiente: gate nativo y confirmación del usuario en iPhone.
- 2026-11-08 · Claude · CW-CL-063 · Relevo: WIP de Codex terminado (Live pausa = foto clave), cascada del gate por aviso de operación interrumpida, aviso «Viewing full screen» de Android en el test, filtros de CI. Gate iOS 37d1ad2 7/8 PASS; Live clave PASS con criterio visual. IPA `CocoWash-0.9.9.1-build43-37d1ad2.ipa`.

- 2026-11-07 · Codex · CW-CX-021 (inicio) · Contrastado roadmap con RC/Play: R-41 corregido a12 testers/14 días cuando aplica; R-45 pasa a P3 fuera del primer lanzamiento; añadidos R-49 firma/comercio Play, R-53 destinos Apple y R-54 aceptación del artefacto. R-00 en curso, sin cerrar QA física.
- 2026-11-07 · Codex · CW-CX-021 · Corregida recurrencia R-00 en JS con cobertura/epochs y regresión10 ciclos;128 Node,5 flujos nuevos y38 regresiones PASS. R-00 físico sigue bloqueado, no se marca Hecho.

- 2026-11-07 · Claude · CW-CL-062 · Añadidos R-00 (P0 lentitud tras varios ciclos, con medición web) y
  R-07 (Live Photo), ambos reportados por el usuario.
- 2026-11-07 · Claude · CW-CL-059/060 · Integrada la RC de Codex con Android; una sola rama `main`;
  CI en verde; IPA build 43. Abiertos R-01 (FAIL) y R-02 (FAIL). Roadmap creado.

- 2026-11-07 · Codex CW-CX-022: R-07 implementado localmente con controles existentes;4 regresiones web PASS. Swift/Live Photo real pendientes; no se cierra R-07 ni se atribuye prueba física.

- 2026-11-07 · Codex CW-CX-023: R-01 mantiene FAIL, diagnósticos añadidos sin alterar el formulario por hipótesis; R-03 preparado y4 casos PASS, macOS pendiente; R-02 revalidado con SDKs oficiales y fuentes, sigue FAIL sin dominios probados. [Detalle](apple-readiness/NATIVE_FOLLOWUP.md).

- 2026-11-08 · Codex CW-CX-024: R-04 corregido con evidencia antes/después y7 escenarios;130 Node,68 navegador,4 Python,14 configuración/builds/sync/hash28 y10 ciclos PASS. QA física/nativa y R-00/R-01/R-02 continúan bloqueando publicación.

- 2026-11-08 · Codex CW-CX-025: cierre trazable y relevo para Claude; estado/matriz/checklist actualizados a fuente local ece507b, se separa evidencia histórica Duo de código nuevo sin compilar. Consulta de políticas públicas403 aquí, sin concluir caída global. Ningún push ni distribución.

- 2026-11-08 · Codex CW-CX-025 (QA final): añadida transición hold→anclar con vídeo cargado; PASS sin cambio adicional de aplicación.69 casos de navegador en total; evidencia cx025.

## Misión estratégica vigente (2026-11-08, CW-CX-026)

Autorizados push normal a main y workflows estándar públicos gratuitos, relanzamientos y laboratorio sintético. No autorizados tiendas/TestFlight/Play/web, cuentas/certificados/claves/precios/productos/AdMob, runners de pago ni cambios de identidad/monetización/iOS17/hash28. Los secretos solo los añade el propietario en GitHub Secrets. La propuesta de dominios de R-02 debe aprobarla el usuario antes de editar el manifiesto.

| ID | Criterio adicional | Responsable | Estado/evidencia |
| --- | --- | --- | --- |
| R-55 | Laboratorio iOS: Live Photo emparejada real y matriz destructiva de fixtures, xcresult/capturas reales,10 ciclos con XCTMemoryMetric/XCTCPUMetric y app+WebContent | CX | NOT TESTED; ampliar gate sin falsear permisos |
| R-56 | Tráfico de anuncios de prueba en simulador, solo hosts; ATT/UMP por estado; Privacy Report y propuesta fundamentada de dominios | CX investiga, U aprueba | NOT TESTED; no inferir tracking de cualquier endpoint |
| R-57 | Firma iOS/Android preparada y dry-run ejecutado sin secretos; export local sin upload | CX + U secretos | NOT TESTED; la firma real permanece BLOCKED hasta secretos/autorización |
| R-58 | Fichas, revisión, edad, compras y capturas reales con fixtures en7 idiomas por tienda | CX + CL visual | CW-CX-029: ficha/notas7 idiomas y límites PASS; compras7 existentes. Capturas reales multilingües y clasificación final NOT TESTED/propietario |
| R-59 | E2E Android ampliado: favoritas/undo, Atrás, destrucción con fixtures y10 ciclos con medidas nativas | CX | PASS10ciclos/medición; favoritas/undo ampliadas NOT TESTED | Run42492831172/59912d8,16checks+10rondas reales; [serie ylímites](apple-readiness/NATIVE_LAB.md). Atribución nueva por muestra yR04nativo pendientes |

### Evidencia del inicio

- main df983ad enviada por push normal. Gate42484697595 intento1 FAIL de entorno: descarga Capacitor/Cordova8.6.0 "Could not connect to the server", antes de compilar. Relanzado una vez, no se cambia app por ese fallo.
- Release42484614546 PASS: Xcode27.1/SDK27.1 compila PhotoLibrary.swift arm64 y valida canal tienda. Smoke RC sigue pendiente; una compilación no cierra R-01/R-07.
- Línea base Windows repetida:130 Node,TypeScript y28 hashes PASS. iOSdev42484614885 yAndroid42484614502 en curso; APK/AAB compilan, E2E pendiente.

## Paquete del usuario — pasos en orden

1. Confirmar Apple Developer activo y crear/identificar CocoWash en App Store Connect con work.joaquin.mano. Desbloquea equipo/firma y ficha; no enviar contraseñas.
2. Completar acuerdos de apps de pago, banco/impuestos y condición de comerciante DSA con datos veraces. Desbloquea distribución europea y compras.
3. Configurar los productos existentes y precios en ASC/Play, sin inventar IDs. Confirmar versión/build libres en ambas consolas antes de numerar. Desbloquea sandbox y archivo final.
4. Completar perfil de pagos AdMob y proporcionar IDs públicos de app/unidad Android (no credenciales); mantener estrategia aprobada. Desbloquea canal comercial real.
5. Revisar el Privacy Report del archivo final y validar ATT en TestFlight físico. Los dos hosts ya están aprobados e incorporados; no requieren otra autorización. Cualquier ampliación demostrada de la lista sí se revisará antes de editarla.
6. Disponer de cuenta Play Console verificada y teléfono Android11+; confirmar tipo/fecha de cuenta y requisito real de testers. Organizar12 testers/14 días continuos cuando aplique; solicitar acceso a producción.
7. Añadir secretos de firma a GitHub Secrets siguiendo el procedimiento revisado; jamás por chat ni repo. Apple: certificado/perfil y contraseña con permisos mínimos; Play: clave de subida y contraseñas, clave pública de licencias. Solo tras autorización de firma; todavía no upload.
8. Autorizar publicación de políticas web corregidas y comprobar URLs públicas tras desplegar. No equivale a autorizar publicación de la app.
9. Ejecutar QA física iPhone/Android con biblioteca sintética y plantilla device-results.template.csv: permisos, errores/cancelación/borrado, iCloud,10 ciclos, Live, compras/restore, accesibilidad e idiomas. Nunca borrar medios personales para QA.
10. Tras cero P0/P1 y gates del SHA exacto, autorizar por separado upload a TestFlight/Play interno. Probar el binario distribuido; después autorizar App Review/producción.

- 2026-11-08 · Codex CW-CX-026: misión estratégica registrada, autorización push/CI aplicada, criterios R-55…R-59 y paquete del usuario añadidos; R-44 pasa a implementación autorizada. Sin publicaciones ni cuentas modificadas.

- 2026-11-08 · Codex CW-CX-027: gate nativo intento2 demuestra campo no recibido/guardar deshabilitado antes de PhotoKit. Se aísla variante estándar, sin omitir Duo; se añade valor/teclado y xcresult para diagnóstico. Tres CIs baseline PASS y generador de Live PASS.

- 2026-11-08 · Codex CW-CX-028: R-44 separa compilación AAB tienda y APK developer solo en la copia CI; hashes del HTML/JS verifican cada archivo real del APK/AAB.5 regresiones Python PASS, aceptación de emulador/artefactos pendiente. Sin cambios de monetización/versiones.

- 2026-11-08 · Codex CW-CX-029: ficha Apple ynotas7 idiomas,guardas de UTF-8 eidioma ausente probadas FAIL→PASS;8 Release y7 Play listings PASS. Data safety corregido: dos decimales del geocodificador se consideran ubicación precisa por definición Play; cifrado/retención/proveedor no se dan por verificados. R-44 cerrado con run42486725664.

- 2026-11-08 · Codex CW-CX-030: captura xcresult real confirma R-01 también en18Pro/27.0, no solo Duo. Regresión input con tracker sincronizado1FAIL→3PASS tras fallbackonInput; candidato de app mínimo, repetir XCTest exacto sin debilitarlo. R-01 sigue abierto hasta CI.

- 2026-11-08 · Codex CW-CX-031: onInput no corrige R-01 nativo; nuevo destinatario XCTest bajo prueba. Seeder PhotoKit42489613346 PASS64/3Live. Android42491859489 detecta vídeo fixture duración0; generación animada/probe independiente preparados. Laboratorio iOS añade contrato ligado al simulador y XCTest/medidas app+WebContent; presupuestos declarados antes de obtener ciclos completos.

- 2026-11-08 · Codex CW-CX-032:Android42492831172 PASS10rondas UI reales tras corregir fixture0s. R-46 añade verificación de firma/configuración fail-closed;7 vectores RSA pendientes CI. R-01 app.typeText tambiénFAIL, se reúne evidencia de tecla software sin relajar asserts.

- 2026-11-08 · Codex CW-CX-033:10rondas Android reales ypresupuestos nativos PASS,atribuida serie porActivityManager;memoria mediana+3MiB,CPUfinal2,22%,picos transitorios registrados. FirmaJava42493903317 PASS7. Nuevas pruebas favoritas/Back ycaptura hostsATT preparadas;ningún dominio modificado.

- 2026-11-08 · Codex CW-CX-033 continuación:iOS42492831273 test10rondas PASS393s,XCTestCPU2,739s/ronda yappfootprint≈46–47MB;hostapp+WebContent sin crecimiento sostenido. GateFAILálbum no se oculta. Se corrige evidencia64→70total(6demos precargadas delruntime),auditoría finalenexit ycohortes separadas. Android42493904052 PASSinclKotlin/Java/10rondas.

- 2026-11-08 · Codex CW-CX-035:tecla softwareR01tambiénFAIL42493905346;matriz depreferenciaWebKit enfoco/observaciónsololectura preparada. TestnativoLive real(píxeles/key/timeline/pinch) y2estadosATT/hosts preparados; pendientesCI,dominios intactos. NativeRelease/Git protegidos sin cambios visuales.

## Incidencias nuevas de cierre — CW-CX-036

| ID | Prioridad | Estado | Evidencia / siguiente paso |
| --- | --- | --- | --- |
| R-60 | P1 gate de CI | **PASS corrección de infraestructura** | Se excluye42511286263: noXCTest. Bash3.2 invoca xcodebuild real ypostcondición independiente verifica casos/xcresult/PhotoKit;25testsinfra actualesPASS. Nuevas suites fallidas no se ocultan. |
| R-61 | P0 persistencia | **PASS relanzamiento ×5 en ambos simuladores; físico pendiente** | fa318ba / Android42634538249 e iOS42634699746: decisiones reconocidas sobreviven cinco terminaciones reales sin demora artificial. No valida almacenamiento averiado; R-64 conserva fallback silencioso y sus límites. |

- 2026-11-08 · Codex CW-CX-036:se rechaza falsoverde42511286263(noXCTest), corrige arrayvacíoBash3.2 y añade postcondición independiente. NuevotestAndroid revelaR61P0 pérdida de descarte tras cierre forzado; prioridadsobre materiales. No declarar RC lista.

- 2026-11-08 · Codex CW-CX-037:diagnóstico deR61comparaalmacenamientoantesdeReact,force-stop/background6s yjournalIndexedDBstrictseparado,sinrestaurarlaappnifingirPASS. SetupemuladorrefusafueradeCIefímera.Fixdeproducto aúnpendiente deaislamiento.

- 2026-11-08 · CW-CX-038: matriz WebKit42513277098 demuestra R01 falseFAIL/truePASS (XCTest201,847s + evidencia independiente). Fix mínimo listo para repetir sin observer; CSS/gestos intactos. R61 aislado antes de React (42513754519), aprobación de diario duradero solicitada. R60 deja de ocultar fallos. FullLab bloqueado por helper swiftc120s, hostlab por opcionalCFString; correcciones de infraestructura listas.

- 2026-11-08 · CW-CX-039: dry-run real de archivo sin firma preparado (exit78, privacidadFAIL); capturas Android7idiomas nativas RGB24 preparadas con frontend tienda y8postales sintéticas, pendientes de ejecución. No tienda/web/keys modificados.

- 2026-11-08 · CW-CX-040: evaluador rechaza4falsosverdes demostrados y18testsPASS. Series reales59912d8 iOS/Android pasan también límites por rol/PID; reevaluación offline, no nueva ejecución. R61 sigue abierto.

| R-62 | P1 comercio | Corrección implementada, CI pendiente | Consulta Android desconocida ya no informa adFree=false ni ofrece catálogo/anuncios. E2E prueba rechazo sin clave. Compras reales siguen BLOCKED propietario. |

- 2026-11-08 · CW-CX-041: se corrige fallback comercial desconocido=>adFreefalse en status/catalog/ads; sin modificar monetización ni inventar productos. Kotlin/E2E pendientes.

- 2026-11-08 · CW-CX-042: ATTallowed/denied42514971530 PASS en captura calibrada, propósito de dominios aúnpendiente/aprobación. DryrunApple42515287168 ejecutado ycorrectamente78(privacidadFAIL/credencialesBLOCKED). Android12capturas ES/EN/FR reales, conjunto7idiomasFAIL en alemán; diagnóstico añadido. iOS capturas preparado, aúnNOT TESTED.

- 2026-11-08 · CW-CX-043: verificación codesign de SDK oficial fijado preparada, pendiente macOS; binarios atribuyen dos endpoints publicitarios y UMP, no se adivina dueño deODF. Manifiesto intacto.

- 2026-11-08 · CW-CX-044: propietario aprueba dos hosts exactos; manifiesto actualizado y5regresiones/declaraciónstrictPASS. Captura/Conservar después deATT con nuevosdominios pendiente; privacidad global sigue BLOCKED por archivo/exhaustividad yweb. R61 continúaFAIL.

- 2026-11-08 · CW-CX-045: R01PASS sin observer42514969280 (álbum exacto,metadata,avance,pinch/anclaje). TenrondasPASS314s+auditPhotoKit10ausentes/unknown0. FullsuiteFAIL Live selectorButton; solo consulta exacta se amplía a toggleconchipvisible, diagnósticoLive separado preparado.

- 2026-11-08 · CW-CX-046: métricas662e67dBLOCKED por WebContent nuevo en ronda7(sincontadorCPUinicial); nuevasventanas reales yacotadas3intentos conservan todas lasmuestras,7regresiones/25infraPASS. No ponerCPU0 ni aceptar serie vieja.

- 2026-11-08 · CW-CX-047: capturas nativas7idiomas28iOS+28AndroidPASS en813114c, no publicación. ATTcon2hosts423e79ePASSambos+Conservar. R07 AXrealSwitch66×29 confirma selector. R05añade cancelación ypendingrelaunchiOS; AndroidcasosindependientesantesdeR61sinomitirlo;25testsinfraPASS, nuevas ejecuciones pendientes.

- 2026-11-08 · CW-CX-048: LiveSwitch/playreal yaejecutados5d20e6a; keypausefalla porcomparaciónPNG. Antesdealterarappse añadenRGBAexactos/crops/baselineestable,sintolerancia; diagnósticopendiente. Full44b64eecontinúaindependiente.


## Incidencia de confirmación de favorita — CW-CX-049

| ID | Prioridad | Estado | Evidencia / siguiente paso |
| --- | --- | --- | --- |
| R-63 | P1 validación nativa | **PASS acotado** | 3c19d3d/42539523601: 10 rondas, favorita nativa, colas vacías y RESULT_OK. La suite falla después por texto de prueba español en UI inglesa; force-stop no ejecutado. [Evidencia](apple-readiness/evidence/strategic/android-journal-cycles-3c19d3d.json). |

- 2026-11-08 · CW-CX-049: R62nativo17checksPASScompilado; fullAndroidFAIL R63últimafavorite,no10PASS. ATTdosdominiosPASSfuncionalpero bloqueoNO VERIFICADO(adsTESTtambiénrecibidos); comprobar.app empaquetada yhardware. Capturas56totales reales completas,QAvisualpendiente.

## Decisiones pendientes del usuario

Preguntar juntas al cierre del bloque; continuar el trabajo técnico independiente.

- Estado de cuentas Apple Developer/Play Console, acuerdos y condición DSA.
- Versión/build disponibles, productos/precios comerciales, IDs AdMob Android y clave pública de licencias Play (configuración segura, sin secretos por chat).
- Autorización separada para publicar las políticas ES/EN y para cada subida a las tiendas.
- Dispositivos y testers disponibles para iCloud, ATT físico, compras, accesibilidad y rendimiento.
- Recursos gráficos pendientes R-20, si siguen abiertos tras la revisión visual de Claude.

Ya resuelto: responsable legal/contacto, mantener monetización, dos hosts de tracking y diario duradero R-61. No volver a pedirlos.

- 2026-11-08 · CW-CX-050: consolidados borradores y autorizaciones. [Live RGBA FAIL](https://github.com/joacomino-dev/mano-iphone/actions/runs/42519482281); R-61 pasa a implementación, no a PASS.

- 2026-11-08 · CW-CX-051: diario R-61 local y revisión integrada PASS; [evidencia](apple-readiness/evidence/strategic/r61-local-journal.json). No se cierra el P0 sin prueba nativa.

- 2026-11-08 · CW-CX-053: R-63 nativo acotado PASS; R-47 implementado con revisión y contratos ES/AR. Compilación y fullscreen nativos pendientes.
