# Fase 2: seguridad, validación nativa y preparación TestFlight

2026-11-07 · CW-CX-019. **No está autorizada ni ejecutada ninguna distribución.**

## Estado preservado

La base remota sigue en build 43, `691cded`. Se revisó el diff completo anterior,
los inventarios y los tests, y se repitieron 119 Node, 19 escenarios Edge, Sites4,
TypeScript, ambos builds web y los 28 hashes protegidos antes de modificar código.

Checkpoint autorizado: **`9ff2734510182e00faa62d705a801b9b2a252dee`**.
Correcciones de esta fase en **`b463bd2`** y
**`13dae6f74869fcab1e01ba35144afd4647fc1963`**. Son commits locales, sin push.
Se reutilizó puntualmente la identidad Codex que ya figuraba en commits del
repositorio; no se cambió la configuración global de Git.

Versión/bundle/build siguen 0.9.9.1 / 0.9.9 / 43, bundle `work.joaquin.mano`.
No se cambia el número antes de comprobar cuál admite App Store Connect. No se
tocan Swift, dependencias, monetización, arte, animaciones ni claves de datos.
El nuevo estado es una fuente corregida, no un nuevo IPA ni una entrega física.

## Qué se ejecutó realmente

| Comprobación | Resultado y alcance |
| --- | --- |
| Pruebas de dominio/medios/persistencia | **VERIFICADO:** 119/119 antes y después |
| Regresión de Fase 1 | **VERIFICADO:** 19/19 escenarios con Edge y puente ficticio |
| Seguridad ampliada | **VERIFICADO:** 9/9 escenarios con respuestas retenidas, orden invertido, revocación, recuperación, recarga real de página y fallo/reintento de preview |
| Contratos entre lenguajes | **VERIFICADO estático:** 4/4: métodos TS/Swift registrados, escena/bridge, mínimo/bundle y localizaciones/manifiesto |
| Runtime de preview | **VERIFICADO en Edge:** 8/8 tras corregir una coordenada inválida del test; no se cambian sus aserciones ni el runtime |
| TypeScript / builds web y native-web / Sites | **VERIFICADO:** PASS, Sites4. native-web no compila Swift |
| Archivos protegidos | **VERIFICADO:** checker28 PASS; mismas fuentes del runtime, arte y nativo que en la base |
| XML de plist/manifest | **VERIFICADO:** parseo estructural con PowerShell; no es el validador de archivo de Apple |
| Script de validación macOS | **VERIFICADO:** sintaxis bash y rechazo en Windows con exit78. La compilación que prepara no se ejecutó |
| Compilación Swift, WKWebView, PhotoKit/AVFoundation/Vision reales del diff | **NO VERIFICABLE EN ESTE ENTORNO** |
| Hardware, VoiceOver, Instruments, iCloud real y TestFlight | **NO VERIFICABLE EN ESTE ENTORNO** |

Entorno: Windows x64, Node 24.22.1, pnpm 11.25.0, Edge y Git Bash existentes.
No npm en PATH, Swift, xcodebuild ni xcrun. No se encontró un entorno WSL utilizable.
La consulta WPD no devolvió un teléfono; eso no acredita por sí solo ausencia de
hardware. No se instaló ni controló ninguna app en un iPhone.

La CI verde de build43 sigue siendo evidencia de la **base**, no del código de
esta fase. No se lanzó una nueva CI ni se atribuyó su resultado al nuevo diff.

## Problemas demostrados y solución mínima

| ID | Prioridad | Reproducción / causa | Corrección / prueba |
| --- | --- | --- | --- |
| APL-015 | P0 de estado | Retener “Actualizar biblioteca”, confirmar borrado y liberar el snapshot: `removed` volvía a `[]`. `connect` no compartía las invalidaciones del refresco automático | Generación común para snapshots manuales/automáticos y comprobación tras cada await. FAIL antes/PASS después |
| APL-016 | P0 de interacción destructiva | Con borrado pendiente, Recuperar individual seguía activo. Permitía prometer recuperación cuando la solicitud ya estaba en manos de Fotos | Botón disabled y guards de handler mientras busy; cancelación lo reactiva y conserva cola. FAIL antes/PASS después |
| APL-017 | P1 | Retener revocación y confirmar primero el borrado invalidaba la respuesta de permiso por compartir contador con los snapshots | Vigencia de permiso separada de la vigencia de datos; la denegación más reciente se aplica y la eliminación confirmada permanece registrada. FAIL antes/PASS después |
| APL-018 | P2 de automatización | El test de salida BottomSheet hacía clic en (8,8), fuera del recorte de radio42 de la pantalla; hit-test devolvía HTML | Clic real en overlay expuesto y aserción previa de hit-test. Mismas comprobaciones de montaje/salida, 8/8 PASS |

