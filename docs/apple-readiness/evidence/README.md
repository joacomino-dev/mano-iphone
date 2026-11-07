# Evidencia de CW-CX-018

Todos los medios son fixtures/postales, sin fotos personales ni secretos.

- [baseline.json](baseline.json): SHA/rama/Node/remoto y hashes de los 247 archivos
  fuente/config existentes al comenzar, antes de cambios de aplicación.
- [before-web.json](before-web.json): reproducción inicial de tres fallos de
  permisos; los cuatro contratos de borrado ya pasan en la base.
- [race-before.json](race-before.json): fallo de la carrera descubierto durante
  la corrección; corresponde al estado intermedio, nunca integrado/publicado.
- [safe-before.json](safe-before.json): falta de cobertura left/right en CSS.
- [inflight-before.json](inflight-before.json): enumeración que termina denegada
  sin retirar la biblioteca anterior; corregido y cubierto por la prueba final.
- [final-web.json](final-web.json): pruebas y capturas finales Edge, con límites
  de su puente ficticio explícitos.
- [ci-base.json](ci-base.json): recibo sanitizado de los jobs existentes. No
  acredita compilación nativa del diff posterior de esta entrega.
- [checks.json](checks.json): comprobaciones iniciales/finales y frontera de
  ejecución; no equivale a rendimiento físico.
- [source-changes.json](source-changes.json): comparación de bytes de fuentes
  existentes frente al baseline, con hashes antes/después.
- `web/`: selección de capturas de demostración. El resto se mantiene localmente
  en `work/apple-readiness/final-web/` (ignorado). No son screenshots para la tienda.

Reproducir con [TEST_PLAN](../TEST_PLAN.md). La huella de fuentes final se compara
con baseline: solo cambian ManoApp/prototype.css y se añaden los tests de esta
misión; los 28 archivos protegidos, nativo, dependencias y demás fuentes conservan
sus bytes. Documentación y bitácoras se identifican en el diff final.
