# CocoWash: compatibilidad Apple y preparación internacional

Fecha: 2026-11-07 · responsable de esta intervención: Codex (CW-CX-018).

**Actualización Fase 2 — CW-CX-019:** [resultados ejecutados](PHASE2.md) y
[protocolo físico/TestFlight](TESTFLIGHT.md). Checkpoint `9ff2734`; correcciones
adicionales `b463bd2` y `13dae6f`. Sin push, firma, subida o publicación.
Pasan 119 Node, 19 escenarios iniciales, 9 de seguridad ampliada, 8 del runtime
en Edge, 4 contratos estáticos y Sites4; native-web no acredita Swift.

**Estado: preparación local avanzada; publicación bloqueada por validación nativa,
dispositivos y configuración de distribución. No es una certificación App Review.**

Base: `691cded44bbb39bc4c8fa1ddfd1889a69e2b62a9`, misma referencia `main`
comprobada con `git ls-remote`. Último cambio de app:
`5e620b4286f8f64b2e0c9bf4ae61fa0572b33fb6`. Producto 0.9.9.1; bundle 0.9.9,
build 43; package npm 0.1.0. Se conservan esas versiones.

El checkout usado es `C:/Users/Joaco/Developer/CocoWash-b24`, rama existente
`claude/cocowash-9.8.6`, limpio al iniciar. La copia OneDrive estaba en 0.7
(`76744e2`), divergente y con trabajo local: no se actualizó ni se sobrescribió.
Las correcciones de la Fase 1 quedaron conservadas en el checkpoint `9ff2734`.
Las fases 1/2 siguen pendientes de integrar en `main`/`release` y de nueva CI,
firma e instalación física. Las métricas Node no son mediciones de iPhone.

## Documentos mantenidos

- [Auditoría técnica inicial](AUDIT.md).
- [Matriz de compatibilidad](COMPATIBILITY.md).
- [Problemas, correcciones y secuencia](ISSUES.md).
- [Checklist de App Review](APP_REVIEW.md).
- [Plan reproducible de pruebas](TEST_PLAN.md).
- [Auditoría de interfaz y límites Duo](UI_AUDIT.md).
- [Fuentes oficiales consultadas](SOURCES.md).
- [Evidencias y recibos](evidence/README.md).
- [Fase 2 y métricas verificadas](PHASE2.md).
- [Procedimiento físico y TestFlight](TESTFLIGHT.md).

## Estado comprobado

| Área | Estado al cierre |
| --- | --- |
| Base preservada | VERIFICADO: SHA, versiones y 247 hashes iniciales; sin actualizaciones de dependencias |
| Pruebas existentes | VERIFICADO: 119/119 antes y después; runtime 28/28; TypeScript; builds web/native-web; Sites 4/4 |
| Correcciones locales | VERIFICADO en 19 escenarios Edge con puente ficticio: permisos al reanudar/durante enumeración, cierre de revisión al revocar, invalidación de consultas anteriores al borrado, insets laterales |
| Borrado | VERIFICADO por inspección: PhotoKit resuelve solo con éxito y reconsulta favoritas/ocultas; pruebas de contrato JS con cancelación/error/parcial/éxito. PENDIENTE ejecución destructiva nativa con fixtures |
| Compilación nativa de la base | VERIFICADO en logs de CI existentes: desarrollo y release sin firma con SDK 27.1; arranque/reapertura en simulador. No acredita esta modificación local |
| iOS mínimo | VERIFICADO configurado 17.0. PENDIENTE ejecución en el mínimo; no se rebaja a 15 |
| iPhone 18 / Duo | VERIFICADO que Apple documenta 18 Pro/Pro Max y Duo; NO VERIFICABLE aquí su ejecución nativa/física. Sin promesa de adaptación completa |
| Privacidad internacional | Manifiesto, consentimiento, traducciones y web presentes. PENDIENTE informe agregado del archivo firmado, tráfico y etiquetas definitivas |
| TestFlight / App Store Connect | NO VERIFICABLE: no sesión administrativa ni archivo firmado inspeccionados |

**VERIFICADO** siempre identifica el método y su alcance: código, navegador,
compilación o dispositivo. **PENDIENTE** requiere más evidencia.
**NO VERIFICABLE** indica que falta actualmente herramienta, dispositivo o acceso;
no significa incompatibilidad ni cumplimiento.

## Siguiente puerta de salida

Revisar e integrar el diff local sobre build 43, ejecutar la matriz nativa del
[plan](TEST_PLAN.md), y después generar un archivo firmado del canal `release`.
No ampliar destinos ni anunciar soporte Duo optimizado antes de verificar sus
poses, regiones reservadas y continuidad. Publicar requiere además los pasos
administrativos de [App Review](APP_REVIEW.md).
