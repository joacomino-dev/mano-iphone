# Plan de validación reproducible

RC: añadir6 tests Release y nuevos10 flujos/6 escenarios accesibles. [Comandos y evidencia](evidence/rc/README.md), [gate Mac/archivo](NATIVE_GATE.md) y [checklist de envío](APP_STORE_SUBMISSION_CHECKLIST.md). El gate estricto de privacidad devuelve FAIL ante dominios ausentes; no omitirlo.

2026-11-07 · cada ejecución debe identificar SHA y diff, canal, versión/build,
herramientas, modelo/OS, permisos, fixtures y resultado. No usar fotos personales
para QA destructiva ni subir medios, cachés, sesiones, certificados o diagnósticos
con identificadores. Los datos de prueba de esta entrega son postales sintéticas.

## 1. Baseline y regresión local

En la raíz: `git status --short --branch`, `git rev-parse HEAD` y
`git ls-remote origin refs/heads/main`. Comparar con [baseline](evidence/baseline.json)
antes de escribir. Si hay trabajo nuevo de otro escritor, preservar ambas
versiones y detener solo la escritura en conflicto. No reset/stash/clean/restore.

Desde `mano/`, con dependencias **ya instaladas**:

```powershell
pnpm test
node scripts/check-mobile-runtime.mjs
node node_modules/typescript/bin/tsc
node node_modules/vite/bin/vite.js build
node scripts/prepare-sites-build.mjs
node --test tests/sites-worker.test.mjs
node node_modules/vite/bin/vite.js build --config vite.native.config.ts
node scripts/prepare-native.mjs
```

Detener la secuencia ante cualquier exit distinto de cero. Con npm disponible,
los comandos canónicos son `npm test`, `npm run check:runtime`, `npm run build`,
`npm run build:native`; no omitir el checker previo. El build native de estos
comandos genera web assets: **no compila Swift**.

## 2. Contratos y layouts con navegador

Hay un runner nuevo, independiente de la suite del runtime protegido. Requiere
Playwright existente y Edge instalado; no instala navegador ni paquetes.
Iniciar el Vite local desde `mano/` (el agente lo ejecutó durante esta tarea):

```powershell
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4186 --strictPort
```

En otra terminal, también `mano/`:

```powershell
node tests/apple-readiness.mjs
```

Por defecto usa `http://127.0.0.1:4186/native.html`, canal msedge y escribe en
`../work/apple-readiness/web`. Variables opcionales: `APPLE_AUDIT_URL`,
`APPLE_AUDIT_OUTPUT`, `APPLE_BROWSER_CHANNEL`, `APPLE_AUDIT_MATCH` (subcadena).
`--contracts-only` omite capturas de layouts. El proceso devuelve 1 si falla una
aserción; no convertir fallos en skips para cerrar un gate.

Fixture `tests/apple-fixture.mjs`: `window.Capacitor` ficticio antes de importar
la app, sin acceso PhotoKit. Bibliotecas de 3 postales o un vídeo demo, sin anuncios,
precios reales ni compras. La reducción de permisos, cancelación, error, parcial
y éxito se controlan explícitamente. Se retrasa una consulta para comprobar que
no contradiga un borrado confirmado. Se ejecuta ManoApp real, no una copia del
algoritmo de la corrección. No equiparar un callback ficticio a la confirmación
del sistema.

La suite original `npm run test:runtime` conserva su configuración y hashes;
no fue ejecutada aquí (npm y navegador Chromium configurado no disponibles).
Los nuevos tests no sustituyen esa suite ni XCTest/VoiceOver.

## 3. Inventario macOS y compilación del diff

Ejecutar en macOS/runner gratuito estándar confirmado, sin publicar ni firmar
hasta que la entrega concreta esté autorizada. Guardar salidas, no solo nombres
del workflow:

```bash
xcodebuild -version
xcodebuild -showsdks
xcrun simctl list runtimes -j
xcrun simctl list devicetypes -j
xcrun simctl list devices available -j
```

