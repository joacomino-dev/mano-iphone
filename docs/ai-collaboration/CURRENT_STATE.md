# CocoWash — estado vigente

Actualizado: 2026-11-04, America/Bogota. Codex trabaja solo por indicación del usuario.

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
- No hay autorización para nuevas funcionalidades o refactorizaciones fuera del alcance entregado.

## Continuidad y recuperación

Checkout de trabajo actualizado en rama `main`: `C:/Users/Joaco/Developer/CocoWash-stage1`. El checkout anterior
en OneDrive, HEAD 76744e2 y sus cambios previos permanecen intactos. Respaldo de
1.457 archivos/.git verificado en `C:/Users/Joaco/CocoWash-Backups/20261104-stage1-current`;
366 fuentes originales revalidadas tras la implementación.

Leer [PROTOCOL](PROTOCOL.md) y [CODEX_LOG](CODEX_LOG.md) antes de intervenir.
La bitácora de Claude se conserva en [CLAUDE_LOG](CLAUDE_LOG.md). Los mapas de octubre
son históricos: contrastar con código y esta entrega. El estado anterior y handoffs
históricos se conservan íntegros en [Git, snapshot 842ab93](https://github.com/joacomino-dev/mano-iphone/blob/842ab93a07e017bb47a04daea9d43d7b3056b63e/docs/ai-collaboration/CURRENT_STATE.md).

## Monetización iOS — en rama separada

CW-CX-018-monetization, rama codex/cocowash-monetization-ios desde a3dba60. La [compilación iOS Release arm64](https://github.com/joacomino-dev/mano-iphone/actions/runs/42099862512) pasó en 1209cec. Pendiente prueba física e integración. Personas sigue en su propia rama.

- Compras en Ajustes. Para probar localmente, seleccionar mano/ios/App/CocoWash.storekit en Run > Options > StoreKit Configuration del esquema App. En sandbox se usan los tres productos de App Store Connect con los IDs del archivo y precios localizados.
- Publicidad Debug usa una unidad de demostración. Para validar específicamente vídeo, indicar ca-app-pub-3940256099942544/2521693316 como COCO_ADMOB_NATIVE_UNIT_ID en Debug. Probar dos arrastres horizontales en el asa, Saltar con VoiceOver, toque deliberado, reanudación y Terminar con descartes.
- Release requiere COCO_ADMOB_APP_ID y COCO_ADMOB_NATIVE_UNIT_ID de producción. Configurar mensajes regionales e IDFA en AdMob, validar AdChoices y revisar privacidad y clasificación antes de envío.
- Probar compra, cancelación, restauración y vencimiento con biblioteca de prueba. La publicidad del resumen aparece fuera de la revisión y de la confirmación de Fotos.
