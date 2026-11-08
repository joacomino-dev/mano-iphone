# CocoWash — Release Candidate local

**Actualización2026-11-08:** fuente canónica main en CocoWash-android, último código `ece507b`;4 checkpoints nuevos sobre f5c3546. [Estado actual, pruebas y bloqueos](FOLLOWUP_2026-11-08.md). R-00 físico sigue abierto, R-01/R-02 FAIL, nuevo puente Live sin compilar: NO APTA para enviar. Lo que sigue conserva el informe histórico CW-CX-020, no identifica el checkout o SHA actuales.

Fecha:2026-11-07 · Codex CW-CX-020.

**Estado final: preparación local ejecutada; NO APTA todavía para enviar a Apple.**
Existe un P1 de privacidad comprobado y faltan las puertas nativas, comerciales y
de distribución. No se transforma un bloqueo en PASS por preparar scripts/documentos.

## Fuente, versiones y recuperación

Commit final de código/configuración: **`dc5ffc97feaf2823558f5adedb5da39753f6939f`**.
Los tests/evidencias y este informe se consolidan en el commit documental posterior;
su SHA se obtiene con `git log -1 --format=%H -- docs/apple-readiness/RELEASE_CANDIDATE.md`.
La respuesta de entrega identifica también ese commit. Ningún push realizado.

Base inicial limpia:`b0cf83deedfa2e510833c0b6149637e544d9cc7c`; checkpoint anterior
`9ff2734`. Checkout canónico `C:/Users/Joaco/Developer/CocoWash-b24`, rama existente
`claude/cocowash-9.8.6`. OneDrive0.7 no fue actualizado ni sobrescrito.
Historial de fases1/2 conservado, sin reset/stash/clean ni dependencias actualizadas.

Bundle `work.joaquin.mano`; marketing0.9.9/build43; producto visible0.9.9.1;
package0.1.0. iOS mínimo17.0, familia iPhone, arm64 declarado, retrato.
React19.2.7, TS7.0.2, Capacitor8.6.0; Ads13.12.0/UMP3.1.0 inspeccionados.
Versión/build de envío únicos requieren consultar ASC; no se asumió que44 esté libre.

Bundle inicial local completo verificado:
`work/apple-readiness/rc-start-b0cf83d.bundle`, SHA256
`42db9b129bfb82c9a64bb4802bc368c4d9631800f6292b6b70972dbfc6ac4e0f`.
Los28 archivos protegidos pasan. Sin diff de arte/brand/assets/Characters/DecisionBar/
Vhs/prototype.css frente a b0cf83d; icono y animaciones aprobados conservados.

## Correcciones y checkpoints

| Commit | Problema demostrado y corrección mínima |
| --- | --- |
| `645564f` | P1: snapshot manual antiguo quitaba una favorita confirmada. Invalidación antes/después de favorite/unfavorite y undo nativos. También catálogo vacío mostraba ofertas indisponibles/«Pronto»: ahora oculta faltantes, conserva entitlements y ofrece reintento |
| `9824907` | P2:9 mensajes Swift quedaban en español en otros idiomas; registro/traducciones y test de cobertura. Cerrar de Live Photo utiliza recurso nativo localizado; compilación Swift pendiente |
| `cb927ad` | P1: etiquetas/manifiesto minimizaban vinculación y omitían categorías del SDK real. Unión conservadora de manifiestos, política ES/EN y etiquetas corregidas con recibos oficiales |
| `55c6951` | P1: canal developer y Release de prueba. Se aplican exclusivamente los ajustes comerciales ya existentes en release4c43d0c; Debug sigue de pruebas. Sync ya no fuerza0.9.9/build43 sobre una versión elegida. Gates/archivo local/workflow manual preparados |
| `880a9a0` | P1 abierto: tracking=true sin dominios. Gate estricto falla y bloquea archivo de envío; no inventa dominios ni oculta el incumplimiento |
| `dc5ffc9` | Política: plazo de respuesta según ley aplicable, sin generalizar un mes a Ecuador; fuente oficial contrastada |
| `ca668b7` | Scripts exigen Xcode26+/SDK26+ y verifican destino iPhone/arm64 del archivo; sintaxis comprobada, ejecución Apple bloqueada |

[Antes](evidence/rc/flow-before.json):2 FAIL reproducidos sobre b0cf83d.
[Después](evidence/rc/flow-after.json):10 PASS, incluyendo catálogo/reintento,
compra cancel/pending/error/confirmada y restore fallido. Todo con puente sintético;
no son resultados StoreKit/PhotoKit reales. Fallos intermedios de nuevos selectores
de pruebas se corrigieron según nombres accesibles reales, sin cambiar el producto.
El test general detectó la traducción obsoleta «Pronto»; se retiró la clave, sin
debilitar la validación i18n.

## Congelación funcional

Se mantienen navegación/onboarding, PhotoKit, tarjetas/fotos/vídeos, Conservar,
Descartar a revisión, Favoritas, Más tarde, Deshacer, filtros/álbumes y revisión,
permisos, persistencia, configuración y monetización existentes. No se añadieron
funciones. Deshacer revierte decisiones recientes; **no recupera borrados ya
confirmados**. Esa recuperación corresponde a Fotos/Eliminado recientemente.

