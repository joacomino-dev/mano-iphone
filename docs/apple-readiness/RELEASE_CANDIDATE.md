# CocoWash — Release Candidate en estabilización

Actualizado 2026-11-08, CW-CX-026…046. **NO APTA para enviar.** P0 R-61 reproducido:
un cierre forzado Android puede perder una decisión que localStorage ya devuelve.
Las fotografías no se borraron en esa prueba. No se cambia FAIL por documentación.

## Estado actual — CW-CX-051 a CW-CX-053

Diario R-61 implementado en `248ec6a`, revisado y enviado. PASS local: 138 Node,
ocho escenarios IndexedDB reales, TypeScript, protected28 y builds. Las decisiones
se confirman después del commit; una operación nativa interrumpida conserva su
intención y no se repite automáticamente. **Force-stop nativo todavía pendiente.**

`3c19d3d` completa 17 checks Android, diez rondas, cancelación y favorita nativa
R-63. La suite falla antes del cierre forzado por una comparación de texto español
en una interfaz inglesa; se ha corregido usando el badge visible y el estado del
control, sin añadir demora. Los runs completos iOS estándar y Duo siguen pendientes
de resultado. No se sustituye su ejecución por los resultados locales.

R-07 conserva el FAIL anterior de RGBA; el vídeo pausado ya sale del renderizado,
con cinco escenarios web PASS. Falta la comprobación exacta nativa. R-47 preparado
en `12c153d`: fuente Fredoka local, dirección del idioma y mismo reproductor en
fullscreen Android; compilación y comportamiento nativos pendientes. Claude debe
aceptar Live, carta, ausencia de selección/lupa y las capturas finales.

Hay 28 capturas nativas por plataforma, siete idiomas. ATT tras manifiesto permite
seguir organizando en ambos estados, pero el bloqueo de hosts queda para TestFlight
físico. Firmas del proveedor PASS; Privacy Report del archivo final, firma, cuentas,
compras reales, política pública y hardware siguen bloqueados. No hay envío ni
publicación. La infraestructura de medición permanece congelada.

## Fuente y protección

Única fuente: `C:/Users/Joaco/Developer/CocoWash-android`, rama `main`, remoto
`joacomino-dev/mano-iphone`. Checkpoint inicial estratégico df983ad; último checkpoint
de producto 12c153d. El SHA del informe se obtiene mediante
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
| Cero P0 conocidos | FAIL | R61, run42513754519: pending1→0 ya antes de React; background6s conserva. Diario implementado y revisado; force-stop nativo pendiente |
| Cero P1 de distribución | FAIL | R02 declaración estática corregida con aprobación; validar archivo, tráfico y seguridad nativa completos |
| Pruebas JS / TypeScript / runtime28 | PASS | 130 Node, tsc y hashes repetidos;8 Release y4 contratos estáticos separados |
| Web/native-web | PASS anterior | Compilados en fases anteriores; repetir al cerrar cambios de app |
| Release arm64 sin firma / Swift | PASS por SHA | CI anterior y gate662e67d en curso; no equivale a distribución |
| Álbum iOS | Corrección comprobada en experimento | 42513277098: preferenciafalse FAIL, true XCTest completo PASS201,847s +postcondición; confirmado sin observer42514969280; pinch/anclajePASS |
| 10 ciclos nativos y métricas | PASS acotado | 59912d8: iOS42492831273 yAndroid42492831172; presupuestos agregados/porPID PASS. Solo biblioteca pequeña de fixtures |
| Live Photo real | NOT TESTED en candidato | Movimiento real probado; RGBA anterior FAIL. Superficie de vídeo pausado corregida; repetir nativo |
| Cierre forzado y decisiones | FAIL | R61 Android. No prometer recuperación segura todavía |
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

Primero cerrar el gate nativo de R61 con pruebas de transacción abortada/errores/cierre forzado;
terminar gate iOS estándar yDuo, LivePhoto yfixtures destructivas. Después cerrar
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
- [Relevo visual de Claude](../ai-handoff/PROMPT_CLAUDE_2026-11-08.md): aceptar el aspecto
  con evidencia nativa y generar después IPA/APK del código validado.

Ya están aprobados mantener la monetización, los dos hosts de tracking y el diario
R-61. No necesitan otra decisión. Credenciales únicamente en Keychain/Secrets o en
la interfaz segura de cada servicio; nunca por chat. Cada publicación web y cada
subida a tienda requieren autorización aparte. QA destructiva solo con fixtures.


Serie662e67d: diez ciclos funcionales PASS314s ypostauditPhotoKit10ausentes/unknown0.
El presupuesto de esa serie esBLOCKED por contadorCPU dePIDreciénnacido en ronda7;
no hereda el PASS de59912d8. Colector corregido pendiente de ejecución.
