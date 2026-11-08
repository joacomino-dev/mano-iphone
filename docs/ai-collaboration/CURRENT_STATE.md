# CocoWash — estado vigente

Actualizado: 2026-11-08, America/Bogota. Codex trabaja solo por indicación del usuario.

## Codex CW-CX-026 — misión estratégica en curso

2026-11-08. Usuario autoriza push normal main y CI estándar pública gratuita; no tiendas/web/cuentas/certificados/AdMob ni secretos por chat. Base df983ad limpia ya enviada a main. Reserva de pruebas/gates nativos iOS/Android, privacidad con evidencia (cambio manifest requiere aprobación de dominios), firma dry-run y materiales7 idiomas. Sin modelos nuevos/arte/monetización/min17/hash28.
Estado046: main61fff7d consolidado; solo Codex escritor. R61P0 persiste:42513754519 demuestra pérdida en disco antes deReact; diario duradero solicitado, sin autorización recibida todavía. R01 corregido yPASS real sin observer42514969280 (álbum exacto/PhotoKit/avance/metadata/pinch/anclaje). R07 fallo de selector demostrado porAX:66x29 Switch, noButton; modoLive5d20e6a enejecución. Tenrondas662e67dPASS314s+postauditPhotoKit10ausentes/unknown0; métricasBLOCKEDCPU deWebContent nacido en ronda7, colector acotado corregido/25testsPASS. Android28capturas7idiomasPASS42516038859, RGB24/hash; revisión visual parcial. Firmas proveedor GMA/UMP42516183457PASS con identidadGoogle/AppleRoot; no archivoCocoWashfirmado. Usuario aprueba2dominios:423e79eincorporados,5tests/strictdeclaraciónPASS; ATTnuevo42516799297 enejecución. R62nullbilling corregido, Kotlin/E2E5d20e6a pendientes. iOS7capturas813114c encurso. DocumentosRC/checklist se actualizan para sustituir estadohistórico; sin publicación/web/cuentas/arte/min17/versiones.

## Codex CW-CX-021–025 — entrega local cerrada, puertas nativas abiertas

Actualizado2026-11-08. Fuente canónica única main en C:/Users/Joaco/Developer/CocoWash-android.
Inicio f5c3546; código final ece507b. Checkpoints cd717f9 (R-00),1bc2561 (R-07),
67dd04d (R-01/R-03 diagnóstico),ece507b (R-04). Sin push/CI nueva/IPA nueva.
130 Node+14 configuración+4 Python+69 navegador PASS;TS/hash28/builds/sync Windows PASS.
R-00:11→1 búsquedas/10 ciclos sintéticos, físico P0 sigue abierto. R-07 implementado,
puente Swift/Live real sin compilar. R-01 yR-02 FAIL. R-03 listo para verificar simctl.
R-04 corregido localmente, diálogo Android real pendiente. iOS17/versiones/arte/monetización intactos.
Sin otros escritores detectados. Reserva terminada; Claude puede integrar/cargar/verificar,
con el [relevo completo](../ai-handoff/PROMPT_CLAUDE_2026-11-08.md).
No usar CocoWash-b24/OneDrive/stage1 como fuente. [Entrega/pruebas/bloqueos](../apple-readiness/FOLLOWUP_2026-11-08.md).

## Rama única `main` (Claude, CW-CL-060) — vigente

**Qué falta y avance: [docs/ROADMAP.md](../ROADMAP.md)** (único, compartido). **Prioridad: R-00 (P0, el iPhone se vuelve lento tras varios ciclos de borrar y terminar) y R-07 (Live Photo)**, reportados por el usuario. Ciclo: leer la última
entrada del otro agente + este estado + el roadmap antes de cada tarea; actualizar el roadmap al cerrar.

