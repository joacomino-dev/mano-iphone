# Auditoría técnica inicial

Inspección de 2026-11-07 sobre la base identificada en [README](README.md).
Este documento separa la fuente inicial de las correcciones posteriores.

## Base y herramientas

`HEAD` inicial y `main` remoto: `691cded44bbb39bc4c8fa1ddfd1889a69e2b62a9`.
El diff de `mano/` y workflows entre `5e620b4` y ese HEAD es vacío; el último
commit solo documenta build 43. Rama local existente `claude/cocowash-9.8.6`.
No se crearon ramas/worktrees ni se cambió el índice. Inventario en
[evidence/baseline.json](evidence/baseline.json).

Windows: Node 24.22.1, pnpm 11.25.0. npm, xcodebuild y xcrun no están en PATH.
Se usaron las dependencias existentes; no se instaló nada. El wrapper
`pnpm run build` falla porque su prebuild invoca npm; los pasos equivalentes,
incluido el checker previo, pasan. Esto es una limitación del entorno Windows.

| Dependencia | package / lock / instalada | Método |
| --- | --- | --- |
| React / React DOM | 19.2.7 / 19.2.7 / 19.2.7 | Lectura de los tres manifiestos |
| TypeScript | 7.0.2 / 7.0.2 / 7.0.2 | Igual; compilador ejecutado |
| Capacitor CLI, core, iOS | 8.6.0 en los tres | Igual; SPM exacto 8.6.0 en fuente y CI |
| Vite / plugin React | 8.1.3 / 6.0.3 | Declaración, lock e instalación coinciden; builds ejecutados |
| Motion / use-gesture | 12.42.2 / 10.3.1 | Manifiestos coinciden |
| Radix Dialog / Dropdown / Icons | 1.1.19 / 2.1.20 / 1.3.2 | Manifiestos coinciden |
| Phosphor React | 2.1.10 | Manifiestos coinciden |
| IBM Plex Mono y Sans / Roboto | 5.3.0 / 5.2.10 | Manifiestos coinciden; recursos locales |
| Playwright / tipos React / tipos React DOM | 1.61.1 / 19.2.17 / 19.2.3 | Manifiestos coinciden |
| Google Mobile Ads | 13.12.0 | Exacto en project.pbxproj; resolución y compilación en CI |
| Google UMP | 3.1.0 resuelto en CI | Transitivo de Mobile Ads; no Package.resolved seguido |

No se observa una incompatibilidad de build entre estas versiones en las pruebas
ejecutadas. No se ha acreditado ausencia de vulnerabilidades, soporte futuro o
última versión de cada paquete. No se justificó ninguna actualización mayor.
La resolución SPM transitiva sin lock seguido reduce reproducibilidad: guardar
la resolución real al producir el archivo, sin inventar pins o checksums.

## iOS, Xcode y destinos

**VERIFICADO en fuente:** `IPHONEOS_DEPLOYMENT_TARGET=17.0` en configuraciones
Debug/Release y tests; `CapApp-SPM/Package.swift` exige `.iOS(.v17)` y
`configure-ios.mjs` vuelve a fijar 17. `TARGETED_DEVICE_FAMILY=1` (iPhone),
`UIRequiredDeviceCapabilities=[arm64]`, SDKROOT iphoneos, Swift language mode 5.0.
Bundle `work.joaquin.mano`, firma automática declarada, sin equipo/certificado
de distribución acreditado. Orientación iPhone portrait; no múltiples escenas.
Los ajustes de iPad del plist no convierten el target en universal.

