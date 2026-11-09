# Relevo vigente para Claude — cierre visual de RC (CW-CX-054)

Fuente única: `C:/Users/Joaco/Developer/CocoWash-android`, `main`, producto
`12c153de6fd7887ea6ca4aef5f342f499ebef7f4`, enviado a origin. Consulta Git real,
`CURRENT_STATE`, roadmap y última entrada Codex. Las instrucciones antiguas bajo
HISTORIAL no describen la entrega actual ni autorizan operaciones.

**Estado: recepción preparada; cierre visual y binarios finales pendientes del gate
nativo. Codex mantiene la escritura mientras resuelve esos resultados.**

## Tu trabajo cuando se libere el gate técnico

1. Contrasta `ReleaseReadiness.json` y `RELEASE_CANDIDATE.md` con runs y SHA reales.
   No conviertas un BLOCKED en PASS, no reconstruyas correcciones ni uses OneDrive/b24.
2. Acepta visualmente Live Photo (clave/pausa/bucle/anclaje/timeline), carta Android
   Fredoka/RTL y pulsación larga sin lupa, selección, menú ni Live Text. El campo de
   álbum debe seguir permitiendo escribir y guardar. No cambies identidad, personajes,
   lettering, iconos, animaciones ni protected28.
3. Capturas reales disponibles: iOS 42516036408 (28, siete idiomas, RGB 1206×2622) y
   Android 42516038859 (28, RGB 1080×1920). Copias locales en
   `work/ci/ios-screens7/store-screens` y `work/ci/screens-7/store-screens`. Son de
   813114c: sirven de baseline; no son aceptación de los cambios posteriores.
4. Las capturas nuevas de Live/pulsación y fullscreen estarán en los artefactos del
   gate del SHA final. El XCTest observa menús después de soltar; **no prueba la
   ausencia de una lupa transitoria durante el contacto**. Hace falta observación
   nativa o física. Registra esa diferencia sin darla por resuelta.
5. Android retiene anuncios si las compras son desconocidas. No cambies esa regla,
   consentimiento, IDs o monetización para fabricar una captura. El anuncio nativo
   necesita SDK disponible/configuración válida; los contratos ES/AR de navegador
   simulan SDK y no son aceptación visual nativa.
6. Cuando el código y el aspecto estén aceptados, genera IPA/APK mediante workflows
   existentes del mismo SHA y verifica hashes/canales. Una IPA sin firma para iLoader
   no equivale a TestFlight. No publiques web, tiendas, cuentas ni certificados.
7. Registra aceptación o defectos concretos en CLAUDE_LOG/roadmap y devuelve el SHA,
   capturas, binarios y límites. Si necesitas cambiar lógica, vuelve a Codex.

Evidencia: [diario R-61](../apple-readiness/PERSISTENCE_R61_PROPOSAL.md),
[diagnóstico Live/R-63](../apple-readiness/evidence/strategic/r07-r63-diagnosis.json),
[R-47](../apple-readiness/ANDROID_R47.md). Aprobaciones de diario/dominios y estrategia
comercial ya recibidas; no volver a pedirlas. La infraestructura de medición está congelada.

---

# HISTORIAL — entrega anterior; no ejecutar sus instrucciones ni usar sus SHA

# PROMPT FINAL PARA CLAUDE — INTEGRAR Y CARGAR LA ÚLTIMA VERSIÓN DE COCOWASH

Retoma CocoWash para integrar, cargar y verificar la entrega de Codex. No vuelvas a desarrollar las correcciones.

## 1. Fuente exacta y recuperación

Trabaja en C:/Users/Joaco/Developer/CocoWash-android, única rama main, remoto joacomino-dev/mano-iphone. Inicio limpio f5c3546badbb262626eb05bf6346a08b3c833a72; último código ece507b36b530c7b78199341ff16f51c1075194d. La entrega incluye un commit documental posterior: obtén su SHA con `git log -1 --format=%H -- docs/apple-readiness/FOLLOWUP_2026-11-08.md` y contrástalo con el SHA final de la respuesta de Codex.

Checkpoints recuperables: cd717f9 (R-00),1bc2561 (R-07),67dd04d (R-01/R-03/evidencia R-02),ece507b (R-04). Codex no hizo push; main local está por delante de origin/main. No lo reemplaces por la copia remota. No recrees las ramas antiguas ni uses CocoWash-b24/OneDrive/stage1 como base. El backup previo de todas las ramas está en work/backup/mano-iphone-all-branches-2026-11-07.bundle, SHA256 b547931d10bb4c8a618e6e433655393957aefe79089d0846e5e750134bfa5303.

