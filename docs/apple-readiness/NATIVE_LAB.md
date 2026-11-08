# Laboratorio nativo estratégico — 2026-11-08

Estado: **NOT TESTED** los diez ciclos completos. El probe PhotoKit independiente
[42489613346](https://github.com/joacomino-dev/mano-iphone/actions/runs/42489613346)
sí **PASS**:64 importaciones,3 Live Photos y3 recursos emparejados en18Pro/iOS27.2.
Esto no prueba aún reproducción, zoom o foto clave dentro de CocoWash.

## Propiedad y seguridad

`rc-native-gate.yml` crea un simulador nuevo y habilita un contrato únicamente en
el bundle UITest, ligado a su UUID y run. El contrato del repositorio está
deshabilitado. El helper exige macOS, runner GitHub alojado y nombre del simulador
de ese mismo run. No concede permisos a CocoWash: el onboarding y el diálogo real
siguen siendo obligatorios. Solo el seeder separado recibe permiso automatizado.

Se importan60 fotografías,3 Live y1 vídeo, generados desde el PNG público. El
helper conserva sus identificadores únicamente dentro de su contenedor efímero,
fuera de artefactos. Al finalizar reconsulta PhotoKit: cero elementos desconocidos
y exactamente diez ausentes. No se ejecuta en un iPhone personal.

## Medición y aceptación

XCTest usa `XCTMemoryMetric(application:)` y `XCTCPUMetric(application:)`,10
iteraciones medidas y una inicial sin borrado. La documentación de Apple indica
que `iterationCount+1` ejecuciones descartan la primera; se comprueba también el
número exacto de rondas para detectar un cambio de semántica.

El colector del host mide RSS/tiempo acumulado de CPU del ejecutable instalado y
WebContent asociado al UUID (entorno examinado solo en memoria o archivos abiertos).
No almacena entornos, cabeceras, cuerpos de red ni credenciales. RSS puede contar
páginas compartidas; no equivale al footprint de Instruments ni a PSS de Android.
Un proceso no atribuible o contador ausente bloquea la aceptación.

Presupuestos declarados **antes de obtener la primera serie completa** en
`scripts/evaluate-native-cycles.py`: mediana final contra inicial ≤24MiB, pendiente
de memoria desde ronda2 ≤1MiB/ronda; CPU en reposo final ≤15% de un núcleo y aumento
≤5 puntos porcentuales. La primera revisión puede calentar cachés: se permiten
dos rondas iniciales antes de evaluar la pendiente. Los límites detectan una
regresión sostenida sobre esta pequeña biblioteca; no prueban ausencia universal
de fugas ni capacidad para decenas de miles de originales. No ajustar para hacer
pasar una serie fallida: investigar su causa. Hardware e Instruments siguen aparte.

Siete pruebas sintéticas del evaluador PASS: estable, muestra ausente, renderer
desconocido, CPU ausente/negativa, crecimiento sostenido y CPU alta. Son pruebas
del gate, **no mediciones de CocoWash**.

## Reproducir

1. Despachar `rc-native-gate.yml`, main/SHA exacto, `simulator=standard` y luego
   `auto` para la variante Duo. Runner público estándar xcode-27, Xcode27.1.
2. Leer `ui-test.log`, `photos-read.log`, `native-cycles.json`, `fixtures/photokit-*.json`
   y el xcresult completo. Rechazar missing markers o aserciones fallidas.
3. Exportar métricas y attachments con `xcresulttool` del mismo Xcode. Las capturas
   posteriores a teardown no sustituyen los attachments durante el test.
4. Android: workflow `build-android.yml`, script `android-native-cycles.mjs` tras
   E2E base. Fixture de vídeo debe pasar ffprobe(2.9–3.1s) y plugin(duration>0).
   PSS/CPU se recogen en Android; atribución de renderer todavía **PENDIENTE**.
5. En Windows: `python -B -m unittest discover -s scripts/tests -p test_native_cycle_budget.py -v`.

Referencias oficiales:
[XCTest](https://developer.apple.com/documentation/xctest/performance-tests),
[iteraciones](https://developer.apple.com/documentation/xctest/xctmeasureoptions/iterationcount),
[recursos Live](https://developer.apple.com/documentation/photos/phassetcreationrequest).
