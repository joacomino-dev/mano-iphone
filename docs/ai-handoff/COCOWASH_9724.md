# CocoWash 9.7.2.4 · build 24 de desarrollo (Claude)

Rama `claude/people-crash-b24` desde `6346fa3` (continuidad de Codex, sin avances
remotos posteriores). Sin merge a `main`, sin Release, sin instalación física.
Worktree propio `C:/Users/Joaco/Developer/CocoWash-b24`; el checkout
`CocoWash-stage1` y sus 24 archivos CRLF quedaron intactos.

## 1. Diagnóstico

**Evidencia disponible:** reporte del usuario (contador ~1.000+, cierre, cierres
posteriores). No había `.ips`, `JetsamEvent` ni traza recuperable: build 23 solo
escribía `NSLog`, que no sobrevive al cierre y no se puede leer sin Mac.
**Causa no confirmada.** No se atribuye a memoria, SDK ni GPU sin el informe.

Recorrido del código (`usePeople.ts → PeoplePlugin → PeopleIndex`):

- No existe ningún umbral cercano a 1.000 en el código. Lo único periódico es el
  agrupado del SDK (`analyzer.update()` + `readPrimary`) cada 64 fotos, cuyo coste
  crece con el índice. Encaja con un pico de memoria del agrupador que se cruza
  en algún punto, no con un límite del producto.
- Diferencias frente a build 19 (último aceptado): entrada de 1024 → 1536 px
  (`33a13e8`), segundo modelo para reconciliar, poda del modelo en **cada**
  refresco con fotos pendientes (cada vuelta a primer plano) y recreación del
  modelo tras cada pérdida de foco (Centro de control, notificaciones).
- La reconciliación preparaba recortes de **todas** las identidades, incluidas
  las de una sola foto, que la regla de fusión (≥2 fotos distintas) nunca puede
  usar. En bibliotecas con muchas caras sueltas eso multiplica decodificaciones,
  Vision y tamaño del segundo índice.
- Ciclo de cierres: tras un cierre **dentro** de una tanda, el marcador ya pausaba
  el arranque. Un cierre fuera de la tanda (estado/refresco, miniaturas,
  censura) no dejaba marcador y el análisis podía relanzarse solo al abrir.
  Tampoco había forma de saber en qué fase murió el proceso.

Hipótesis en orden: (1) pico de memoria en `update()`/lectura de grupos con el
índice ≈1.000 (+1536 px detecta más caras pequeñas); (2) reconciliación
sobredimensionada al terminar la pasada; (3) foto concreta que tumba la
decodificación o el SDK. Build 24 está instrumentado para separarlas.

## 2. Corrección (commits `016a917`, `3cd4fae`)

- `PeopleTrace.swift`: marcador de fases abiertas (archivo diminuto) + historial
  acotado (80 eventos, 12 cierres, 8 informes). Huella física y memoria libre
  (`os_proc_available_memory`) al inicio/fin de cada fase y cada segundo con una
  fase abierta; máximos por fase. Al abrir, una fase abierta = cierre abrupto,
  con primer/segundo plano. Sin IDs, nombres, rutas, imágenes ni datos faciales.
- MetricKit local: motivo de salida (límite de memoria, watchdog, acceso
  inválido…) y pila como binario+offset, si iOS los entrega a la app.
- **Compartir diagnóstico** en Personas: hoja nativa con un `.txt`; nada se envía solo.
- Ruptura del ciclo: cualquier fase de Personas abierta en un cierre en primer
  plano pausa el análisis automático. Una fase que cerró la app dos veces seguidas
  solo vuelve a ejecutarse con una acción explícita (Reanudar / Revisar /
  Reintentar censura). La foto en curso queda anotada en el marcador protegido;
  dos cierres con la misma foto la **apartan** (no se borra, se reintenta con el
  siguiente build). «Pausar» nunca abre un índice cuya apertura falló.
- Freno de memoria: antes de cargar modelo, agrupar o decodificar, si la memoria
  libre baja de 300/150 MB la tanda se pausa 20 s y libera modelos. Avisos de
  memoria liberan modelos inactivos.
- Menos trabajo, mismo resultado: la reconciliación omite identidades de una sola
  foto (prueba de equivalencia de decisiones); la poda se hace una vez por proceso
  o con entradas obsoletas. `autoreleasepool` en recortes/censura. Sin
  `systemUptime` (API de motivo obligatorio sin declarar en el manifiesto).
- No se cambió la resolución (1536 px) ni la política de segundo plano: hacerlo
  sin evidencia confundiría la atribución. Queda como opción B si la traza
  confirma memoria en `group`.

## 3. Validación

