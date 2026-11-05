# CocoWash — estado vigente

Actualizado: 2026-11-04, America/Bogota. Codex trabaja solo por indicación del usuario.

## Corrección en curso: 9.7.2.1 / build 21 (no publicar)

Codex único escritor en `cocowash/9.7.2.1` desde 0f0b8ac. Usuario reporta fallo
al iniciar Personas y cerrar/reabrir. Autoriza borrar datos derivados de CocoWash
al estrenar cada build de desarrollo; nunca Fotos. Reserva: lifecycle nativo,
arranque/reset, errores del hook, pruebas y workflow. Backup pre-9721 verificado.
No atribuir causa del crash sin informe del dispositivo.

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

**Completada en rama para prueba física**, fuente `01f150b`.
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

Checkout de trabajo ahora en rama `cocowash/9.7.2`, con `main` estable preservada: `C:/Users/Joaco/Developer/CocoWash-stage1`. El checkout anterior
en OneDrive, HEAD 76744e2 y sus cambios previos permanecen intactos. Respaldo de
1.457 archivos/.git verificado en `C:/Users/Joaco/CocoWash-Backups/20261104-stage1-current`;
366 fuentes originales revalidadas tras la implementación.

Leer [PROTOCOL](PROTOCOL.md) y [CODEX_LOG](CODEX_LOG.md) antes de intervenir.
La bitácora de Claude se conserva en [CLAUDE_LOG](CLAUDE_LOG.md). Los mapas de octubre
son históricos: contrastar con código y esta entrega. El estado anterior y handoffs
históricos se conservan íntegros en [Git, snapshot 842ab93](https://github.com/joacomino-dev/mano-iphone/blob/842ab93a07e017bb47a04daea9d43d7b3056b63e/docs/ai-collaboration/CURRENT_STATE.md).
