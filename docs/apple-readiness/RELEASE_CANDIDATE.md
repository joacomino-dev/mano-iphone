# CocoWash — Release Candidate en estabilización

## Candidato 0.9.9.2 — 9 de noviembre de 2026

**Estado: FAIL técnico / distribución BLOCKED. No apta para enviar.**
Código de aplicación `fa318baa2b9937c812c1ff606751aa6bfa708530`;
checkpoint final de pruebas `afbd2f991aeddbd850b72eac547fe6cfc420714b`.
El diff entre ambos no cambia fuentes compiladas de la app: solo XCTest,
instrucciones del artefacto Android y documentación. La entrega documental final
se identifica con `git log -1 --format=%H -- docs/apple-readiness/RELEASE_CANDIDATE.md`.

Etiqueta visible **0.9.9.2**; iOS **0.9.9 (44)**, mínimo **17.0**, arm64/iPhone;
Android **0.9.9.2 (4)**, mínimo API30, target36. Confirmar que los números están
libres en las consolas antes de firmar. Apple exige tres componentes para la
versión nativa. No se han firmado archivos comerciales, subido apps ni publicado.

| Requisito | Estado | Evidencia y límite |
| --- | --- | --- |
| Node, TypeScript, builds web y native-web | PASS | 138 Node; builds ejecutados sobre las mismas fuentes de app |
| Runtime protegido e identidad | PASS | 28 archivos intactos; Inspector/InlineVideo conservan hashes; sin cambios de arte |
| Regresiones locales | PASS | 9 release, 4 contratos, 25 Python, 56 escenarios Edge y 4 fixtures Bash de bootstrap |
| Compilación iOS tienda/desarrollo | PASS | fa318ba: 42634699549 / 42634699515; desarrollo prueba arranque y relanzamiento |
| Android nativo completo | PASS | 2794e4b / 42669935821 confirma de nuevo E2E17, Back, favoritas, cancelación, diez rondas y force-stop ×5 |
| Presupuestos Android | PASS | 65 elementos generados, API35; PSS 219097→228590 KiB, pendiente 515,15 KiB/ciclo. Mismos límites; detalle de CPU y picos debajo |
| Diario tras terminación real | PASS | Decisión reconocida conserva pendientes ×5 en ambos simuladores; no promete durabilidad con almacenamiento averiado |
| Gate Fotos iOS completo | FAIL | 2794e4b / 42669952998: 5 PASS, 1 FAIL, 2 SKIP; solo destino del pellizco anclado |
| Ajuste del destino de pellizco | NOT TESTED | afbd2f9 / 42682535759 en curso; revisión integrada, runtime28, release9 y contratos4 PASS |
| iOS17/18/26, Duo y hardware físico | BLOCKED | Matriz por modelo/OS y postura; ningún nuevo teléfono utilizado en esta entrega |
| Privacidad de fuente/hosts/manifiestos | PASS | Declaración estática comprobada; no acredita exhaustividad ni bloqueo de red |
| Privacidad del archivo y ATT físico | BLOCKED | Privacy Report agregado y pruebas en TestFlight físico pendientes |
| Monetización comercial | BLOCKED | Se conserva estrategia; IDs Android/clave Play, consolas, contratos y compras sandbox pendientes |
| Textos y metadatos de siete idiomas | PASS | ES/EN/FR/DE/IT/AR/JA comprobados en fuente, límites y recursos del bundle |
| Aceptación visual de localizaciones | BLOCKED | Capturas reales preparadas; falta aprobación de Claude/propietario |
| Accesibilidad de lanzamiento | BLOCKED | Seis escenarios web PASS; VoiceOver/Dynamic Type físico y declaraciones de tienda pendientes |
| Iconos y recursos compilados | PASS | Icono aprobado preservado, dimensiones/alpha comprobados y compilación nativa PASS |
| Aceptación artística final | BLOCKED | R-20 y revisión de Claude/propietario pendientes; sin reemplazar recursos aprobados |
| Firma, TestFlight y Play interno | BLOCKED | Cuentas, identidades existentes, QA y autorización de subida separada |

