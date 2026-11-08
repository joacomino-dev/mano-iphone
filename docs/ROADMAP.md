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

## Dónde estamos (2026-11-08, misión estratégica CW-CX-026/031)

- Fuente canónica main en Developer/CocoWash-android; checkpoints enviados por push normal. Release arm64 Xcode27.1 PASS en df983ad y c03b042; Android y desarrollo c03b042 PASS. No subida a tiendas/web.
- R-01 continúa FAIL en nativo:42489561340 no recibe el texto; onInput no lo resolvió. Nuevo experimento solo XCTest(app.typeText) run42491854605. R-02 sigue FAIL estricto.
- PhotoKit probe42489613346 PASS:64 importaciones,3 Live reconocidas/3 recursos emparejados en18Pro/iOS27.2. Aún no demuestra playback CocoWash. Laboratorio de diez ciclos nativos en preparación.
- Android42491859489 FAIL antes de ciclos: duración0 del screenrecord de emulador estático; se sustituye el fallback por vídeo animado ffmpeg con ffprobe independiente, sin relajar el assert del plugin. R-44 ya PASS en42486725664.
- No apta para envío. R-00/R-07/R-01/R-02 y gates de propietario siguen abiertos. El historial siguiente no sustituye resultados actuales.

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

## A · Código y pruebas iOS (antes de firmar)