Antes de escribir, lee AGENTS.md, mano/AGENTS.md, PROTOCOL.md, CURRENT_STATE.md, últimas entradas CODEX_LOG CW-CX-021–025 y docs/ROADMAP.md. Comprueba:

```powershell
git status --short --branch
git rev-parse HEAD
git log --oneline f5c3546..HEAD
git merge-base --is-ancestor ece507b36b530c7b78199341ff16f51c1075194d HEAD
git diff --name-status f5c3546..HEAD
```

Si aparecen cambios ajenos o una fuente distinta, conserva todo y compara antes de escribir. Sin reset/stash/clean/restore/force-push. En el checkout canónico los cambios ya están integrados en main: no hace falta cherry-pick ni copiar archivos selectivos. Si solo dispones de otra copia, identifica la divergencia, transfiere la cadena completa de forma controlada y verifica los mismos checks antes de cargarla.

Versiones intactas: visible0.9.9.1; iOS0.9.9/build43; iOS17; Android versionCode3; bundle work.joaquin.mano. Main sigue canal tienda con DEVELOPER=false e IDs AdMob iOS comerciales. CI de desarrollo cambia solo su copia a anuncios de prueba. No hay nueva IPA/APK/AAB; la IPA376855d es anterior y no contiene estas correcciones.

## 2. Qué debes preservar y comprobar

- R-00, cd717f9: las desapariciones tras borrado ya no fuerzan otra búsqueda completa de parecidas. SimilarityCoverage conserva cobertura solo de pasada completa, distingue cambios reales/revocación, rechaza callbacks tardíos y permite reintentos. Antes11 búsquedas/4180 IDs; después1/400 en10 ciclos sintéticos. Pesos/clasificación ya se retenían con resultados válidos; no reescribas indexer por el mock antiguo vacío. El P0 de lentitud física sigue abierto para Instruments.
- R-07,1bc2561: LIVE es play/pausa inline y bucle en carta; pausa muestra la miniatura/foto clave de PhotoKit, no frame detenido. Anclar muestra foto clave ampliable, play/pausa y timeline que permite pausar en cualquier punto. Sin reproductor independiente/fullscreen de Live. Reusa prepareVideo y caché existente mediante fullSizePairedVideo/pairedVideo, streaming por bloques con límites/cancelación/watchdog. Android no incorpora Live. Corrige carrera de intención entre tarjeta oculta y visor al llegar URL, pausa en preparación y visibilidad. La implementación Swift nueva NO se ha compilado.
- R-01: fallo nativo de álbum NO resuelto ni atribuido a onChange. Último run42438304068/job128601842759 sobre83ff731 pasó compilación arm64/oráculos y onboarding/acceso real/sesión en Duo27.1; falló Crear y añadir. Nuevo XCTest comprueba campo exacto/enabled/hittable/teclado y marcas de transacción solo con count/error-code. No contiene nombres/IDs ni bypass de Fotos. Lee NATIVE_FOLLOWUP para diagnosticar el próximo fallo.
- R-02: comprobados otra vez ZIP oficiales Ads13.12.0/UMP3.1.0 y sus SHA; manifiestos sin dominios. `check-apple-privacy.py --submission` sigue FAIL exit1, tracking=true/domains vacíos. No inventes dominios ni elimines tracking. Hace falta evidencia del proveedor/tráfico/Privacy Report. Políticas ES/EN y monetización confirmadas permanecen intactas.
- R-03: captura de fallo descubre los display IDs del error real de simctl y guarda PNG por pantalla/log; conserva el exit del smoke. Cuatro regresiones con diagnóstico grabado PASS; simctl real pendiente. Workflow retiene solo logs/PNG sintéticos siete días; no IPA ni fotos personales.
- R-04,ece507b: cuatro fallos Android reproducidos y corregidos: reconciliación que perdía favorita en cola, invalidación sin mutación, snapshot aceptado durante flush y undo perdido durante confirmación. Overlay de cola solo al reconciliar; invalidación en llamadas reales; acuse solo del valor enviado; marcador persistente de lote en curso antes de llamar al sistema, para conservar undo tras interrupción. Fallo de almacenamiento ya no registra éxito. Mantiene lotes Android y ejecución inmediata iOS.

No se cambian permisos, manifiesto de app, productos, anuncios, icono, personajes ni modelos. No hay nueva recopilación; diagnósticos locales sin contenido/IDs/títulos. CSS mínimo conserva controles aprobados;28 hashes protegidos intactos.