PASS inspección: Personas/Breakup/identificación facial avanzada no están expuestos
ni se anuncian; fueron retirados en build43. Limpieza de datos antiguos no equivale
a funcionalidad activa. Se preserva detección local existente de cantidad de caras
como señal de clasificación, sin ampliar Vision ni crear perfiles de identidad.
El canal candidato oculta controles developer. El catálogo no muestra funciones
«Pronto» ni botones de compra sin producto disponible.

## Pruebas ejecutadas y límites

[Recibo principal](evidence/rc/results.json), logs/resultados en
[evidence/rc](evidence/rc/README.md). Windows, Node24.22.1, Edge instalado, sin
macOS/Xcode/Swift/SDK Apple/simuladores/dispositivo ni sesión administrativa ASC.

| Comprobación | Resultado |
| --- | --- |
| Baseline antes de editar | PASS:119 Node,28 runtime,TS,builds,Sites4,19+9 fixtures y8 runtime |
| Lógica/localización final | PASS120/120; incluye cobertura de fallbacks Swift |
| Release/versión/metadatos | PASS6/6, incluyendo rechazos de developer/ID vacío/reset/subtítulo largo y preservación de versión tras sync |
| Contratos TS↔Swift/config | PASS4/4 estáticos; no son compilación ni ejecución Swift |
| Sites | PASS4/4 |
| Regresión Apple JS | PASS19/19; permisos/eliminación cancel/error/parcial/éxito, layouts/insets/onboarding/secondary |
| Seguridad ampliada JS | PASS9/9; reordenación, refresh, recuperación bloqueada, permisos, reload e iCloud simulado |
| RC catálogo/favorita | PASS10/10 |
| Accesibilidad/layout ES/EN | PASS6/6:375×667,390×844,440×956, teclado, controles44CSSpx, texto raíz200%, revisión accesible y recuperación sin borrar |
| Runtime móvil original | PASS8/8 en Edge; también contrato Pixel conservado |
| TypeScript / hashes | PASS sin errores /28 protegidos intactos |
| Web / native-web | PASS ambos; warning de chunk>500kB no ocultado |
| Capacitor sync iOS Windows | PASS copia/configuración/plugins/fuentes; después4 contratos y Release PASS |
| SDK oficiales | PASS checksum de ambos ZIPs y manifiestos; firmas Apple y tráfico BLOCKED |
| Política pública | PASS GET200 con PowerShell, contenido anterior; urllib recibió403. Actualización pública BLOCKED por autorización |
| Fixtures nuevos | PASS12 PNG sintéticos generados y decodificados en Edge. Importación/formatos cámara/medios grandes NOT TESTED |
| Gate nativo / archivo en Windows | BLOCKED:ambos exit78; Bash syntax PASS |
| Gate privacidad `--submission` | **FAIL exit1** por dominios vacíos; P1 pendiente |
| Swift/PhotoKit/AVFoundation/Vision nativos actuales | BLOCKED, no ejecutados |
| Firma/archivo/IPA/TestFlight/App Review | BLOCKED, no generados/subidos/aprobados |

El código nativo de borrado resuelve después de éxito PhotoKit y vuelve a comprobar
favoritas; inspección estática PASS. Cancelación/error/parcial/asíncrono PASS en JS
con datos sintéticos. **Eliminación nativa adversa sigue BLOCKED**, no se confirmó
ningún borrado personal. No existe evidencia para certificar ausencia de P0 nativos.

## Rendimiento comprobado

Perfil de **metadatos sintéticos Node**, Windows AMD Ryzen AI9 HX370,5 repeticiones,
GC explícito; incluye muestras de tiempo/CPU/heap/RSS en
[JSON](evidence/rc/performance.json). No es rendimiento de iPhone ni de medios reales.
Vite y pruebas Edge estaban activos: carga de fondo no aislada, sin benchmark
controlado del sistema completo.

| Elementos | Validar/serializar todas las marcas, mediana | Reutilizar record validado, mediana |
| --- | --- | --- |
| 1.000 | 0,49ms | 0,20ms |
| 10.000 | 8,60ms | 2,66ms |
| 50.000 | 51,32ms | 17,47ms |

Native-web JS917,13kB, gzip270,07kB según Vite. No se cambia el umbral para silenciar
warning ni se reestructura arquitectura sin Instruments. RAM/CPU/batería/decodificación,
sesiones prolongadas, biblioteca completa y review físicos: BLOCKED. La persistencia
actual agrupa escrituras350ms y flush de lifecycle; muerte antes del flush requiere
prueba física, sin garantía inventada de cero pérdida de la última decisión.

## Compatibilidad y accesibilidad

Se conserva17 por coherencia de dependencias/API/cobertura; no se rebaja por el
mínimo15 de Capacitor ni se sube sin medida. [Matriz completa](COMPATIBILITY.md):
SE2/3,XR/XS,mini,estándar/Plus/Pro/Max y recientes como candidatos dentro de sus
OS admitidos. Apple confirma18 Pro/Max y Duo; no se inventan18 estándar/Plus.
Sistemas candidatos17/18/26/27.1; disponibilidad real de runtime/hardware pendiente.
**Ningún modelo físico ni simulador Apple nuevo probado en esta intervención.**