Resolver dependencias desde lock, registrar Package.resolved real y checksum de
SDKs; comparar con resolución base (Capacitor 8.6.0, Ads 13.12.0, UMP 3.1.0).
Ejecutar gates canónicos, luego `npm run sync:ios`; revisar fuentes generadas y
confirmar que no cambien bundle, claves, permisos, mínimo ni canal sin intención.

```bash
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -sdk iphoneos -destination 'generic/platform=iOS' -derivedDataPath build/apple-qa \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY='' build
```

Esto verifica compilación sin firma del diff. No se ejecutó sobre esta entrega.
La CI consultada corresponde a la base anterior. No publicar cambios ni iniciar
runs duplicados como sustituto de revisión; al iniciar CI, confirmar una vez su
estado y dejar el resultado pendiente según la preferencia de coordinación.

## 4. Matriz de simuladores

Usar un runner/dispositivo **desechable dedicado** con fotos generadas. Los scripts
actuales pueden elegir el primer simulador y reiniciar CoreSimulator: no lanzarlos
sin inspección en un Mac con simuladores de trabajo del usuario. No asumir que
un runtime listado soporta un modelo de fábrica más reciente.

| Cohorte | Selección requerida | Casos obligatorios |
| --- | --- | --- |
| Mínimo | iOS 17 + SE/compacto disponible; si Xcode 27 no lo ejecuta, toolchain compatible separado | Instalación, permisos, fuente sin estética, todos los flujos locales |
| iOS 18 | Compacto + grande | Estética disponible/fallo, texto ampliado, vídeos y Live Photos |
| iOS 26 | Island + SE si runtime lo ofrece | Safe areas, sheets, teclado y permisos revocados |
| iOS 27.1 | 18 Pro y Pro Max si disponibles | Geometría, PhotoKit/Vision, memoria y ciclo de vida |
| Duo 27.1 | Device Hub, cerrado/abierto/libro/sentado y ambas orientaciones | Cámara, regiones reservadas, Split View, continuidad de carta/zoom/vídeo/hojas/Ads |

`scripts/test-ios-simulator.sh` y `ManoUITests/PhotosSmokeTests.swift` son el punto
de partida para sembrar medios y gate de Fotos. Sus selectores deben contrastarse
con build 43 antes de exigirlos: el workflow automático actual solo prueba arranque.
`scripts/test-development-startup.sh` verifica reset explícito y reapertura; no
concede permiso Fotos. Ninguno cubre por sí solo los casos destructivos siguientes.

Añadir al gate nativo: modelo/OS/SDK explícitos en selection.json, xcresult,
capturas demo y reporte de las siguientes operaciones. Mantener tiempos acotados,
no sustituir permisos reales por marcadores, pregrants o success falsos.

## 5. Seguridad de PhotoKit y ciclo de vida

| Caso | Procedimiento con fixtures | Criterio de aceptación |
| --- | --- | --- |
| Full/limited/denied/restricted | Arranque fresco y cambio desde Ajustes; limited con 0/1/N; cambiar el conjunto sin cambiar status | Solo elementos actuales; pantalla clara; no superficies con datos revocados |
| Revocar con operaciones abiertas | Revisión/inspector/álbum, descarga, búsqueda y retorno | Sin crash, decisiones conservadas, operación no autorizada no confirmada |
| Cancelar borrado | Encolar fotos/vídeos/Live; revisión; negar diálogo iOS | Cola y bytes intactos, cero eliminados, sin falso éxito |
| Fallo real de Photos | Reproducir permisos/disponibilidad que causen rechazo; guardar NSError sanitizado | Error visible, cola recuperable, nada contabilizado sin éxito |
| Éxito/parcial | Mezcla de ordinarias, favorita/oculta cambiada externamente y elemento ya ausente | Solo IDs confirmados; restantes en cola; favorita/oculta protegidas |
| Reconciliación concurrente | Retorno/consulta lenta durante confirmación; añadir/eliminar fuera de app | Snapshot antiguo no resucita borrados ni invalida undo |
| Recuperación | Recuperar uno/todos de cola y undo 30 decisiones mixtas; restaurar fixture desde Recently Deleted | Mismo asset/mano/selección/orden; no confundir undo previo con restauración del sistema |
| Interrupciones | Suspender, terminar proceso a 0/100/350/500 ms de decisión, durante write y tras confirmación | Envelope consistente; cuantificar pérdida reciente, nunca borrar por reabrir |
| Disco/cuota | Casi sin espacio, localStorage rechazado, caché evictada a mitad de sesión | Aviso persistente, originales intactos, progreso anterior legible |