Por decisión del usuario, GitHub tiene **una sola rama: `main`**, con la integración RC iOS + Android
(CW-CL-059) más los arreglos de CI. Las demás 20 ramas se borraron del remoto tras guardarlas en
`work/backup/mano-iphone-all-branches-2026-11-07.bundle` (24 refs, sha256 `b547931d…5303`, local).
`main` es el canal de **tienda**: `DEVELOPER=false` e IDs AdMob iOS comerciales en Release
(`verify-release.yml`, antes en la rama `release`). La IPA de desarrollo la genera
`build-people-dev.yml` cambiando solo su copia de CI a canal developer (ID de muestra, anuncios de
prueba); no se confirma nada de vuelta. Android: `build-android.yml` en `main`.
Gate nativo RC (manual, `rc-native-gate.yml`), run 42438304068: compilación Release arm64 sin firma
PASS (Xcode 27.1), oráculos Swift PASS, acceso completo real a Fotos y sesión en simulador PASS;
smoke **FAIL** al crear álbum («Crear y añadir» no cierra la hoja en el simulador iPhone Duo), sin
cambios de la RC en ese flujo → para Codex. Sigue FAIL el gate de privacidad `--submission` (P1 dominios).
CI en `main` `376855d`: tienda iOS 42442110715, desarrollo iOS 42442110733 (arranque en simulador) y
Android 42442110729 PASS. IPA `C:/Users/Joaco/Downloads/CocoWash-0.9.9.1-build43-376855d.ipa`, sha256
`6e80ecaf…66d8` (sin firma, anuncios de prueba). Prompt de relevo:
[PROMPT_CODEX_2026-11-07](../ai-handoff/PROMPT_CODEX_2026-11-07.md).

## Integración RC iOS + Android — `claude/rc-android-integration` `bc6db8c` (Claude, CW-CL-059)

Local, sin push. `main`/`android` (`a4f765d`, Android build 3) + RC Codex `8fdd2bf` (cadena completa
desde `691cded`), merge sin pérdida en ninguno de los dos lados. Canal de **tienda** (como la RC):
`DEVELOPER=false`, IDs AdMob iOS comerciales en Release; no fusionar tal cual en `main` (su CI de
desarrollo exige el canal developer). Versiones: 0.9.9 (43) iOS, visible 0.9.9.1, Android versionCode 3.
PASS: 124 Node, 6 Release, 4 contratos, tsc, runtime 28, builds, Sites 4, 52 casos de navegador.
FAIL: privacidad `--submission` (P1 dominios). BLOCKED: Swift/PhotoKit/hardware, APK/AAB de esta base,
firma/TestFlight, publicación de las políticas (la web sigue con la versión anterior).
Versión web cargada y verificada; compilación/instalación nativa iOS pendiente.

## Android en `main`: 0.9.9.1, build Android 3 (Claude)

CW-CL-054 a CW-CL-057. El usuario aprobó fusionar la rama `android` en `main` (fast-forward,
2026-11-07). `main` lleva ahora el proyecto `mano/android` (Capacitor 8.6.0, minSdk 30,
targetSdk 36, `work.joaquin.mano`), los plugins Kotlin (`PhotoLibrary`, `CocoMonetization`),
textos de Android en 7 idiomas y la vista previa con «Pixel 10» en modo Android. iOS se
verificó antes de fusionar (CI de desarrollo sobre `android`: IPA y arranque correctos).
CI de Android: `build-android.yml` en `main` y `android` (APK de desarrollo, AAB, 16 KB,
emulador con E2E). `release` no se tocó: sigue siendo solo iOS hasta que haya IDs reales de
AdMob Android. Hoja de ruta, auditoría y ruta a Play en
[ROADMAP_PLAYSTORE](../ai-handoff/ROADMAP_PLAYSTORE.md); documentos de la tienda en
`docs/playstore/`. APK `C:/Users/Joaco/Downloads/CocoWash-0.9.9.1-android-build3-11e2830.apk`.

## Cierre RC — 2026-11-07 (CW-CX-020, completada local; envío bloqueado)

Codex por petición del usuario sobre b0cf83d, limpio al iniciar; todos los gates
locales anteriores repetidos PASS. Reserva: seguridad asíncrona en ManoApp,
catálogo de Apoyo, localización/mensajes nativos, manifiesto/documentos de
privacidad y herramientas/metadatos de distribución. El usuario confirma
Joaquin Miño, Quito (Ecuador), cocowash@joaquinmino.work y mantener monetización.
Sin arte, nuevas funciones/Personas, dependencias mayores, push, cuentas o envío.

Correcciones locales645564f/9824907/cb927ad/55c6951; gates880a9a0/ca668b7.
120 Node +6 Release +4 contratos estáticos +Sites4 +52 casos navegador/runtime,
TS/builds/sync Windows y runtime28 PASS. Arte/CSS/personajes/icono intactos.
**FAIL P1:** tracking=true sin dominios; gate estricto bloquea archivo. Nativo,
hardware/Duo, privacidad agregada/tráfico, comercio, firma y distribución BLOCKED.
[Entrega RC](../apple-readiness/RELEASE_CANDIDATE.md) y
[checklist](../apple-readiness/APP_STORE_SUBMISSION_CHECKLIST.md). Preservar todos
los commits al integrar; la rama release remota antigua no incluye esta RC.