| ID | Qué | Quién | Estado | Evidencia / siguiente paso |
|---|---|---|---|---|
| R-01 | Smoke nativo: «Crear y añadir» no guarda el álbum ni cierra la hoja (`PhotosSmokeTests.swift:142`, simulador iPhone Duo iOS 27.1) | CX | **FAIL** | Run 42438304068. CW-CX-027: run42484697595 intento2 reproduce INPUT_MISMATCH, enabled=false antes de PhotoKit; aislar variante estándar frente a Duo y conservar xcresult. No cambiar onChange por hipótesis. [Evidencia](apple-readiness/NATIVE_FOLLOWUP.md) |
| R-02 | Privacidad: `NSPrivacyTracking=true` sin dominios de rastreo; `check-apple-privacy.py --submission` exit 1 | CX (+U con AdMob) | **FAIL** | CW-CX-023: ZIPs oficiales revalidados, manifiestos sin dominios; gate exit1 conservado. [Fuentes/procedimiento](apple-readiness/NATIVE_FOLLOWUP.md#r-02--fail-estricto-conservado) |
| R-03 | Captura del fallo del smoke en dispositivos de 2 pantallas (`simctl io screenshot` exige `--display`) | CX | **PASS (colector)** | CW-CX-027/030:simctl real displays3/1 exit0 yxcresult42488119404 exporta la captura exacta durante el fallo. No acredita adaptación visual Duo |
| R-04 | Revisar invalidación de snapshots alrededor de la cola de favoritas Android y el `flushFavorites()` de fin de ronda | CX | **Corregido localmente; QA nativa bloqueada** | CW-CX-024:4 fallos reproducidos,7 casos web+2 puros PASS; cola/acuse/undo y snapshots protegidos. [Evidencia](apple-readiness/ANDROID_FAVORITES.md) |
| R-05 | QA destructiva en simulador con fixtures: borrar/cancelar/error, favorita externa, permiso revocado, cierre antes/después de confirmar | CX | Bloqueado | Procedimiento en `docs/apple-readiness/NATIVE_GATE.md` y `TEST_PLAN.md`; necesita Mac o CI ampliada |
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
| R-16 | Versión y build de envío (no reutilizar 43; consultar ASC) | U + C | Pendiente | No subir versiones sin ASC |
| R-17 | Publicar las políticas corregidas ES/EN con apartado Android (`web/cocowash/`) y comprobarlas tras desplegar | U autoriza, C prepara | Pendiente | La web pública sigue con la versión anterior (comprobado 2026-11-07) |
| R-18 | Ficha, etiquetas de privacidad, clasificación por edad, notas de revisión | U + C | En curso | Borradores en `docs/appstore/` y `docs/apple-readiness/storefront/`; revisión nativa de textos pendiente |

## C · Arte y capturas

| ID | Qué | Quién | Estado | Evidencia / siguiente paso |
|---|---|---|---|---|
| R-20 | Icono definitivo del basurero (sello «Eliminar») y la otra imagen pendiente | U | Pendiente | — |
| R-21 | Capturas nativas reales de iPhone 6,9" (sin fotos personales) | U + CL | Bloqueado | Requiere dispositivo o simulador; plan en `docs/appstore/screenshots.md` |

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
| R-42 | Keystore de desarrollo en los secretos de GitHub | U | Pendiente | Clave en `C:\Users\Joaco\Developer\cocowash-keys` (LEEME) |
| R-43 | IDs reales de AdMob Android y canal de tienda Android en `main` (ya no hay rama `release`) | U (IDs) + CX | BLOCKED IDs; mecanismo en curso | CW-CX-032:variables Android separadas,debug sample ygate estricto preparados; falta CI yconfiguración del propietario, no usar iOS |
| R-44 | Con `main` en canal de tienda, el APK de desarrollo oculta «Modo developer»: decidir si su CI cambia su copia a desarrollo como la IPA | CX | **PASS** | CW-CX-028: run42486725664 valida hashes de APK developer/AAB tienda,5 regresiones yE2E emulador PASS. IDs reales/firma/compras siguen en sus gates |
| R-45 | P3 posterior: detector de texto/embedder adicional Android | CX si se autoriza | Pendiente, fuera de primera publicación | Texto no disponible se mantiene oculto; parecido dHash existente no equivale a embedder. No incorporar modelos nuevos ni anunciar funciones incompletas para cerrar la primera versión |
| R-46 | Verificar firma de compras con la clave de licencias | CX + U | En curso; sandbox BLOCKED | CW-CX-032:verificador local y7 vectores RSA,errores/recibos no verificados nunca éxito; CI Java/Kotlin pendiente. [Configuración y límites](playstore/PURCHASE_VERIFICATION.md) |
| R-47 | Carta de anuncio con Fredoka y espejo RTL; vídeo a pantalla completa | C | Pendiente | — |
| R-48 | Prueba interna, cerrada (14 días) y solicitud de producción | U + C | Bloqueado | Tras R-40…R-43 |
| R-49 | Firma de producción Android: Play App Signing, clave de subida/recuperación y AAB del canal real; contratos de pagos/productos Play y Data safety contrastado con SDK/tráfico | U configura + CX verifica | Pendiente | La clave de desarrollo R-42 y una CI verde no acreditan firma comercial ni productos Google Play funcionales |

## F · Repositorio y entorno

| ID | Qué | Quién | Estado | Evidencia / siguiente paso |
|---|---|---|---|---|
| R-50 | Una sola rama `main`; copia de las 21 ramas en `work/backup/mano-iphone-all-branches-2026-11-07.bundle` | CL | Hecho | CW-CL-060 |
| R-51 | Copias locales antiguas (`CocoWash-b24`, `CocoWash-stage1` con cambios sin confirmar, worktree de Codex, OneDrive) | U decide | Pendiente | No usarlas como base; archivar tras revisar los cambios de `CocoWash-stage1` |
| R-52 | Workflows heredados (`build-ios.yml`, `build-ios-package.yml`) y avisos de Node 20 en acciones | C | Pendiente | Solo manuales; decidir si se retiran |
| R-53 | Elegir/verificar disponibilidad efectiva iPhone en iPad, Mac Apple silicon y visionOS; pruebas y accesibilidad para destinos ofrecidos | U decide + CX/CL verifican | Pendiente | Familia iPhone no sustituye opciones de disponibilidad de ASC. No prometer destinos sin QA |
| R-54 | Gate final por tienda: cero P0/P1 abiertos, recurso/capturas reales, accesibilidad/locales, privacidad/SDK/consentimiento y compras del artefacto exacto | CX técnico + CL visual + U envío | Bloqueado | Separar fuente, simulador, hardware y distribución. R-00 físico, R-01 y R-02 impiden aceptar la RC; scripts preparados no cierran gates |

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
5. Resolver con el proveedor la evidencia de dominios de tracking; aprobar lista e impacto cuando Codex entregue la propuesta. Desbloquea gate estricto Apple.
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
| R-60 | P1 gate de CI | FAIL detectado; corrección preparada | Run42511286263/e48e62c figura success pero NO ejecutó XCTest:AppleBash3.2 `capture[@]: unbound variable`. No cuenta como PASS nativo. Wrapper ahora siempre contiene xcodebuild yse exige comprobación independiente de casos ejecutados/xcresult/PhotoKit/métricas.14 pruebas de infraestructura PASS local;repetir CI. |
| R-61 | P0 persistencia | FAIL aplicación | Android42511282029/e48e62c:descartarfixture,persistedpending1,force-stop antes de confirmar,relaunch=>pending0. No borrado por ese gesto; pérdida de decisión guardada reproducida. Investigar durabilidad localStorage/arranque antes de cambiar almacenamiento. Fuente Chromium documenta commit diferido5s;hipótesis compatible, falta aislar. |

- 2026-11-08 · Codex CW-CX-036:se rechaza falsoverde42511286263(noXCTest), corrige arrayvacíoBash3.2 y añade postcondición independiente. NuevotestAndroid revelaR61P0 pérdida de descarte tras cierre forzado; prioridadsobre materiales. No declarar RC lista.

- 2026-11-08 · Codex CW-CX-037:diagnóstico deR61comparaalmacenamientoantesdeReact,force-stop/background6s yjournalIndexedDBstrictseparado,sinrestaurarlaappnifingirPASS. SetupemuladorrefusafueradeCIefímera.Fixdeproducto aúnpendiente deaislamiento.

- 2026-11-08 · CW-CX-038: matriz WebKit42513277098 demuestra R01 falseFAIL/truePASS (XCTest201,847s + evidencia independiente). Fix mínimo listo para repetir sin observer; CSS/gestos intactos. R61 aislado antes de React (42513754519), aprobación de diario duradero solicitada. R60 deja de ocultar fallos. FullLab bloqueado por helper swiftc120s, hostlab por opcionalCFString; correcciones de infraestructura listas.

- 2026-11-08 · CW-CX-039: dry-run real de archivo sin firma preparado (exit78, privacidadFAIL); capturas Android7idiomas nativas RGB24 preparadas con frontend tienda y8postales sintéticas, pendientes de ejecución. No tienda/web/keys modificados.
