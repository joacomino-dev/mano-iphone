# CocoWash 0.9.7 / 18 — etapas 2–7

**IPA disponible:** `C:/Users/Joaco/Downloads/CocoWash-0.9.7-completa-ed47909f.ipa`,
5.553.746 bytes, recibo JSON adyacente. [Compilación de dispositivo 41899040312](https://github.com/joacomino-dev/mano-iphone/actions/runs/41899040312)
verde sobre ed47909fdcd343f4a0c6e5a592894ef7f89d71de (fuentes de app idénticas a fce0deb).
Tests/runtime, oráculo Swift y Release iPhone PASS. CRC, versión 0.9.7/18,
bundle original, textura, marcador Swift nuevo y binario arm64 verificados.
SHA256 IPA: `1db4dc6a25c79aedc05573c0fb740b557f5f8485dbc6493f4df304d2b7e4d68c`.
No se reutilizó binario anterior; firma personal mediante AltStore.
**Smoke UI 41893615114 falló por timeout de XCTest al pedir el snapshot de
accesibilidad de SpringBoard tras solicitar permiso de Fotos.** Excedió 840 s
del test y el comando 1.320 s; no hubo errores JS registrados. La captura posterior
muestra SpringBoard y el log retrasa PhotosTCCNotificationExtension hasta el cierre.
Probable problema del entorno de automatización; no se declara causa raíz resuelta
ni validación funcional nativa completa. Aceptación física pendiente. El verde
del job de paquete acredita sus pasos, no esas validaciones. La comparación UI
demo adicional confirma que calidad/iCloud no cambian mano ni orden al recargar
(`policy-qa.mjs/json` en evidencia).

2026-11-04. Usuario aceptó etapa 1 y autorizó las restantes juntas, en
`codex/stage1-review`. Main y el checkout anterior siguen intactos.

| Etapa | Cambio | Evidencia/pruebas |
|---|---|---|
| 2 | Cola compartida de dos miniaturas; deduplicación por ID/edición/tamaño/red/presupuesto, cancelación por propietario y prioridad de tarjeta/zoom. Prewarm usa el coordinador cloud. Presupuesto en todas las rutas, invalidación y reintento de archivos expulsados. | requests.test y media.test; pruebas de cancelación, referencias y presupuesto |
| 3 | Una escritura autoritativa durante interacción, validación por identidad del registro inmutable; espejo legacy en checkpoints. Una escritura fallida conserva dirty para reintentar. | session.test: cuota, recuperación, legado y 50.000 marcas |
| 4 | Índices JS vinculados a edición, tipo y dimensiones; purga de eliminados y rechazo de respuestas antiguas. Clasificación espera la medición de la generación vigente. | index-state.test: edición, eliminación, reordenación y resultados obsoletos |
| 5 | Cambiar calidad/iCloud revalida recursos sin repartir otra mano ni vaciar el póster visible. Vídeos IN_CLOUD reintentan al permitir red; cambiar a ahorro cancela trabajo automático pendiente. | preload.test, media.test; vídeo preparado conserva reproducción |
| 6 | Ventana especulativa de vídeo de 256 MiB, estimación conservadora sustituida por bytes preparados; visible siempre prioritario. Cancelaciones cuentan hasta que termina la promesa nativa; reintentos y permisos temporales se limpian. | video-plan.test y media.test: admisión, edición, concurrencia y cambio de política |
| 7 | Reutiliza buckets Hamming con máximo 64 índices por distancia y conserva candidatos/desempates exactos. Pesos/Vision ceden entre elementos durante trabajo multimedia. | tests/swift/main.swift compara con búsqueda exhaustiva; requiere ejecución CI. Sin cambios de umbral ni agrupación |

Commits por etapa: b2b5cb6, 4dfc17c, fcc633d, a5cf162, 18c4b0e y 8ad63a0;
las correcciones cruzadas y versión tienen commit de integración posterior.

## Validación local

- 106/106 pruebas Node; runtime28; TypeScript noEmit PASS.
- Builds Vite web y assets nativos, preparación Sites/nativa y Sites4 PASS.
- QA demo automatizada: 1.000 descartes, máximo 30 tarjetas intermedias; recuperar,
  persistir en sobre autoritativo, cerrar/reabrir, recargar y teclado PASS.
- Antes/después: geometría normal/reducida, viewport pequeño, fuente/iconos,
  swipe y Deshacer PASS. CSS nativo conserva hash CBiWRrMW.
- Evidencia reproducible fuera del repo: `C:/Users/Joaco/Developer/CocoWash-stage1-evidence/`,
  all-tests.log, review-all-qa.mjs/json, smoke-all.mjs/json y capturas.
- Dependencias y runtime protegido sin modificaciones. Persiste warning de chunk
  >500 kB; no se interpreta como medición de fluidez.

## Límites e IPA

Esta entrega cambia Swift: necesita compilación iOS nueva. **No reempaquetar sobre
el binario de 0.9.5/0.9.6.** Compilación/IPA pendientes al preparar este registro.
El workflow mantiene smoke obligatorio y textura para el dispositivo. La prueba
Swift pura usa el compilador preinstalado de Ubuntu 24.04, sin nuevas dependencias.

Vision conserva el recorrido completo de representantes: el peor caso sigue siendo
cuadrático. Esta etapa limita asignaciones temporales (65 × 64 índices) y competencia
con media, sin introducir búsqueda aproximada no medida. No prometer aceleración
universal; obtener Instruments antes de sustituir el algoritmo de semejanza.
Los bytes de vídeo desconocidos se estiman para precarga; nunca se muestran como
mediciones al usuario. VoiceOver, iCloud real, codecs y rendimiento físico no quedan
acreditados por las pruebas simuladas.

Al instalar con AltStore, comprobación mínima pendiente: abrir sesión y revisión,
recuperar un elemento y reiniciar; reproducir un vídeo local/iCloud. No confirmar
borrados en la biblioteca personal. El usuario no necesita probar cada etapa
por separado, pero no se atribuye aceptación física de 0.9.7 sin esa evidencia.

Actualización de distribución: CI 41893615114 pasa tests, runtime y oráculo Swift;
build-for-testing llega a generar fixtures, acreditando compilación de simulador.
El log se detiene después en arranque CoreSimulator. Se separa la generación de
IPA personal en `build-ios-package.yml`: repite lógica/runtime/oráculo y compila
Release para dispositivo con textura. El smoke original permanece ejecutándose;
su resultado no queda acreditado por el job de paquete. No se publica release ni
se integra main. Paquete pendiente al preparar este cambio de CI.