### Correcciones y límites

R-47b está comprobado en emulador: Atrás sale del fullscreen al mismo visor y el
siguiente Atrás lo cierra, conservando elemento, fuente, posición, sonido y galería.
La medición Android usa `dumpsys meminfo --local`: el modo normal invocaba GC en el
proceso medido. No se cambiaron presupuestos ni código de rendimiento de la app.

R-07b modifica solo XCTest: el vídeo usa pointer-events:none y los gestos los
recibe Inspector; se elige un marco visible y se exige timeline accesible. El
xcresult registra una lectura AX de 2,87 s: se observa hasta cuatro bucles de 3 s,
sin quitar la exigencia de posición baja real, cambio de píxeles ni controles sin
escalar. Revisión integrada sin hallazgos. El gate `2794e4b` confirma bucle, pero no encuentra
el vídeo por label. El ajuste CW-CX-062 usa el ancestro del timeline real y
conserva las aserciones. [Gate actual](https://github.com/joacomino-dev/mano-iphone/actions/runs/42682535759)
en curso; no se repiten Android ni binarios porque sus fuentes no cambiaron.

**R-67 P1 sigue abierto:** tras un relanzamiento la jerarquía WKWebView no tenía
contenido y no apareció Eliminar durante 120 s. Bridge inicializado y documento
principal comprometido; causa no determinada. La prueba no llegó al borrado.
No se oculta con un relanzamiento automático ni se modifica persistencia por hipótesis.
En `2794e4b` pasan cancelación, cinco relanzamientos y diez rondas; R-67 no se
reproduce allí. Una ejecución posterior satisfactoria no demuestra la causa ni
cierra por sí sola el fallo intermitente. [Resultado reciente](evidence/strategic/0992-ios-2794e4b.json).
[Evidencia nativa](evidence/strategic/0992-native-fa318ba.json),
[evidencia local](evidence/strategic/0992-local.json).

Se conserva recuperación silenciosa R-64: reintento, memoria y espejo local;
el fallback no garantiza durabilidad ante terminación. No se repiten operaciones
de Fotos. Sin Personas, Breakup, nuevos modelos, dependencias o cambios de diseño.

### Instaladores de prueba

IPA preparada en Descargas: `CocoWash-0.9.9.2-build44-fa318ba.ipa`,
6.828.204 bytes, SHA-256
`9a71e51b235cf82a6e125edcd3f884798c10b4b65def35ecd8fed455e18a150b`.
[Recibo](evidence/strategic/0992-delivered-ipa.json): ZIP/CRC, fuente, bundle,
arm64, mínimo17, siete InfoPlist.strings, dos hosts y ausencia de reset verificados.
Sin firma/provisioning, anuncios de prueba: requiere firma personal mediante
iLoader. No es el archivo de TestFlight ni una instalación física verificada.
Conservar app/datos existentes; no desinstalar para resolver un conflicto de firma.
Android 2794e4b / 42669935821 PASS. En Descargas:
`CocoWash-0.9.9.2-android-build4-2794e4b.apk` (24.598.910 bytes), SHA-256
`2062b9b1b0b67edfc638b857a0541ea163379c499e42f95731a3f71d0b77325b`;
AAB (11.381.661 bytes), SHA-256
`6c30fab747a1c000ab02d41f699b6dd379f9fb9569f65086793cf23dca4192d2`.
[Recibo](evidence/strategic/0992-delivered-android.json): digest/CRC y hashes de
canal developer del APK/canal tienda del AAB comprobados. APK con firma temporal;
AAB sin firma ni configuración comercial aceptada: no subirlo a Play.

[Métricas Android](evidence/strategic/0992-android-2794e4b.json): mediana CPU de las
últimas tres ventanas 0 % a resolución del contador, con picos intermedios de CPU
combinada 102,92 %. No representa consumo físico nulo ni medición de batería.
Conservar esos picos para QA física/Perfetto; no se alteran presupuestos para aceptar.

### Acciones humanas y distribución

El [checklist operativo](APP_STORE_SUBMISSION_CHECKLIST.md) ordena ambas tiendas.
Preflight de fuente ejecutado: cuatro comprobaciones PASS, distribución BLOCKED,
exit78 esperado. [Recibo](evidence/strategic/0992-signing-dry-run.json).
El script de archivo local y [ExportOptions](ExportOptions.example.plist) están
preparados; no crean certificados ni suben archivos. Véanse [gate Mac](NATIVE_GATE.md),
[TestFlight y hardware](TESTFLIGHT.md) y [compras Play](../playstore/PURCHASE_VERIFICATION.md).

Faltan cuentas/acuerdos/DSA, identidades y perfiles existentes, números libres,
productos/precios/sandbox, configuración AdMob Android y clave pública de licencias,
Privacy Report agregado y ATT físico, políticas públicas actualizadas, aceptación
visual y QA de permisos/iCloud/bibliotecas grandes/Instruments/VoiceOver. El
propietario ya confirmó responsable/contacto y conservar la monetización; no se
reabren esas decisiones. Cada subida y publicación necesita autorización separada.
Paquete local `CocoWash-0.9.9.2-politicas-ES-EN.zip` en Descargas, solo los dos
HTML y sus instrucciones/hashes; [recibo](evidence/strategic/0992-policy-package.json).
Las URL actuales 200 tienen contenido anterior sin Android; no se ha desplegado.

Requisitos consultados: [versión Apple](https://developer.apple.com/documentation/bundleresources/information-property-list/cfbundleshortversionstring),
[App Review](https://developer.apple.com/app-store/review/guidelines/),
[SDK mínimo](https://developer.apple.com/news/upcoming-requirements/?id=04282026a),
[target Play](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en-mt).
CI real: Xcode27.1 build27A9275, SDK27.1, simulador iPhone18Pro/iOS27.0.
[Compatibilidad](COMPATIBILITY.md): mantener iOS17; no extrapolar esas pruebas a otras familias.

## Historial 0.9.9.1 — no es la aceptación del candidato actual

Actualizado 2026-11-09, CW-CX-055/056. **NO APTA para enviar.** Correcciones candidatas
en `6386f55`; las pruebas nativas de este checkpoint siguen en curso o en cola. La firma,
privacidad del archivo, configuración comercial y QA física siguen bloqueadas.

## Estado actual — relevo de Claude y CW-CX-055

Se conserva `37facf1` y todo el trabajo de Claude. El sonido se sincroniza aparte
del efecto de reproducción; `InlineVideo` e `Inspector` mantienen sus hashes.
PASS local de esta sesión: 138 Node, TypeScript, protected28, web/native-web,
silencio sin pausa, anclada 5, Live 5 y reanudación 3.

Contrato vigente R-64, decidido por el usuario: el diario reabre y reintenta; si
falla, continúa con memoria y espejo localStorage, sin avisos de almacenamiento.
Ese fallback no promete durabilidad ante terminación. Nunca repite una operación
de Fotos. R-61 tiene relanzamiento ×5 PASS en iOS `8f2549e`; queda la comprobación
Android del checkpoint, sin sustituirla por un retraso artificial.

El xcresult anterior `42554023066` contiene **5 PASS, 1 FAIL y 2 SKIP**; los dos
SKIP pertenecen a capturas y publicidad con workflows separados. El único FAIL
es el gesto de XCTest sobre Live anclada; foto clave visual, timeline y bucle pasan.
El usuario confirma el pellizco y la ausencia de raya en su iPhone. R-07b cambia
solo el destino del pellizco de XCTest. R-47b unifica Atrás nativo y sale del estado
fullscreen DOM; exige conservar reproductor, posición y sonido. Revisión integrada
sin hallazgos. No se modifica la app para aparentar un PASS del test.

Pruebas del mismo SHA `6386f55`: [suite iOS completa](https://github.com/joacomino-dev/mano-iphone/actions/runs/42623622241),
[Android](https://github.com/joacomino-dev/mano-iphone/actions/runs/42623186603),
[tienda iOS](https://github.com/joacomino-dev/mano-iphone/actions/runs/42623207314) y
[desarrollo iOS](https://github.com/joacomino-dev/mano-iphone/actions/runs/42623186747).
Tienda iOS PASS; Android y desarrollo en curso; suite completa en cola tras el
[gate de 571b1e5](https://github.com/joacomino-dev/mano-iphone/actions/runs/42620548423).
Android anterior falló Atrás sin llegar al dispatcher; la corrección adicional
intercepta la tecla antes de WebView y da prioridad al gesto del overlay.
Desarrollo anterior compiló, pero el build del simulador consumió 9m47s y el paso
agotó sus diez minutos; ahora dispone de veinte, conservando las aserciones.
Arrancar CI no acredita su resultado.

Hay 28 capturas nativas por plataforma, siete idiomas. ATT tras manifiesto permite
seguir organizando en ambos estados, pero el bloqueo de hosts queda para TestFlight
físico. Firmas del proveedor PASS; Privacy Report del archivo final, firma, cuentas,
compras reales, política pública y hardware siguen bloqueados. No hay envío ni
publicación. La infraestructura de medición permanece congelada.

## Fuente y protección

Única fuente: `C:/Users/Joaco/Developer/CocoWash-android`, rama `main`, remoto
`joacomino-dev/mano-iphone`. Checkpoint inicial estratégico df983ad; último checkpoint
de producto `6386f55`. El SHA del informe se obtiene mediante
`git log -1 --format=%H -- docs/apple-readiness/RELEASE_CANDIDATE.md`.
Push normal y CI pública estándar gratuita autorizados; sin subidas a tiendas/web,
certificados, cuentas ni instalación en teléfono. No reset/stash/clean/force-push.

Visible0.9.9.1; iOS0.9.9/build43; AndroidversionCode3. Bundlework.joaquin.mano.
Mínimo iOS17, arm64, iPhone/retrato conservados. Versión/build de envío deben
contrastarse con las consolas. Runtime28 intacto; sin reemplazar arte, personajes,
lettering, icono ni animaciones aprobadas. Sin nuevos modelos/Personas/Breakup.

El [informe del 7 de noviembre](RELEASE_CANDIDATE_2026-11-07.md) queda histórico:
sus rutas b24, rama antigua y ausencia de push no describen esta fuente integrada.

## Estado de aceptación

| Requisito | Estado | Evidencia / límite |
| --- | --- | --- |
| Cero P0 conocidos | BLOCKED por validación pendiente | R-61 corregido; relanzamiento iOS ×5 PASS anterior, Android del checkpoint en curso. Fallback R-64 no garantiza guardado si todos los almacenamientos fallan |
| Cero P1 de distribución | FAIL | R02 declaración estática corregida con aprobación; validar archivo, tráfico y seguridad nativa completos |
| Pruebas JS / TypeScript / runtime28 | PASS | 138 Node, tsc y 28 hashes en esta sesión; regresiones de silencio, anclada, Live y reanudación |
| Web/native-web | PASS | Ambos compilados en esta sesión con sus scripts de preparación |
| Release arm64 sin firma / Swift | PASS por SHA | 6386f55 / 42623207314: tienda iOS compila y verifica canal; no equivale a firma ni distribución |
| Álbum iOS | Corrección comprobada en experimento | 42513277098: preferenciafalse FAIL, true XCTest completo PASS201,847s +postcondición; confirmado sin observer42514969280; pinch/anclajePASS |
| 10 ciclos nativos y métricas | PASS acotado | 59912d8: iOS42492831273 yAndroid42492831172; presupuestos agregados/porPID PASS. Solo biblioteca pequeña de fixtures |
| Live Photo real | NOT TESTED en candidato | Anterior: clave visual, timeline y bucle PASS; gesto simulado de pinch FAIL. Usuario confirma Live anclada; XCTest dirigido al medio pendiente |
| Cierre forzado y decisiones | NOT TESTED completo en candidato | Relanzamiento ×5 iOS anterior PASS; Android del mismo SHA en curso. No prometer durabilidad con almacenamiento fallido |
| ATT y tráfico real de SDK | PASS acotado | 42514971530: permitido/denegado, request+callback reales, calibración yrestauraciónPASS. Anuncios de prueba |
| Privacidad de envío | FAIL | Declaración strict PASS con dos hosts aprobados; tráfico actualizado, exhaustividad y archivo final BLOCKED |
| Firmas SDK proveedor | PASS | 42516183457 verifica ZIPs oficiales fijados, codesign/macOS,identidad ymanifiestos. No firma del archivo CocoWash |
| Compras Android | PASS código / BLOCKED comercio | Firma RSA, siete vectores JVM y 17 checks de puente nativo PASS. R62 falla de forma explícita con clave ausente; sandbox y configuración comercial pendientes |
| Política ES/EN | PASS borrador / BLOCKED pública | Responsable/contacto confirmados; documentos ajustados a SDK ygeocodificación. Publicación web requiere autorización y comprobación posterior |
| Localización7idiomas | PASS fuente / NOT TESTED nativa completa | ES/EN/FR/DE/IT/AR/JA; límites Apple/Play PASS. Android42516038859 completa28capturas nativas; revisar artefactos yRTL. Primer intento12/28falló al recargar; causa no demostrada |
| Accesibilidad | PASS parcial / NOT TESTED Apple | Alternativas de botones ypruebasweb existentes; VoiceOver/DynamicType/gestos físicos pendientes. No declarar etiquetas Accessibility completadas |
| Metadatos/icono | PASS preparación |7fichas,notas,revisión/IAP;icono aprobado 1024RGB. Capturas finales nativas completas/QA pendientes |
| Archivo/firma/exportación | BLOCKED | Dryrun42515287168 ejecutado yexit78: fuentePASS,privacidadFAIL,credenciales/versión/autorizaciónBLOCKED. Sin firma niupload |
| TestFlight / Play interno / App Review | BLOCKED | No enviado; requiere cerrar P0/P1, credenciales, cuentas yautorización explícita |

## Correcciones verificables

- R01: habilitar interacción de texto real de WKWebView. La preferenciafalse
  impedía incluso insertar mediante tecla software. CSS mantiene selección ycallout
  desactivados fuera de campos; gestos de tarjetas requieren nueva regresión nativa.
- R60: se rechazó un falsoverde de CI (arrayvacío Bash3.2 antes de XCTest). Wrapper
  guarda RUNNING/exitcode real yotra comprobación exige casosPASSED,xcresult,PhotoKit,
  métricas yauditoría. No se cuenta42511286263 como PASS nativo.
- R46/R62: firma local de recibos Play, errores explícitos yno concesión/consumo de
  compras no verificadas; unknown no se convierte en adFreefalse. Mantiene estrategia,
  IDs/productos existentes; configuración comercial ycompras reales pendientes.
- Pruebas: no sumar conteos entre entornos como una única aceptación.25 pruebas Python del
  gate (incl4regresiones nuevas fallaronantes/pasandespués);4atribución Android;
 4parserhosts;4collector;8Release;130Node y4contratos separados.

## Métricas reales y límites

iOS59912d8:10rondas393,538s; CPUXCTestmedia2,739s/ronda; footprintabsoluto45,57→47,24MB,
pico58,68MB. Ciclos/instrucciones0 delsimulador no son eficienciaPASS. RSS host
app+5WebContent baja de mediana1,80→1,43GiB; páginas compartidas, noRAMfísica.
Android mismafuente:PSS atribuido app+renderer mediana240689→243715KiB (+2,955MiB),
pendiente−311,9KiB/ronda;CPUreposofinal2,22%,picos≈92% transitorios no ocultos.
[Detalles ypresupuestos](NATIVE_LAB.md), [evidencia](evidence/strategic/).
No extrapolar a bibliotecas grandes, teléfonos antiguos, batería ni Instruments.

## Privacidad y comercio

Fotos/vídeos ydecisiones se procesan/guardan localmente. Eso no significa que la app
no recopile datos: GMA/UMP pueden recopilar ID,datos publicitarios,interacciones y
rendimiento; geocodificación puede enviar coordenadas redondeadas al servicio nativo.
Apple coarse yPlay precise se clasifican según definiciones distintas. No anunciar
"todo offline" o "sin recopilación". La política publicada debe coincidir.

Monetización actual mantenida por decisión del propietario. Catálogo/precios deben
proceder de StoreKit/Play; no hay productos o precios inventados. Compras/test ads no
acreditan comercio funcional. Android necesita AdMobAndroid IDs yclave pública Play;
las muestras yAABsin firma no son envío. No se elige unilateralmente versión gratuita.

## Procedimiento y siguiente cierre

Seguir [checklist operativo](APP_STORE_SUBMISSION_CHECKLIST.md),
[matriz](COMPATIBILITY.md), [laboratorio](NATIVE_LAB.md),
[gate nativo](NATIVE_GATE.md), [TestFlight](TESTFLIGHT.md) y
[Play](../playstore/PURCHASE_VERIFICATION.md). El [roadmap](../ROADMAP.md) es el registro vivo.

Primero terminar los gates de `6386f55`: Live, Atrás y fixtures destructivas, con
relanzamiento y persistencia. No reintroducir los avisos retirados por R-64. Después cerrar
privacidad con dominios aprobados y evidencia restante, SDKs/archivo ytráfico denegado/revocado.
Repetir todos los gates del SHA final. Solo entonces preparar firma/exportación ysolicitar
por separado autorización para subir a TestFlight/Playinterno.

## Paquete del usuario y decisiones pendientes

- [Checklist operativo de envío](APP_STORE_SUBMISSION_CHECKLIST.md): orden de pruebas,
  firma, exportación y subida; preparar archivos no autoriza publicar.
- [Decisiones pendientes, lista única](../ROADMAP.md#decisiones-pendientes-del-usuario):
  cuentas, acuerdos/DSA, productos/precios, IDs Android y clave pública Play,
  versión/build libres en las consolas, política pública y dispositivos/testers.
- [Metadatos y materiales](storefront/metadata.json) y [revisión/IAP](storefront/review-localizations.json).
  Hay siete idiomas preparados; el responsable y contacto legal ya están confirmados.
- [Relevo visual de Claude](../ai-handoff/PROMPT_CLAUDE_2026-11-09.md): aceptar el aspecto
  con evidencia nativa y generar después IPA/APK del código validado.

Ya están aprobados mantener la monetización, los dos hosts de tracking y el diario
R-61. No necesitan otra decisión. Credenciales únicamente en Keychain/Secrets o en
la interfaz segura de cada servicio; nunca por chat. Cada publicación web y cada
subida a tienda requieren autorización aparte. QA destructiva solo con fixtures.


Serie662e67d: diez ciclos funcionales PASS314s ypostauditPhotoKit10ausentes/unknown0.
El presupuesto de esa serie esBLOCKED por contadorCPU dePIDreciénnacido en ronda7;
no hereda el PASS de59912d8. Colector corregido pendiente de ejecución.
