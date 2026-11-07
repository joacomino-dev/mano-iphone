# Gate macOS, archivo y distribución

Preparado 2026-11-07. **BLOCKED en Windows**: no Xcode, Swift/Apple SDK, simulador,
Keychain de firma ni dispositivo Apple conectado. Syntax de scripts comprobada;
ejecutarlos aquí devuelve78, no PASS nativo. Una sincronización Capacitor en
Windows sí pasó; copia/generación de fuentes no compila Swift.

## 1. Llevar el SHA candidato a un entorno Apple

Utilizar un Mac propio/prestado con macOS compatible con Xcode27.1 estable, o
preparar el workflow manual público gratuito. No se presupone que exista un Mac.
Conservar el SHA íntegro y el diff; no mezclar código de la rama release antigua
por encima de esta RC. Antes de cualquier integración/push, revisión y permiso.

Desde raíz en macOS, usando herramientas instaladas por el propietario:

```bash
git rev-parse HEAD
git status --short
xcodebuild -version
xcodebuild -showsdks
xcrun simctl list devices available
node --version
npm --version
cd mano
npm ci --no-audit --no-fund
bash scripts/validate-apple-native.sh
open ios/App/App.xcodeproj
```

Node22+ compatible con strip-types, package-lock existente, sin actualizar SDKs.
El gate corre Node/runtime28, contratos estáticos, Release, dos oráculos Swift,
sync Capacitor, build Release arm64 sin firma, recursos/locales/manifiestos y guarda
Package.resolved e inventario en `mano/build/apple-readiness/`. Si falla, conservar
log y detenerse; no crear marcadores Photos ni omitir autorización para pasarlo.

**PASS del gate no valida eliminación, permisos, iCloud, memoria ni firma.**
La prueba PhotoKit existente solo lectura/vídeo se ejecuta automáticamente en
runner desechable con `--simulator-smoke`. Su script legado limpia cachés globales
SwiftPM y está restringido a GitHub-hosted. No ejecutarlo en Mac personal.

## 2. Simulador desechable, pruebas reales de Fotos

Inventariar device types y runtimes reales; elegir los IDs de la lista, sin
inventar presets Duo ni asumir que runtimes17/18 pueden ejecutarse en cualquier Mac.

```bash
xcrun simctl list devicetypes
xcrun simctl list runtimes
# Sustituir por IDs existentes obtenidos arriba.
SIM_UDID=$(xcrun simctl create CocoWash-RC-QA "$DEVICE_TYPE_ID" "$RUNTIME_ID")
xcrun simctl boot "$SIM_UDID"
xcrun simctl bootstatus "$SIM_UDID" -b
# Importar SOLO el directorio generado de fixtures, nunca la fototeca personal.
find "$FIXTURE_DIRECTORY" -name '*.png' -print0 | xargs -0 -n 100 xcrun simctl addmedia "$SIM_UDID"
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug \
  -destination "platform=iOS Simulator,id=$SIM_UDID" \
  -derivedDataPath build/rc-simulator CODE_SIGNING_ALLOWED=NO build-for-testing
xcodebuild -project ios/App/App.xcodeproj -scheme App \
  -destination "platform=iOS Simulator,id=$SIM_UDID" \
  -derivedDataPath build/rc-simulator -resultBundlePath build/rc-photos.xcresult \
  CODE_SIGNING_ALLOWED=NO test-without-building
```

Estos comandos están **NOT TESTED** aquí; observar errores del toolchain. El test
existente necesita sus fixtures específicos de `scripts/test-ios-simulator.sh`:
no interpretar un fallo por fixtures ausentes como fallo de PhotoKit. En CI usar
el wrapper íntegro, que genera medios y permisos a través del sistema.

Generación reproducible, desde raíz:
`python3 scripts/generate-apple-fixtures.py --count 1000 --output work/qa-1000`.
Repetir en directorios nuevos con10000/50000 según recursos. Rechaza sobreescritura;
genera manifiesto y hashes, sin tocar Fotos. Son patrones PNG de baja resolución:
sirven para enumeración/índices/colas, **no** sustituyen una biblioteca representativa
de fotos de cámara, HEIC/RAW/HDR, Live Photos, vídeos grandes o iCloud. Esos formatos
necesitan fixtures adicionales de QA en Mac/dispositivo. La smoke existente genera vídeo.

Destrucción nativa sigue **BLOCKED**: ejecutar manualmente la tabla de
[TESTFLIGHT](TESTFLIGHT.md) y [TEST_PLAN](TEST_PLAN.md). Cancelar, confirmar, favorita
externa, asset ausente, permiso revocado, cierre antes/después de confirmar; contrastar
contadores/cola con Fotos. Nunca aceptar la confirmación sobre biblioteca personal.
Un error de PhotoKit no se fabrica en producción para convertir una prueba en PASS.

Después de QA, apagar/eliminar únicamente el UUID creado en esa sesión tras
verificar su nombre CocoWash-RC-QA en `simctl list`. No borrar simuladores ajenos.
No usar comandos masivos de limpieza de simuladores/cachés en un Mac personal.

