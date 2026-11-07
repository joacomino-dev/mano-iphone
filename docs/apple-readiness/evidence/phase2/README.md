# Recibos de Fase 2 — CW-CX-019

2026-11-07. No medios personales, SDKs simulados como reales, firma o distribución.

- [checkpoint-web.json](checkpoint-web.json): 19 escenarios repetidos antes de modificar la Fase1 y crear `9ff2734`.
- [safety-before.json](safety-before.json): dos fallos reales de manual refresh/Recuperar pendiente, después de corregir el selector del propio test.
- [permission-before.json](permission-before.json): revocación pendiente descartada después de confirmar una mutación.
- [safety-final.json](safety-final.json): 9 casos ampliados, todos PASS con puente ficticio; incluye nube offline/retry y recarga/undo.
- [regression-web.json](regression-web.json): 19 escenarios Fase1 repetidos después de las correcciones nuevas.
- [performance.json](performance.json): muestras reales de Node en Windows, cinco por operación. Heap/RSS/CPU son del proceso sintético, no de CocoWash en iOS.
- [runtime.json](runtime.json): fallo inicial7/8, hit-test y resultado final8/8 de las mismas aserciones en Edge.
- [checks.json](checks.json): comandos, resultados y limitaciones del entorno.
- [source-sha256.json](source-sha256.json): huellas de fuentes y preservación del baseline.

Reproducción: [TEST_PLAN](../../TEST_PLAN.md). Límites y siguiente puerta en
[PHASE2](../../PHASE2.md) y [TESTFLIGHT](../../TESTFLIGHT.md).

Los commits de producto son `9ff2734` (checkpoint), `b463bd2` y `13dae6f`.
La evidencia del árbol incluye herramientas/tests/documentación posteriores;
la huella separa código actual de SHA de HEAD. No atribuirle el CI del build43.