## Fase 2 Apple — 2026-11-07 (CW-CX-019)

Checkpoint autorizado: `9ff2734`, después de repetir todos los gates de Fase1.
Correcciones verificadas en `b463bd2` y `13dae6f`: refresco manual obsoleto,
Recuperar durante borrado pendiente y revocación fuera de orden. Resultado local:
119 Node +19 regresiones +9 seguridad +8 runtime Edge +4 contratos estáticos +Sites4;
runtime28, TypeScript y builds PASS. El test de esquina se corrigió con hit-test,
sin modificar runtime/arte. Perfil sintético1k/10k/50k medido, no extrapolado a iOS.

[Informe/evidencia Fase2](../apple-readiness/PHASE2.md) y
[protocolo TestFlight](../apple-readiness/TESTFLIGHT.md). Gate macOS preparado;
en Windows devuelve78 (sin Xcode/Swift). Pendientes: compilar/ejecutar este diff
nativamente, PhotoKit destructivo con fixtures, mínimo17/26/27.1 y Duo, recursos/
accesibilidad físicos, privacidad agregada, firma/cuenta/ASC. Sin push/distribución,
cambios de identidad, monetización o Personas. No declarar lista para publicar.

## Prioridad Apple / App Store — 2026-11-07 (CW-CX-018)

Por petición directa del usuario, Codex auditó build 43 sobre
`691cded44bbb39bc4c8fa1ddfd1889a69e2b62a9`, mismo `main` remoto comprobado.
Checkout efectivo: `C:/Users/Joaco/Developer/CocoWash-b24`, limpio al empezar;
OneDrive antigua/divergente se conserva sin tocar. **Completada local**, sin
commit/push/integración ni nueva CI. Esta es la referencia actual; los apartados
siguientes conservan snapshots históricos anteriores al build 43.

[Entrega y evidencia](../apple-readiness/README.md): auditoría, matriz, problemas,
App Review, UI y plan de pruebas. Correcciones pequeñas en ManoApp (recarga de
permisos, revocación durante enumeración, cierre de superficies y generaciones
de consultas alrededor del borrado) y CSS (insets laterales del shell/hojas).
Contratos de decisión/borrado/recuperación, Swift, identidad y dependencias intactos.
119 Node + 19 escenarios Edge/puente ficticio + 4 Sites; runtime28, tsc y builds PASS.
247 fuentes/config comparadas: solo esos dos archivos existentes cambiaron.

**Pendiente:** revisión/integración del diff, gate macOS de esta entrega,
PhotoKit destructivo con fixtures, mínimo iOS17/26/27.1 y Duo en simulador/físico,
rendimiento/accesibilidad y archive firmado/ASC. No declarar lista para publicar.


## Principal: 0.9.9.1 (build 35) en `main` (Claude)