| Ámbito | Resultado |
|---|---|
| Windows | 115 pruebas Node (+1), TypeScript, runtime 28, build web y native-web, Sites 4/4 |
| CI macOS | [run 42095345318](https://github.com/joacomino-dev/mano-iphone/actions/runs/42095345318) **success**: Swift puro (traza nueva, identidades con equivalencia), API pública, Release iPhone, smoke de arranque/reapertura |
| Edge, puente simulado | 22 capturas en `work/qa-b24/` (`mano/tests/qa-b24-capture.mjs`), 0 errores JS |
| iPhone | **validación física pendiente** |

Build 23 vs candidato en condiciones equivalentes solo es posible en iPhone: el
simulador no ejecuta `FaceGroupAnalyzer`.

## IPA

Fuente `3cd4faeff82f6beec9360d66afcd635aa7a53bc3` (`016a917` + número de build:
`configure-ios.mjs` fijaba 23; el primer run se canceló y se corrigió).
`C:/Users/Joaco/Downloads/CocoWash-9.7.2.4-build24-3cd4fae.ipa`, 5.895.646 bytes,
SHA-256 `91e7ca7eab2f1412688f03e425918e3eb41f35a1ef83f20f746df70104585bed`.
Digest del artefacto de GitHub verificado. Bundle `work.joaquin.mano`, 9.7.2,
build 24, mínimo iOS 17, arm64, **sin** `CocoWashDevelopmentReset`, marcadores
de traza/MetricKit/diagnóstico y textura presentes. Sin firma.

## 4. Recorrido físico mínimo (usuario)

Instalar build 24 **encima** del 23 (sin reset: conserva el índice que falló).

1. Abrir CocoWash. Filtros → Ver grupos de personas. Anotar el texto de estado
   (debe indicar en qué fase se cerró si la traza lo detecta) y pulsar
   **Compartir diagnóstico** → Guardar en Archivos. Es el «antes».
2. Pulsar Reanudar análisis y dejar la app en primer plano, conectada a
   corriente, hasta superar holgadamente el número donde se cerraba.
3. Si se cierra: reabrir, entrar a Personas, Compartir diagnóstico. Anotar hora,
   si estaba en primer plano y si el cierre ocurrió al abrir o al volver a Personas.
   Opcional: Ajustes → Privacidad y seguridad → Análisis y mejoras → Datos de
   análisis → archivos `Mano…`/`JetsamEvent…` de esa hora (sin subirlos).
4. Si termina: abrir un grupo, cerrar la app desde el selector, reabrir y
   comprobar progreso y correcciones. Durante otra tanda, ir a Inicio y volver.
5. Comparación limpia (solo después de guardar el diagnóstico): Desactivar y
   borrar índice → Activar Personas → repetir 2–4.

Anotar: modelo de iPhone, iOS, «X de Y» al cerrarse, título de estado
(«Buscando caras…» u «Organizando los grupos…»), resultado y el `.txt`.

## 5. Auditoría visual

Detalle, capturas y propuestas en el informe del chat de esta entrega
(CW-CL-034). Ningún cambio de dirección visual implementado: esperan aprobación.
Lo único nuevo en pantalla es funcional: nota de cierre con fase, fotos
apartadas y el botón Compartir diagnóstico.

## Pendientes reales

- Prueba física y atribución con la traza/MetricKit.
- Segundo plano (`BGContinuedProcessingTask`) sigue fuera de alcance hasta
  estabilizar el primer plano; no cambia la protección del índice.
- Opción B (entrada 1024 px como build 19) solo con evidencia de `group`.
- Propuestas visuales P1–P8 a la espera de revisión.

## Actualización: causa confirmada y build 25 (9.7.2.5)

Prueba del usuario con build 24 (iPhone14,5, iOS 27.0.1, 3 GB): índice borrado y
nueva pasada; cierre en 1115/1208 al terminar la primera pasada, y otra vez al
reanudar. Traza: fase `reconcile-insert`, primer plano, huella 33 MB y 2,3 GB
libres (**no es memoria**). MetricKit: SIGABRT desde `libswiftCore`. La
simbolización del binario sitúa el aborto en `PeopleIndex.stamp(_:photo:)`
llamado desde `reconcileStep`:
`store.entries[photo]?.faces[i].sampleStamp = stamp(...)`. La cadena opcional
abre un acceso de modificación a `store` antes de evaluar el lado derecho y
`stamp()` lee `store`: la comprobación de exclusividad de Swift aborta el
proceso. Presente desde build 20; explica que siempre falle al pasar de
«revisar» a «organizar». Las 93 fotos restantes son solo iCloud (sin vista local).

Corrección `5917cb4`: calcular el sello antes de escribir. Además, decisión del
usuario: Personas arranca sola al abrir, sin pantalla de consentimiento; queda
apagada solo tras «Desactivar y borrar índice». Textos: «Buscando rostros en tus
fotos» / «Agrupando a las personas…», «Todo ocurre en este iPhone… si sales de
CocoWash, se pausa y sigue al volver». Build 25 sin reset: conserva el índice de
build 24; pulsar Reanudar una vez (la fase quedó en pausa de seguridad).

## Build 26 (9.7.2.6): monetización integrada y revisión visual

Encargo del usuario: integrar `codex/cocowash-monetization-ios` (base 0.9.7)
sobre esta rama y completar la revisión gráfica. Monetización portada sin
cambiar su lógica de frecuencia (30–40 revisadas, tarjeta al terminar, pases y
café), adaptada al lenguaje de CocoWash; textos en español reparados (venían
doblemente codificados). El IPA de desarrollo lleva `CocoWashTestAds`: muestra
el bloque de prueba público de Google para probar gesto, consentimiento y
diseño; una compilación App Store sigue exigiendo IDs reales de AdMob. Las
compras StoreKit no funcionan en un IPA sin firma ni productos en App Store
Connect. Pendiente en iPhone: gesto, consentimiento UMP/ATT, compras.
Revisión visual: ver UI_BASELINE «Revisión visual 9.7.2.6».