**VERIFICADO remoto:** logs de
[desarrollo 42385089470](https://github.com/joacomino-dev/mano-iphone/actions/runs/42385089470)
en `5e620b4`, y
[release 42385092530](https://github.com/joacomino-dev/mano-iphone/actions/runs/42385092530)
en `4c43d0c07c363901739b366914cb5a00dac65b66`: ambos success, build arm64 sin
firma, `SDKROOT=iphoneos27.1`, ruta Xcode_27.1.app. Desarrollo además ejecuta
oráculos Swift y el smoke de arranque/reapertura sin acceso a Fotos. El script
elige el primer iPhone disponible; no se obtuvo un modelo/runtime inequívoco del
registro, por lo que no se acredita ningún modelo concreto.

**NO VERIFICABLE localmente:** inventario de Xcodes/SDKs instalados en macOS,
simuladores Duo disponibles y ejecución nativa de este diff. La tabla pública de
Apple describe herramientas disponibles para descarga, no herramientas presentes
en este Windows ni autorización para un runner específico.

Capacitor 8 soporta iOS 15 y requiere Xcode 26+, pero no reduce el mínimo de la
app. Los Package.swift oficiales de Mobile Ads 13.12 y UMP 3.1 declaran mínimos
13 y 12 respectivamente. No obligan a subir de 17, ni prueban que todo el código
de CocoWash funcione en 15. Conservar 17 es la decisión provisional hasta QA.

## Arquitectura y API efectivamente presentes

| Archivo / framework | Uso observado | Límites |
| --- | --- | --- |
| native.tsx / Capacitor / WebKit | ManoApp directa en WKWebView; sin marco simulado; esquema cocowash-media y CSP local | Navegador Edge no acredita WebKit |
| PhotoLibrary.swift / Photos, PhotosUI | Autorización readWrite; limited picker; enumeración; favoritas; álbumes; borrado; PHLivePhotoView | Acceso denegado impide operaciones nativas; QA de permisos real pendiente |
| Vision | Feature prints y firma visual para parecidas; OCR, rectángulos de caras, nitidez/luminancia; estética en iOS 18+ con fallback si falla | No identificación de personas en la versión actual; estética opcional |
| AVFoundation / AVKit | Preparación de vídeo y fallback nativo, copias en caché, reproducción de Live Photos | Codecs, HDR, iCloud y continuidad requieren hardware |
| ImageIO / UniformTypeIdentifiers | Metadatos/EXIF y formatos locales | No garantiza todos los RAW/HEIF/medios editados |
| CoreLocation | Geocodificación de coordenadas de assets redondeadas, bajo ajuste de ubicación | Servicio de Apple con red; no es completamente local |
| CryptoKit / Foundation | SHA256 para cachés, UserDefaults y archivos derivados | No cambia originales de Fotos |
| CocoMonetization.swift | StoreKit 2, ATT, Google Mobile Ads, UMP | Ads tienen tráfico externo; compras requieren catálogo real/sandbox |
| DevelopmentSafety / SceneDelegate | Limpieza de Personas retirado y reset de desarrollo solo con flag explícito | Mantener flag de reset fuera del archivo de tienda |

No se encontró cámara/Face ID/TrueDepth/LiDAR requerido para el flujo principal.
Apple Intelligence no es requisito del producto. La puntuación estética puede
estar ausente en iOS 17 o hardware no compatible. La detección de caras usada
como señal local de calidad/texto no equivale a reconocimiento de identidades.

## Seguridad de datos y rendimiento: fuente frente a ejecución

`deleteAssets` vuelve a obtener PHAsset, excluye favoritas/ocultas y llama a
`performChanges`. `change` solo resuelve el resultado si `success=true`; cancelación
3072 rechaza con CANCELLED. `commitDelete` cuenta únicamente `result.deleted`.
Las pruebas ficticias verifican que error/cancelación no vacían la cola ni suman
espacio. No prueban el diálogo, la atomicidad o errores reales de PhotoKit.

Sesión/registro se guardan en un envelope autoritativo; el espejo legado se
escribe después. Tests existentes incluyen cuota, fallo de almacenamiento,
50.000 marcas, undo de 30 decisiones y orden exacto. Se agrupan escrituras hasta
350 ms y se fuerzan al ocultar/pagehide. Un cierre abrupto antes de persistir
puede perder decisiones recientes: pendiente medir; no es una garantía de cero
pérdida ni motivo para cambiar ahora el formato de almacenamiento.

Hay colas de dos solicitudes, review virtualizado, presupuestos y cancelación.
Vídeo: caché nativa 1 GiB, máximo 512 MiB por archivo; precarga JS 256 MiB para
vídeos de fondo. Vista visible tiene su propia admisión. Miniaturas: límite
configurable acotado a 600 MiB, por defecto nativo 300 MiB. Estos son límites de
archivos/planificación, **no mediciones de RAM** ni garantías de almacenamiento
libre. No se midieron RAM, CPU, batería, temperatura o velocidad en hardware.

La biblioteca se enumera entera en nativo y se entrega a JS; las parecidas retienen
observaciones derivadas durante el análisis. Quedan pendientes carga real de
10k/50k, memoria en equipos de pocos recursos, presión de caché y cancelación.

## Distribución

`main` es canal de desarrollo: DEVELOPER=true e IDs de prueba. `release` tiene
DEVELOPER=false (archivo consultado en su SHA remoto) y CI comprueba IDs reales,
sin flags de reset/test ads. No convertir este checkout en tienda cambiando IDs.
La CI actual hace `build` sin firma; no `archive`/export App Store ni upload.
No acredita Developer Program, provisioning, contrato comercial o TestFlight.

Manifest propio: tracking declarado; UserDefaults CA92.1 y timestamps C617.1;
resource registrado en Xcode. Los manifiestos de terceros y sus firmas deben
inspeccionarse agregados en el archivo final. Hay traducciones web y
InfoPlist.strings en es/en/fr/de/it/ar/ja, registradas como recursos localizados,
y configuración CocoWash.storekit. Catálogo comercial, restauración y localización
del prompt nativo siguen pendientes de ejecución.

Resultados iniciales y finales: [evidence](evidence/README.md).