PASS geometría web, safe areas simuladas y seis checks accesibles ES/EN. Root font200%
no acredita Dynamic Type. VoiceOver, contraste actual completo, teclado iOS,
Reduce Motion nativo, Dynamic Island, cámara/barras y pliegue/transición Duo BLOCKED.
No hay promesa de Duo optimizado ni adaptación especial inventada.

## Privacidad, monetización y localización

[Informe específico](PRIVACY_AND_MONETIZATION.md) y
[etiquetas propuestas](../appstore/app-privacy.md). Controller/contacto confirmados
por el usuario; política completa ES/EN preparada localmente. Fotografías/decisiones
locales se distinguen de Ads/UMP, IDFA, StoreKit, geocodificación y soporte.
Hay detección de caras local sin identificación. Compartir explícito está explicado.
SDK externo sí declara recogida: no marcar Data Not Collected.

**FAIL:** dominios de rastreo pendientes. **BLOCKED:** agregado, firmas, tráfico,
consentimiento regional y publicación autorizada del texto actualizado. La regla
[TN3182](https://developer.apple.com/documentation/technotes/tn3182-adding-privacy-tracking-keys-to-your-privacy-manifest)
no se considera cumplida con array vacío. Datos comerciales/DSA/territorios y
obligaciones legales del titular continúan pendientes.

Se conserva monetización por elección expresa: Ads, año no autorrenovable,
vitalicio y café consumible. No se inventaron precios/IDs ni activaron productos
en ASC. PASS código y contratos UI; sandbox/restore/expiry/refund/catálogo comercial
BLOCKED. No se seleccionó unilateralmente lanzar gratis sin monetización.

UI centralizada en los siete idiomas existentes con tests, errores nativos completados;
ES/EN probados en flujos accesibles. Otros idiomas/RTL/prompts del sistema conservan
trabajo, pero no tienen aceptación lingüística/nativa completa. No se anuncia un
idioma por la mera existencia de un archivo de traducción.

## Recursos y aceptación de salida

[Ficha ES/EN con límites](storefront/metadata.json),
[notas de revisión/permisos](storefront/REVIEW_NOTES.md),
[inventario/procedimiento de capturas](storefront/SCREENSHOTS.md), icono aprobado,
[gate Mac/CI/archivo](NATIVE_GATE.md), ExportOptions sin secretos y plantilla QA.
Capturas nativas de la RC no disponibles; no se fabricaron.

| Criterio del usuario | Estado final |
| --- | --- |
| Sin P0 conocidos | BLOCKED aceptación nativa adversa; ningún P0 abierto reproducido en los casos JS cubiertos |
| Sin P1 de distribución | **FAIL** por dominios; otros gates BLOCKED |
| Pruebas/TS/web/protegidos | PASS en el alcance ejecutado |
| Configuración nativa coherente | BLOCKED compilación actual; estático/sync PASS como evidencia parcial |
| Permisos/destrucción validados | BLOCKED nativo; contratos JS PASS como evidencia parcial |
| Privacidad consistente/completa | FAIL dominios; agregado/tráfico/web/legal además pendientes |
| Localización mínima funcional | BLOCKED prompts/nativo; ES/EN web y cobertura PASS |
| Accesibilidad básica | BLOCKED aceptación iOS; DOM/teclado/targets PASS, contraste completo NOT TESTED |
| Metadatos preparados | PASS borradores ES/EN y límites; campos de cuenta/edad BLOCKED |
| Recursos distribución preparados | BLOCKED screenshots/asset catalog nativos; icono fuente PASS |
| Monetización consistente | BLOCKED funcionamiento comercial; fuente/UX PASS, decisión conservada |
| Procedimiento build/firma | PASS preparado/syntax; no acredita su ejecución Apple |
| Nativo/distribución verificados | BLOCKED; no listo para enviar |

## Acciones humanas y siguiente paso

1. Revisar commits locales y autorizar cuando corresponda integración/push/CI
   estándar público, o aportar Mac con Xcode27.1 estable. No enviar secretos.
2. Ejecutar gate unsigned y QA sintética en Apple; medir en hardware y resolver
   dominios con proveedor/tráfico. Mantener iOS17 hasta tener esa evidencia.
3. Titular: cuenta/equipo, versión/build únicos, productos/precios/contratos,
   consentimiento/AdMob, DSA/contacto/territorios y adopción de política. Autorizar
   publicación de políticas y obtener capturas reales antes del envío.
4. Solo con puertas cerradas y autorización: archivo firmado/IPA, revisión de
   hash/configuración y subida a TestFlight; pruebas físicas; después App Review.

Instrucciones exactas y orden: [APP_STORE_SUBMISSION_CHECKLIST](APP_STORE_SUBMISSION_CHECKLIST.md).
Ni un build web, ni documentación, ni un workflow preparado sustituyen esas puertas.