## 3. Dispositivos, Duo y rendimiento

Completar modelo/OS real, SHA/build, biblioteca sintética y resultados en
[plantilla](device-results.template.csv). Matriz: [COMPATIBILITY](COMPATIBILITY.md).
Probar mínimo17 real, compacto, estándar Island, Pro Max y Duo27.1 cuando disponibles.
En Device Hub27.1: cerrado/abierto, giros, pliegue, Split View, exterior↔interior,
permisos/revisión/inspector/vídeo/anuncio abiertos. Verificar insets asimétricos,
regiones de cámara/barra y continuidad de selección/undo. No declarar optimización
Duo por compilar con27.1. CocoWash conserva retrato en su configuración inicial;
comprobar comportamiento de orientación real del dispositivo especial.

En Instruments: Allocations/Leaks/VM Tracker, Time Profiler y Energy, seleccionados
de los templates realmente disponibles (`xcrun xctrace list templates`). Registrar
baseline/reposo, apertura, 1k/10k/50k, 30min de tarjetas, vídeo/iCloud/review, background,
reanudación y presión de memoria. Anotar memoria pico y estable, CPU, energía,
disco/cachés, tiempos y estado térmico; comparar mismo hardware/medios/build.
No hay métricas iPhone medidas en Windows. Node sintético sirve para coste de
metadatos, no para decodificación, batería, fluidez o límites de memoria de iOS.

## 4. Firma y exportación locales

Antes: cuenta Developer activa, App ID explícito `work.joaquin.mano`, equipo válido,
distribución App Store y perfiles/certificados **existentes** preparados en Keychain.
No solicitar claves privadas por chat. Revisar capabilities/entitlements necesarios;
PhotoKit no requiere añadir iCloud entitlement solo para originales de la fototeca.
No activar capacidades ajenas para resolver un error de firma.

El titular verifica en ASC versión/build libres. La fuente conserva0.9.9/build43;
sync ya no reescribe versiones a43. Archivo usa overrides elegidos por el titular.
Copiar `docs/apple-readiness/ExportOptions.example.plist` a una ruta privada local,
reemplazar el Team ID real y revisar opciones según `xcodebuild -help` del Xcode
instalado. El ejemplo hace **export local**, no upload; no contiene credenciales.

```bash
cd mano
export COCOWASH_TEAM_ID='TEAM_ID_REAL'
export COCOWASH_VERSION='VERSION_ELEGIDA'
export COCOWASH_BUILD='BUILD_NO_UTILIZADO'
export COCOWASH_EXPORT_OPTIONS='/ruta/privada/ExportOptions.plist'
COCOWASH_SIGNING_AUTHORIZED=YES bash scripts/archive-apple-release.sh
```

Los valores de arriba son marcadores para sustituir, no datos configurados.
Script exige autorización local explícita, valida método/destino/equipo, build,
bundle/min17/IDs, flags de desarrollo, firma, entitlements y perfil App Store.
No usa `-allowProvisioningUpdates`, no obtiene certificados ni sube archivos.
**NOT TESTED**: la sintaxis Bash no acredita que Xcode firme o exporte el proyecto.
Revisar caducidad de perfil/certificado y firma de cada SDK en Organizer/Xcode.
Generar Privacy Report y comprobar todas las localizaciones, icono y launch screen
del archivo. No subir perfiles, datos de firma o diagnósticos personales al repo público.

## 5. CI sin Mac: alternativa preparada, no activada

`.github/workflows/rc-native-gate.yml`: dispatch manual, solo repositorio público,
runner estándar `xcode-27`, Xcode27.1, permisos `contents:read`, checkout sin credencial
persistente; sin secretos Apple. Guarda logs de fixtures siete días, no un IPA.
No se hizo push ni se inició CI. La disponibilidad del runner debe verificarse
en la ejecución; si falta Xcode/runtime, conservar BLOCKED y no cambiar a runner pago.

[GitHub runner-images](https://github.com/actions/runner-images) y
[facturación](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
documentan los runners/condiciones: el estándar público es la vía gratuita elegida;
larger runners y repos privados pueden facturar. No configurar cuotas o servicios.
[Xcode Cloud](https://developer.apple.com/xcode-cloud/get-started/) incluye25h/mes
con Developer Program, pero necesita configuración inicial en Xcode y cuenta/roles;
no resuelve por sí solo el arranque sin Mac y no se activó. Horas adicionales son
de pago y quedan excluidas. Credenciales Apple solo en Keychain o mecanismo seguro
configurado por el propietario, nunca en YAML ni texto plano.

## 6. TestFlight y App Review

Seguir [checklist operativo](APP_STORE_SUBMISSION_CHECKLIST.md). Organizer/Transporter
pueden validar/subir a Apple: requieren autorización externa separada. No hacer
upload por tener un IPA local. Tras procesado, beta interna → pruebas físicas →
beta externa (posible Beta App Review) → envío App Review manual autorizado.