## 3. Inventario y pruebas ejecutadas

Lista completa A/M por ruta: docs/apple-readiness/CHANGED_FILES_2026-11-08.tsv (sin archivos eliminados). Contrástala con Git; evidencia y causas en FOLLOWUP_2026-11-08.md, R00_CYCLES.md, LIVE_PHOTO.md, NATIVE_FOLLOWUP.md y ANDROID_FAVORITES.md. Roadmap, estado, bitácora, matriz, checklist y RC apuntan al seguimiento actual. Evidencias cx021–cx025 dentro de docs/apple-readiness/evidence; logs completos locales en work/apple-readiness.

PASS:130 Node,14 configuración (6 Release/4 contratos/4 Sites),4 Python,69 navegador incl.8 runtime. TS,28 archivos protegidos, builds web/native-web, check-release y sync iOS Windows PASS.10 ciclos sintéticos repetidos PASS. Ningún resultado de Edge/Node equivale a PhotoKit, WebKit iOS, RAM/CPU de iPhone, VoiceOver o Duo real.

Repite desde mano con las dependencias existentes (no actualices versiones):

```text
npm test
npm run check:runtime
npm run build
npm run build:native
node --test tests/release.test.mjs tests/native-contract.test.mjs tests/sites-worker.test.mjs
node scripts/check-release.mjs
python -B -m unittest discover -s tests -p test_simulator_screens.py -v
```

Si npm no está en PATH, usa Node con los argumentos exactos del script test en package.json y los ejecutables tsc/vite existentes, como documenta FOLLOWUP. No uses pnpm para reinstalar/reemplazar node_modules. Con servidor propio Vite127.0.0.1:4186, ejecuta apple-readiness.mjs, apple-safety.mjs, rc-flow.mjs, rc-accessibility.mjs, similarity-flow.mjs, live-photo-flow.mjs y android-favorite-flow.mjs. Diez ciclos con LEAK_MEASURED=1 y LEAK_ASSERT_INCREMENTAL=1, luego `node tests/leak-cycles.mjs 10`. Guarda resultados en carpeta nueva; no sobrescribas el antes/después de Codex.

## 4. Carga y verificación

Carga primero la web con el procedimiento habitual del proyecto, sin montar chrome simulado en iPhone. Para servir compilación estática local puedes usar desde mano: `node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4184 --strictPort`, solo si el puerto está libre. Verifica en HTTP los bytes/hash del JS servido contra dist y registra URL, fuente/commit y hash; una página ya abierta o build antiguo no es evidencia de carga nueva. Prueba LIVE/timeline, favoritas/undo/revisión y consola con fixtures. Mantén separada la aceptación visual del usuario.

Si cargas únicamente web, dilo expresamente. Para nativo no uses la IPA anterior como si fuera esta entrega. Sin macOS/Xcode no puedes certificar Swift nuevo. Prepara/ejecuta el gate mediante Mac o el workflow manual gratuito rc-native-gate.yml después de que el usuario autorice push y dispatch. No hagas publicaciones, uploads, cambios de cuentas/certificados ni distribución externa sin esa autorización. No se necesitan secretos por chat. Al encolar CI, entrega ID/enlace/SHA y estado real; no dupliques ejecuciones ni declares PASS antes del resultado.

Después del gate: diagnostica el álbum con marcas INPUT_MISMATCH/SAVE_DISABLED/READY/CREATE_BEGIN/CREATE_FAILED/CREATE_OK, conserva todos los asserts de avance/relectura y ambas capturas. Prueba Live Photo real original/editada/iCloud y foto clave, permisos y borrado solo con biblioteca de fixtures efímera. R-00 necesita10 ciclos físicos con Instruments; R-04 diálogo/foreground/muerte real Android. Publicación política no verificada de nuevo: HTTP403 en este entorno; no implica caída global, requiere comprobar tras despliegue autorizado. Firma/sandbox/TestFlight/ASC siguen pendientes.

No modifiques identidad visual, animaciones, Coqui/Memo, lettering, monetización, mínimo17, hash-lock ni correcciones previas. No introduzcas Personas, reconocimiento avanzado, Breakup Mode, otros modelos/servicios ni una nueva versión visual. Tu responsabilidad es integrar/cargar/verificar.

Al cerrar, actualiza roadmap (estado con evidencia y línea de avance), CLAUDE_LOG y CURRENT_STATE. Informa ruta, rama y SHA integrado, versiones, método de carga, plataforma, hash servido, resultados y diferencias. Si solo hay web o falta una herramienta, dilo sin declarar la integración nativa o el envío completos.