Nunca vaciar Recently Deleted de una biblioteca personal. Las pruebas iCloud
destructivas necesitan dispositivo/cuenta de pruebas con medios sintéticos.

## 6. Multimedia, bibliotecas grandes y recursos

| Conjunto / condición | Validación requerida |
| --- | --- |
| Fotos JPEG/HEIC/RAW, retratos, editadas, panoramas, Live | Proporción, metadatos, calidad local/preview/original, favoritas y compartir explícito |
| Vídeo H.264/HEVC, HDR, lento, 4K, >512 MiB | Póster, inline/fallback, sonido/pausa/tiempo al anclar/cerrar; cancelación y límite claro |
| Local / iCloud optimizado / red lenta / modo avión | Progreso real, no bloquear local, retry/cancel, no confundir preview con original |
| 1k/10k/50k assets, 1000 descartes | Arranque, primera carta, fluidez, rejilla virtualizada, indexación incremental/cancelación |
| Presión de memoria y disco | Instruments Allocations/VM/Leaks, Memory Graph y registro de máximos; caché en reposo/tras sesión |
| Batería/CPU/térmica | Energy/CPU en equipo pequeño y reciente, tanda 15 min y suspensión; no fijar presupuesto ficticio sin baseline |
| Parecidas y limpieza | Dataset sintético etiquetado, precisión/omisiones por cohorte, edición/eliminación mientras indexa; caras solo como señal local |

## 7. TestFlight y publicación

Después de los gates anteriores: archivo **firmado** del canal `release`, informe
de privacidad agregado y validación de App Store Connect. Probar por TestFlight
al menos un SE/compacto, un estándar, un Max y un Duo accesible; anotar los
dispositivos realmente usados. Si no hay Duo físico, mantener ese límite explícito.

Sandbox: compras de año/vitalicio/café, pending/cancelación, restauración, reembolso,
caducidad y dos dispositivos; ATT/UMP en mercados representativos; red offline;
VoiceOver/Switch Control/Reduce Motion/tamaños máximos; 7 idiomas y RTL. No hacer
compras reales ni cambiar cuentas del usuario como parte de una prueba automatizada.

Salida: cero P0 abiertos y P1 aplicables cerrados con evidencia; problemas P2
documentados/aceptados; compatibilidad/marketing coinciden con lo probado; campos,
cuentas y contratos reales completos. Publicación requiere autorización separada.

## Comandos añadidos y ejecutados en Fase 2

Con Vite existente en4186, desde mano:

```powershell
node tests/apple-safety.mjs
node --experimental-strip-types --test tests/native-contract.test.mjs
node node_modules/@playwright/test/cli.js test --config playwright.apple.config.ts --reporter=line
node --experimental-strip-types --expose-gc tests/benchmark-apple-readiness.mjs
```

`apple-safety` usa las mismas variables de URL/browser/output y filtro de nombre
de la suite inicial. El benchmark acepta APPLE_PERF_OUTPUT. El config runtime
solo cambia canal a Edge y reutiliza servidor; no cambia aserciones/tiempos ni el
runtime. Son pruebas de navegador o estáticas, nunca PhotoKit simulado como real.

Se preparó `bash scripts/validate-apple-native.sh`: en este Windows devuelve78,
NO VERIFICABLE. Ver [PHASE2](PHASE2.md) y [TESTFLIGHT](TESTFLIGHT.md). El antiguo
“test:runtime no ejecutado” de Fase1 ya tiene resultado nuevo en perfil Edge:8/8.
