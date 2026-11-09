# CocoWash — Release Candidate en estabilización

## Candidato 0.9.9.2 — CW-CX-058, 9 de noviembre de 2026

Código `837875e474fc9870c5c01fcd8f6ebf2ebbb0f33e`. Etiqueta visible **0.9.9.2**,
iOS **0.9.9 (44)**, mínimo **17.0**; Android **0.9.9.2 (4)**, mínimo API30 y target36.
El cuarto componente es la etiqueta de CocoWash; Apple exige tres componentes
para CFBundleShortVersionString. Los números de envío deben estar libres en las
consolas. No se ha firmado, subido ni publicado esta entrega.

**PASS local:** 138 Node, TypeScript, protected28, builds web/native-web,
9 release (incluida regresión de versión inválida), 4 contratos, 25 Python y
56 escenarios Edge con medios sintéticos. Cuatro fixtures Bash verifican que el
reintento iOS se limita al bootstrap anterior a cualquier marcador UI. Revisión
integrada sin hallazgos. [Evidencia](evidence/strategic/0992-local.json).
`InlineVideo`, `Inspector`, dominio, PhotoKit, recuperación silenciosa R-64,
arte y dependencias se conservan.

**Gates del mismo código:**

- [Tienda iOS](https://github.com/joacomino-dev/mano-iphone/actions/runs/42628838115): PASS, compilación sin firma y canal de tienda.
- [Desarrollo iOS](https://github.com/joacomino-dev/mano-iphone/actions/runs/42628837557): en curso.
- [Android](https://github.com/joacomino-dev/mano-iphone/actions/runs/42628837411): en curso; debe demostrar Back, diez ciclos y persistencia.
- [Fotos iOS completo](https://github.com/joacomino-dev/mano-iphone/actions/runs/42628871026): en cola tras el gate anterior; no duplicar.

Android exige que el aviso inicial desaparezca y que CocoWash tenga foco antes
de enviar Back; todas las postcondiciones se mantienen. El gate iOS conserva
las aserciones y permite un solo reintento del fallo de background assertion
demostrado en el primer lanzamiento, antes de toda aceptación UI. No se altera
la app para obtener un PASS. Estas correcciones necesitan su resultado nativo.

**Preflight de firma ejecutado:** cuatro comprobaciones de fuente PASS;
distribución BLOCKED, exit78 esperado. No inspecciona certificados ni claves,
no firma y no contacta cuentas Apple. La plantilla
[ExportOptions](ExportOptions.example.plist) y los procedimientos de archivo,
[TestFlight](TESTFLIGHT.md) y [envío](APP_STORE_SUBMISSION_CHECKLIST.md) están preparados.
Credenciales existentes, cuenta, Privacy Report del archivo, disponibilidad de
versiones, comercio, política pública, aceptación visual y QA física siguen
pendientes. **NO APTA para enviar hasta cerrar esos gates.**

Requisitos reconsultados: [versión Apple](https://developer.apple.com/documentation/bundleresources/information-property-list/cfbundleshortversionstring),
[Xcode26/SDK26 desde abril de 2026](https://developer.apple.com/news/upcoming-requirements/?id=04282026a),
[target API36 de Play](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en-mt).
Xcode27.1/SDK27.1 configurados en CI; no se reduce iOS17 ni se actualizan dependencias.

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
| Metadatos/icono | PASS preparación |7fichas,notas,revisión/IAP;icono aprobado1024RGB. Capturas finales nativas completas/QA pendientes |
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