La prueba inicial del refresco apuntaba al tab equivocado; se corrigió a Ajustes
antes de registrar la reproducción válida. El primer checker de contratos asumió
una API de parser de TypeScript no disponible y una única forma de registro Swift;
se ajustó al código real, sin modificar el producto para hacerlo pasar.

Los fallos de esta tabla no prueban que se produjeran pérdidas en un teléfono.
Sí prueban inconsistencias del código y controles con el puente asíncrono. No se
marca cerrada la validación nativa de ninguno de ellos hasta ejecutarla en Apple.

## Semántica de datos conservada

Descartar solo añade a la cola. Recuperar desmarca; Deshacer conserva sus 30
decisiones y contexto actuales. Ni Recuperar ni Deshacer recuperan un archivo ya
eliminado por PhotoKit: eso corresponde a Fotos / Eliminado recientemente.

El éxito nativo sigue llegando únicamente desde performChanges con success=true;
JS usa los IDs confirmados. Error/cancelación no suman liberación ni vacían cola.
La nueva exclusión de recuperación solo dura mientras se espera ese resultado.
No se cambia la confirmación, la selección ni la definición de favorita.

Las pruebas abarcan permiso completo/limitado/denegado, cambio en ambas direcciones,
revocación durante enumeración, consultas fuera de orden, persistencia tras recarga
y undo. El caso de nube simula IN_CLOUD/NETWORK_ERROR en el puente y un reintento
posterior correcto; no es una prueba del servicio iCloud ni de conectividad física.

## Rendimiento medido

Perfil independiente: Node24 en Windows x64, AMD Ryzen AI 9 HX370, GC explícito,
metadatos sintéticos, cinco muestras por operación/tamaño. Sin fotos decodificadas,
PhotoKit, vídeo, GPU, navegador o almacenamiento de un teléfono.

| Assets / marcas | Orden antiguo | Orden aleatorio | Elegibilidad tras 30 decisiones | Validar+serializar todas las marcas | Serializar mismo registro validado |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1.000 | 0,03 ms | 0,56 ms | 0,41 ms | 0,50 ms | 0,21 ms |
| 10.000 | 0,26 ms | 5,61 ms | 2,15 ms | 8,22 ms | 2,70 ms |
| 50.000 | 1,37 ms | 39,76 ms | 8,17 ms | 52,87 ms | 16,12 ms |

Son medianas de esa ejecución, no presupuestos ni promesas para iPhone. reviewRows
con 1.000 pendientes tardó aproximadamente 0,03–0,05 ms; solo mide cálculo de filas,
no render/scroll/carga de miniaturas. El JSON conserva CPU y heap/RSS antes/después
de cada muestra: no son máximos de RAM de CocoWash. CPU Windows tiene granularidad
gruesa para operaciones cortas; no interpretar sus ceros como ausencia de trabajo.

Inferencia: la serialización de registros densos merece perfil de hilo principal
en SE/compacto. No se migra almacenamiento ni se cambia atomicidad a partir de
un microbenchmark de escritorio. Las colas/cachés y límites multimedia mantienen
sus contratos; decodificación, RSS/CPU/energía y suspensión reales están pendientes.

## Gate nativo preparado

Desde mano en un Mac con dependencias fijadas ya instaladas:

```bash
bash scripts/validate-apple-native.sh
```

Guarda inventario Xcode/SDK/simuladores, SHA/estado, resolución SPM, oráculos Swift,
build arm64 sin firma y comprobaciones del bundle/minOS/recursos localizados.
No archiva, firma, crea certificados, exporta IPA o sube nada.

`--simulator-smoke` solo se permite en GitHub-hosted desechable: el script legado
reinicia cachés globales SwiftPM y no se considera seguro en un Mac personal.
Su gate existente prueba lectura de PhotoKit/vídeo, no borrado. Los selectores del
smoke deben pasar realmente en build43 corregido; no se sustituyen por marcadores.

## Preparación de distribución y siguiente puerta

[TESTFLIGHT.md](TESTFLIGHT.md) define archivo firmado, revisión de privacidad,
fixtures físicos y aceptación. Sigue bloqueado por macOS del diff, PhotoKit
destructivo con datos sintéticos, matriz de hardware, firma/cuenta y ASC.

Recomendación: mantener mínimo17, ejecutar gate nativo sobre esta fuente y probar
primero permisos/borrado/recuperación en biblioteca desechable. Después mínimo17,
26/27.1, compacto/estándar/Max y Duo; finalmente sandbox y TestFlight autorizado.
No ampliar destinos ni afirmar optimización Duo a partir de las pruebas web.

Recibos reproducibles: [evidence/phase2](evidence/phase2/README.md).
