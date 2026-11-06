# CocoWash — estado vigente

Actualizado: 2026-11-05, America/Bogota. Codex trabaja solo por indicación del usuario.

## Desarrollo para pruebas: 9.8.5 / build 32 (Claude)

CW-CL-042. 9.8.4 + Ajustes y Filtros rediseñados: menos texto, bloques agrupados, un solo
ritmo de espaciado. Rama `claude/cocowash-9.8.5`. CI e IPA en esta entrada al terminar.
Sin merge ni Release.

## Desarrollo para pruebas: 9.8.4 / build 31 (Claude)

CW-CL-041. Estampas al deslizar con la palabra debajo, barra de decisión restaurada,
nieve corregida, intro 3 bloqueada hasta ver el zoom, anuncios precargados.
Rama `claude/cocowash-9.8.4`. CI e IPA en esta entrada al terminar. Sin merge ni Release.

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
