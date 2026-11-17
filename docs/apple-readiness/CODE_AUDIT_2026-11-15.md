# Auditoría de código y limpieza — 15 de noviembre de 2026

CW-CX-067. CocoWash 0.9.9.3; base `be288a0` en `main`, checkout canónico
`C:/Users/Joaco/Developer/CocoWash-android`. El usuario confirma que build46 se siente
fluida en iPhone y autoriza esta limpieza. Candidato de auditoría: iOS 0.9.9/build47;
Android conserva 0.9.9.3/code5. **Validación local PASS; envío a Apple bloqueado.**

## Alcance y criterio

Revisión de fuentes propias React/TypeScript, Swift y Kotlin, sus entradas,
almacenamiento, preparación de medios, permisos, borrado, compras, publicidad,
configuración y distribución. Grafo conservador de imports sobre 80 fuentes TS/TSX,
comprobación estricta del compilador y auditoría del lockfile contra npm. El runtime
de preview protegido se comprueba por sus 28 hashes; no se reescribe ni se auditan
internamente todos los SDK de terceros. No es una prueba formal de ausencia de defectos.

Skills aplicadas: `frontend-craft` en modo revisión y `coco-mobile-ui` para conservar
la experiencia aprobada. No se ha instalado ni simulado una skill «unslop».
La limpieza elimina rutas sin llamadas, capas redundantes y comentarios caducados;
conserva comprobaciones de errores y compatibilidad de datos que sí cumplen una función.

## Hallazgos corregidos

| Prioridad | Evidencia anterior | Cambio |
| --- | --- | --- |
| P1 dependencias | npm devuelve 12 avisos en 6 paquetes del árbol instalado, incluidos avisos altos | Vite 8.1.6, override explícito glob 14.0.6 y transitivas compatibles actualizadas. `npm audit`: cero avisos. Son avisos del árbol web/build; no prueba de explotación en una IPA. |
| P1 compatibilidad Apple | `disableLoupe()` recorre vistas/recognizers internos de WebKit buscando nombres `TapAndAHalf`/`Loupe`, incluso durante layout | Se elimina la dependencia de esos nombres. Eventos DOM públicos limitan la segunda pulsación sobre fotos; campos, botones y multitouch quedan fuera. `isTextInteractionEnabled=true` se conserva porque los campos nativos lo necesitan. Riesgo de compatibilidad, no rechazo de Apple demostrado. |
| P2 reproducción nativa | Los parsers aceptaban encabezados malformados como `bytes=abc-2`, interpretándolos como otro rango; Android abandonaba `skip()` sin alcanzar el offset si devolvía cero | Parsers puros Swift/Kotlin con el mismo contrato y fixture de 20 casos. Respuestas 200/206/416 coherentes; offsets verificados antes del acceso. Android completa el salto o cierra el stream. No se ha demostrado un cierre de la app por el parser anterior. |
| P2 mantenimiento | `switchColumns` nunca se invoca; solo esa ruta llena el mapa de clones salientes | Se quitan función, mapa y rama de clones inalcanzables; se conserva el morph/FLIP activo aprobado en build46. |
| P3 claridad | Wrapper `Photo` que solo delega, export `BAR_LINES` sin consumidores, imports sin uso, doble render de arranque, callbacks vacíos de AppDelegate y comentarios de ramas retiradas | Una implementación de Photo, un render tras inicialización/fallback y arranque nativo mínimo. Se elimina el export; su geometría se conserva. TypeScript exige `noUnusedLocals` y `noUnusedParameters`. |

Transitivas corregidas verificadas en lockfile: minimatch 11.0.8, nanoid 3.3.20,
postcss 8.5.33 y source-map-js 1.2.2. Se conservan pins directos de React,
Capacitor, Motion y SDK nativos. No se añaden librerías de producto.

## Contratos conservados y límites

- Descartar encola; eliminar sigue siendo una operación separada con confirmación
  de Fotos y reconsulta de favoritas. Las pruebas usan postales/vídeo sintéticos.
- Bundle `work.joaquin.mano`, claves persistidas, migraciones, permisos, siete
  idiomas, procesamiento local y límites de caché/preparación conservados.
- Compras iOS conservan verificación de transacciones, revocación y restauración;
  publicidad conserva consentimiento/ATT. Su código no acredita compras reales
  ni cumplimiento del tráfico de todos los SDK del binario firmado.
- Se conservan `nativeMessages.ts` (catálogo usado por pruebas), `vite-env.d.ts`
  (declaraciones), recursos de marca, fixtures, migraciones y recuperación de errores.
  No ser alcanzable desde una entrada de producción no basta para llamarlo basura.
- No se hace una partición masiva de ManoApp/PhotoLibrary ni cambios visuales por
  gusto. Son módulos grandes que merecen mantenimiento gradual; reescribirlos aquí
  añadiría riesgo sin demostrar una mejora del comportamiento aprobado.