CW-CL-045. El usuario aprobó la serie 9.8.x y pidió dejarla como principal con el nombre
0.9.9.1 (el bundle dice 0.9.9 porque Apple admite tres números; el arranque muestra
«0.9.9.1 (35)»). `main` avanza en GitHub por fast-forward hasta esta versión; la copia de
OneDrive (con `main` y cambios ajenos sin confirmar) no se tocó: actualizarla con
`git pull` cuando esos cambios estén a salvo. La CI de `main` es ahora
`build-people-dev.yml`; `build-ios.yml` (AltStore antiguo) solo se lanza a mano.
Borradores para la tienda en `docs/appstore/` (ficha en 7 idiomas, política de privacidad,
notas para el revisor). IPA `C:/Users/Joaco/Downloads/CocoWash-0.9.9.1-build35-c967dc6.ipa`,
[CI 42242603847](https://github.com/joacomino-dev/mano-iphone/actions/runs/42242603847) success desde `main`.

## Siguiente: lanzamiento 1.0

El usuario aprobó 9.8.6 (34) y pide ir a la App Store. Hoja de ruta con responsables y
orden en [ROADMAP_APPSTORE](../ai-handoff/ROADMAP_APPSTORE.md). Pendiente del usuario: icono
del basurero y otra imagen; cuentas (Apple, App Store Connect, AdMob) y web de privacidad.

## Desarrollo para pruebas: 9.8.6 / build 34 (Claude)

CW-CL-044. Build 33 + alemán e italiano, Apoyo sin la palabra «pase», «Restablecer»
discreto en Filtros. Rama `claude/cocowash-9.8.6`, IPA
`C:/Users/Joaco/Downloads/CocoWash-9.8.6-build34-df2d394.ipa`,
[CI 42226489056](https://github.com/joacomino-dev/mano-iphone/actions/runs/42226489056) success; siete idiomas en el paquete. Sin merge ni Release.

## Desarrollo para pruebas: 9.8.6 / build 33 (Claude)

CW-CL-043. Controles de carta unificados, sin lupa de iOS, resumen sin desplazamiento con
Coqui y Memo, «Una última mirada» con las fotos primero y la carta fija encima.
Rama `claude/cocowash-9.8.6`, IPA
`C:/Users/Joaco/Downloads/CocoWash-9.8.6-build33-b1bf6a2.ipa`,
[CI 42222690694](https://github.com/joacomino-dev/mano-iphone/actions/runs/42222690694) success. Sin merge ni Release.

## Desarrollo para pruebas: 9.8.5 / build 32 (Claude)

CW-CL-042. 9.8.4 + Ajustes y Filtros rediseñados: menos texto, bloques agrupados, un solo
ritmo de espaciado. Rama `claude/cocowash-9.8.5`, IPA
`C:/Users/Joaco/Downloads/CocoWash-9.8.5-build32-3cdb985.ipa`,
[CI 42219379233](https://github.com/joacomino-dev/mano-iphone/actions/runs/42219379233) success
(9.8.4: [CI 42218631188](https://github.com/joacomino-dev/mano-iphone/actions/runs/42218631188), `CocoWash-9.8.4-build31-3bf4890.ipa`). Sin merge ni Release.

## Desarrollo para pruebas: 9.8.4 / build 31 (Claude)

CW-CL-041. Estampas al deslizar con la palabra debajo, barra de decisión restaurada,
nieve corregida, intro 3 bloqueada hasta ver el zoom, anuncios precargados.
Rama `claude/cocowash-9.8.4`, CI 42218631188 success. Sin merge ni Release.

## Desarrollo para pruebas: 9.8.3 / build 30 (Claude)

CW-CL-040. Revisión con skills + basurero nuevo, barra con icono grande y verbo debajo,
cartas fijas siempre en revisión y resumen, resumen que guía a vaciar «Eliminado
recientemente», postales redibujadas. Rama `claude/cocowash-9.8.3`, IPA
`C:/Users/Joaco/Downloads/CocoWash-9.8.3-build30-9a74a3e.ipa`,
[CI 42166446918](https://github.com/joacomino-dev/mano-iphone/actions/runs/42166446918) success. Sin merge ni Release.

## Desarrollo para pruebas: 9.8.2 / build 29 (Claude)

CW-CL-039. Resumen fijo con «Vaciar en Fotos», pie fijo en «Una última mirada», cargador
fluido, barra sin flechas, cancelar en Fotos sin error, Apoyo dorado. Rama
`claude/cocowash-9.8.2`, IPA `C:/Users/Joaco/Downloads/CocoWash-9.8.2-build29-d41de6b.ipa`,
[CI 42159044992](https://github.com/joacomino-dev/mano-iphone/actions/runs/42159044992) success.
Siguiente: revisión con skills 9.8.3 ([plan](../ai-handoff/PLAN_983_SKILLS.md)). Sin merge ni Release.

## Desarrollo para pruebas: 9.8.1 / build 28 (Claude)

CW-CL-038. Anuncios fijos en resumen y «Una última mirada» (sin validador), cada
20–30 fotos, modo de prueba infinito, cinco idiomas (es, en, fr, ar, ja), rejillas
en Ajustes/Filtros, sellos de Apoyo, corazón rosa Wash, iCloud anticipado, intro de
zoom y foto anclada más limpia. Rama `claude/cocowash-9.8.1`.
[Informe](../ai-handoff/COCOWASH_981.md). IPA `C:/Users/Joaco/Downloads/CocoWash-9.8.1-build28-49f416b.ipa`,
[CI 42153652260](https://github.com/joacomino-dev/mano-iphone/actions/runs/42153652260) success. Sin merge ni Release.

## Desarrollo para pruebas: 9.8 / build 27 (Claude)

CW-CL-037. Decisión del usuario: Personas y Breakup Mode salen por completo; los datos
faciales antiguos se borran al arrancar. Modo de prueba con anuncios frecuentes,
pestaña Apoyo, anuncios como cartas solo deslizables, Compartir arriba a la derecha,
resumen sin Filtros, orden inicial al azar, Zángano +30 %, pasada antigenéricos.
Rama `claude/cocowash-9.8`, IPA `C:/Users/Joaco/Downloads/CocoWash-9.8-build27-50467a8.ipa`,
[CI 42134090699](https://github.com/joacomino-dev/mano-iphone/actions/runs/42134090699) success. [Informe](../ai-handoff/COCOWASH_98.md). Sin merge ni Release.

## Desarrollo para pruebas: 9.7.2.6 / build 26 (Claude)

CW-CL-036. Build 25 + monetización de `codex/cocowash-monetization-ios` (anuncios nativos,
pases y café; anuncios de prueba de Google en el IPA de desarrollo) + revisión visual
aprobada (Personas, mosaicos, censura cubierta, sello V, compras). Pendiente en iPhone:
gesto del anuncio, consentimiento y compras. Sin merge ni Release.
IPA `C:/Users/Joaco/Downloads/CocoWash-9.7.2.6-build26-23380e3.ipa`, [CI 42105597788](https://github.com/joacomino-dev/mano-iphone/actions/runs/42105597788) success.

## Corrección para pruebas: 9.7.2.5 / build 25 (Claude)

CW-CL-035. Causa del cierre **confirmada** con la traza de build 24 en iPhone:
trap de exclusividad de Swift en `stamp()` al empezar la reconciliación (no memoria).
Corregido en `5917cb4`. Personas arranca sola sin consentimiento previo (decisión
del usuario). Sin reset: conserva el índice de build 24. Prueba física pendiente.
[Detalle](../ai-handoff/COCOWASH_9724.md#actualización-causa-confirmada-y-build-25-9725).

## Candidato de diagnóstico: 9.7.2.4 / build 24 (Claude)

CW-CL-034, Claude → usuario. Rama `claude/people-crash-b24` desde `6346fa3`, worktree
`C:/Users/Joaco/Developer/CocoWash-b24` (no toca `CocoWash-stage1`). Usuario reportó
cierre en build 23 hacia ~1.000 fotos y cierres repetidos; **causa sin confirmar**.
Build 24 añade traza local por fase con memoria, MetricKit local, «Compartir
diagnóstico», pausa tras cierre en cualquier fase, pausa de seguridad tras dos
cierres, foto apartada tras dos cierres, freno por memoria y reconciliación
sin identidades de una sola foto. IPA **sin reset** para conservar el índice que
falló. Validación física pendiente. Propuestas visuales P1–P8 esperan revisión.
Fuente del IPA `3cd4fae`, [CI 42095345318](https://github.com/joacomino-dev/mano-iphone/actions/runs/42095345318)
success. IPA `C:/Users/Joaco/Downloads/CocoWash-9.7.2.4-build24-3cd4fae.ipa`.
[Informe y recorrido](../ai-handoff/COCOWASH_9724.md). Sin merge ni Release.

## Desarrollo para pruebas: 9.7.2.3 / build 23

CW-HO-010, Codex → usuario. Rama `codex/cocowash-people-recovery` desde `a477ac0`.
Fuente del IPA `67a69e0`. Corregida y reproducida en Edge la pérdida de respuesta
al cambiar la pausa multimedia durante una tanda. Hay trazas de fase sin datos
identificativos. Avance en segundo plano y causa del cierre físico siguen abiertos.
Incluye progreso, autoplay/sonido/pausa, VHS, Compartir, sello V y selección de pila.
Swift, Release iPhone y smoke de reset/reapertura en simulador pasaron.
IPA sin firma en Descargas y recorrido físico pendiente en el
[informe del build 23](../ai-handoff/COCOWASH_9723.md).

## Corrección para pruebas: 9.7.2.1 / build 21 (no publicar)

Codex único escritor en `cocowash/9.7.2.1` desde 0f0b8ac. Usuario reporta fallo
al iniciar Personas y cerrar/reabrir. Autoriza borrar datos derivados de CocoWash
al estrenar cada build de desarrollo; nunca Fotos. Reserva: lifecycle nativo,
arranque/reset, errores del hook, pruebas y workflow. Backup pre-9721 verificado.
No atribuir causa del crash sin informe del dispositivo.

**Correcciones implementadas**, fuente7487cbe; [CI41956222043](https://github.com/joacomino-dev/mano-iphone/actions/runs/41956222043)
**success**. 113 Node/runtime28/TypeScript/builds/Sites4, regresiones Edge de error/
reset/cancelación/reapertura, Swift y Release iPhone PASS. Smoke nativo de arranque,
reset de índice sintético y reapertura del mismo build conservando nuevo progreso PASS.
Capturas de simulador revisadas; permiso Fotos visible, no concedido en la prueba.
No es prueba de reconocimiento ni del crash en iPhone; confirmación física pendiente.
IPA verificado: `C:/Users/Joaco/Downloads/CocoWash-9.7.2.1-correccion-7487cbe4.ipa`,
5.797.140 bytes; SHA256 `d8a42b427438fba18a1cd66d9c4b90fbe371ae3f7b46277f7ce3fded05d8a3d6`.
CFBundleShortVersionString9.7.2, build21; nombre de entrega9.7.2.1. Reset activado
solo por flag explícito de IPA de desarrollo, una vez por versión/build; nuevo
arranque del mismo build conserva datos. Fotos/álbumes/favoritos del sistema intactos.
[Informe y checklist dirigida](../ai-handoff/COCOWASH_9721.md). CW-HO-009 lista
para usuario; Claude recibe refinamiento después de comprobar esta corrección.
Sin instalación física, Release, merge ni modificación de las ramas anteriores.

## Desarrollo autorizado: 9.7.2 / build 20 (no publicar)

Codex único escritor; rama `cocowash/9.7.2` desde **última entrega** d6d6f21,
no una revisión anterior de 9.7.1. Usuario confirma reconocimiento y correcciones
9.7.1 en iPhone; fragmentación y geometría motivan esta actualización.
Cambios locales previos: 24 archivos CRLF protegidos, sin diff de contenido;
respaldo de bytes + bundle Git verificados en
`C:/Users/Joaco/CocoWash-Backups/20261105T003938Z-pre-972`.
Alcance reservado: motor/identidades/publicación/migración/miniaturas/máscaras,
Personas en submenú y ajustes funcionales. Claude recibe refinamiento visual después.
Sin merge a main, Release ni App Store. Se conserva el IPA estable anterior.

**Entregada para pruebas, con regresión física reportada posteriormente** (fallo
al iniciar Personas/cerrar app); no aceptada. Corrección9.7.2.1 arriba. Fuente `01f150b`.
[CI final 41949432356](https://github.com/joacomino-dev/mano-iphone/actions/runs/41949432356)
success: Swift/API pública/Release iPhone; 113 Node, runtime28, TypeScript, builds,
Sites4 y regresiones Edge PASS. Identidades lógicas/alias, reconciliación conservadora,
publicación finita/estable, mínimo5, screenshots,4 recortes y censura refinada.
IPA verificado: `C:/Users/Joaco/Downloads/CocoWash-9.7.2-desarrollo-01f150b8.ipa`,
5.782.219 bytes, SHA256 `2500ced0224112b4277a550c56ea22f8d2c9868f3dc6e2f7f84fa087416bd086`.
[Detalle, límites y checklist](../ai-handoff/COCOWASH_972.md).
CW-HO-008 lista: usuario prueba → Claude refina UI; precisión/censura/RAM/FPS
físicos pendientes, sin dataset etiquetado ni aprobación de publicación.
Fuentes compiladas idénticas tras cierre documental; no resetear índice para probar.

## Desarrollo autorizado: 9.7.1 / build 19 (sin publicar)

Codex es el único escritor en `C:/Users/Joaco/Developer/CocoWash-stage1`, rama
`cocowash/9.7.1`, base estable exacta `a3dba60051b4705cd403cae2f9ee6988aede7ea1`.
Alcance del documento del usuario: Personas local/incremental, Breakup Mode,
Terminar, logo, nube y undo 30. Usuario confirma iOS 27. API oficial elegida:
Media Intelligence / FaceGroupAnalyzer, iOS 27+, gate de inicialización real.
Se conservan iOS 17+ para el resto y todos los contratos de PhotoKit.
Detalle/QA: [COCOWASH_971](../ai-handoff/COCOWASH_971.md).
111 pruebas Node, runtime28, TypeScript, web/native-web, Sites4 y regresiones
Edge PASS. [CI final 41936437603](https://github.com/joacomino-dev/mano-iphone/actions/runs/41936437603)
success para `268224a`: API pública, oráculos Swift, SQLite 50.000 metadatos,
sync y Release iPhone. IPA de desarrollo verificado en Descargas:
`CocoWash-9.7.1-desarrollo-268224a9.ipa` (5.665.113 bytes), SHA256
`729dfa41479f9757540c9412c026ba5a3b812db4a9e3e9f45d768eca56e32b7a`.
Mach-O arm64 enlaza Media Intelligence **débilmente**, mínimo iOS17; fotos, textura,
versión/build, CRC y digest de GitHub verificados. Sin instalación ni publicación de app.
CW-HO-007: Codex → usuario, **aceptada físicamente según reporte del usuario** al
solicitar 9.7.2; no integrada en main. La siguiente lista era pendiente al entregarse:
Precisión, censura con fotos reales y memoria/calor físicos pendientes; no son métricas
acreditadas por fixtures ni por la prueba de metadatos.
No modificar main, publicar app ni distribuir una entrega definitiva.
Los cambios aparentes del runtime son el estado CRLF previo; no tocarlos.

## Versión aprobada: 0.9.7 / build 18

El usuario confirma pruebas en iPhone y una experiencia fluida; autoriza que esta
sea la versión actual del repositorio. **Aceptación física recibida.** No equivale
a mediciones de FPS/RAM ni a resolver la incidencia de XCTest.

**Integrada en main** mediante [PR #3](https://github.com/joacomino-dev/mano-iphone/pull/3),
merge `a536c8b9617adf418b897bb4ecf90ff76783d09b`, origen `df00d52`.
Se conservan los commits por etapa y la rama de desarrollo. Las fuentes de app
coinciden con `ed47909`, el IPA probado (también fce0deb). Estado y README se
actualizan después con un commit solo documental. Cierre: [CW-CX-013](CODEX_LOG.md).

## Implementación y evidencia

- Etapas 1–7 implementadas; [detalle y límites](../ai-handoff/OPTIMIZATION_097.md).
- 106 pruebas Node, runtime28, TypeScript, builds, Sites4 y QA demo PASS.
- Oráculo Swift exacto y Release para iPhone: [CI 41899040312](https://github.com/joacomino-dev/mano-iphone/actions/runs/41899040312), success.
- IPA aceptado: `C:/Users/Joaco/Downloads/CocoWash-0.9.7-completa-ed47909f.ipa`, 5.553.746 bytes.
- SHA256: `1db4dc6a25c79aedc05573c0fb740b557f5f8485dbc6493f4df304d2b7e4d68c`.
- CW-HO-006: Codex → usuario, **aceptada**; 0.9.7 es la nueva base funcional.

## Incidencias y límites conservados

- [Smoke 41893615114](https://github.com/joacomino-dev/mano-iphone/actions/runs/41893615114): failure por timeout de snapshot de accesibilidad de SpringBoard tras permiso Fotos. No errores JS registrados; causa raíz no acreditada. Mantener separado de la aceptación física y del CI de paquete.
- Vision conserva peor caso cuadrático; buckets temporales acotados y prioridad multimedia mejorados. Instrumentar antes de sustituir agrupación.
- La actualización 9.7.1 está autorizada en su rama; no integrar ni publicar sin nueva autorización.

## Continuidad y recuperación

Checkout de trabajo ahora en rama `codex/cocowash-people-recovery`, con `main` estable preservada: `C:/Users/Joaco/Developer/CocoWash-stage1`. El checkout anterior
en OneDrive, HEAD 76744e2 y sus cambios previos permanecen intactos. Respaldo de
1.457 archivos/.git verificado en `C:/Users/Joaco/CocoWash-Backups/20261104-stage1-current`;
366 fuentes originales revalidadas tras la implementación.

Leer [PROTOCOL](PROTOCOL.md) y [CODEX_LOG](CODEX_LOG.md) antes de intervenir.
La bitácora de Claude se conserva en [CLAUDE_LOG](CLAUDE_LOG.md). Los mapas de octubre
son históricos: contrastar con código y esta entrega. El estado anterior y handoffs
históricos se conservan íntegros en [Git, snapshot 842ab93](https://github.com/joacomino-dev/mano-iphone/blob/842ab93a07e017bb47a04daea9d43d7b3056b63e/docs/ai-collaboration/CURRENT_STATE.md).