## Verificación local ejecutada

| Control | Resultado y alcance |
| --- | --- |
| Node | 149/149 PASS, sin saltadas; incluye umbral/posición/tiempo de la segunda pulsación |
| TypeScript | PASS estricto con detección de locales y parámetros sin uso |
| Runtime protegido | 28/28 hashes PASS |
| Release, contratos nativos y Sites | 17/17 PASS; configuración fuente, no firma ni Swift ejecutado |
| Herramientas Python | 43/43 PASS |
| Build web / native-web | PASS; persiste aviso de chunk >500 kB, no se eleva su límite para ocultarlo |
| Dependencias | `npm audit` final: 0 vulnerabilidades conocidas a la fecha; no garantía futura |
| Privacidad estática | Declaraciones y dominios aprobados PASS; el propio checker mantiene archivo/tráfico/publicación BLOCKED |
| Metadatos | Release iOS y ficha Play de siete idiomas PASS en sus controles existentes |
| Navegador con fixtures | Grid/selección, anclaje, álbum, arranque, diario duradero, favoritas/comercio, vídeo/sonido y VHS PASS |
| Gestos bajo interrupción | 20 ciclos contrato iOS + 5 Android PASS; no equivale a medición física |
| Live Photo y guard DOM | Cinco escenarios Live y guard de texto PASS también sobre el build de producción servido con soporte de rangos |
| Swift/Kotlin nuevos | Pruebas de 20 rangos preparadas en CI; Windows no acredita su compilación |

El primer servidor HTTP de diagnóstico no admitía búsqueda por rangos: un seek del
vídeo demo volvía a cero. La misma prueba pasa en Vite dev y preview de producción,
con el mismo elemento y posición 1 s. No se altera la app ni se debilita la aserción
para ocultar ese fallo del entorno. La prueba del diario que importa módulos fuente
se ejecuta en Vite dev; las demás admiten el build estático.

Logs completos y sondas: `work/code-audit-20261115/` (local, ignorado). Recibo público
sin fotos ni credenciales: [code-audit.json](evidence/strategic/20261115-code-audit.json).

Código integrado en `b780b3c`, enviado a main. CI confirmada en ejecución el 15 de
noviembre: [desarrollo](https://github.com/joacomino-dev/mano-iphone/actions/runs/43687846424),
[tienda sin firma](https://github.com/joacomino-dev/mano-iphone/actions/runs/43687846408),
[Android](https://github.com/joacomino-dev/mano-iphone/actions/runs/43687846362) y
[gate nativo completo, simulador standard](https://github.com/joacomino-dev/mano-iphone/actions/runs/43687846772).
Resultado pendiente; no duplicar ejecuciones ni interpretar este estado como PASS.

## Puertas pendientes para Apple

1. Compilar el candidato exacto en macOS/Android y ejecutar los oráculos nuevos;
   ejecutar una sola vez el gate nativo completo con PhotoKit sintético. Un job
   iniciado o una compilación verde no resuelven fallos de XCTest anteriores.
2. Comprobar en iPhone el reemplazo de la lupa: pulsación larga/doble, pellizcos y
   edición de nombre de álbum. La aceptación física de build46 no cubre build47.
   R-73 conserva `sample`/rendimiento sostenido iOS pendiente.
3. Archivo final firmado, reporte agregado de privacidad, firmas SDK y contraste
   con App Privacy de App Store Connect; tráfico/ATT permitido y denegado en
   dispositivo/TestFlight. Declarar dominios no demuestra su bloqueo efectivo.
4. Configuración del propietario, acuerdos, productos, compras/restauración sandbox,
   accesibilidad/VoiceOver/tamaño de texto, iCloud y dispositivos soportados.
   Confirmar disponibilidad de build47 antes de la subida.
5. Las políticas ES/EN y soporte públicos responden HTTP200 pero todavía contienen
   el texto anterior sin Android; fuentes corregidas ya preparadas, publicación
   separada pendiente. No se cambian web pública, cuentas ni tiendas en esta tarea.

La [guía de revisión de Apple](https://developer.apple.com/app-store/review/guidelines/)
exige APIs públicas, estabilidad y metadatos completos (2.1/2.5.1); también cubre
privacidad y uso de datos de Fotos (5.1). Eliminar la heurística de WebKit reduce
una dependencia frágil, pero no garantiza aprobación. Los
[manifiestos de privacidad](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files)
y sus [motivos de acceso a APIs](https://developer.apple.com/documentation/technotes/tn3183-adding-required-reason-api-entries-to-your-privacy-manifest)
se deben validar en el archivo que se va a enviar, incluidos sus SDK.

**Entrega:** limpieza y correcciones locales comprobadas, candidata build47 preparada.
La app todavía no se declara apta para envío ni aprobada por Apple.
