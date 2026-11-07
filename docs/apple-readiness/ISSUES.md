# Registro priorizado de problemas y correcciones

2026-11-07 · fuente inicial build 43. Estado **local**: no integrado/publicado.

P0: pérdida de datos/operación destructiva incorrecta/fallo crítico.
P1: bloqueo, incompatibilidad declarada o puerta de publicación sin satisfacer.
P2: experiencia visual, accesibilidad o rendimiento. P3: mejora opcional.
Un riesgo pendiente de probar no se presenta como fallo reproducido.

| ID | Prioridad | Evidencia | Acción / estado | Gate restante |
| --- | --- | --- | --- | --- |
| APL-001 | P1 | Inicial: con biblioteca autorizada de 3, reducir a 1 deja contador 3; `assets` no se vuelve a llamar | Corregido local: refrescar en cada retorno visible, incluso limited→limited | VERIFICADO en Edge/fixture; PENDIENTE WKWebView/PhotoKit |
| APL-002 | P1 | Inicial: revocar con revisión abierta deja el diálogo encima del acceso denegado. También se reprodujo un resultado nativo denegado al terminar una enumeración, ignorado por la UI | Corregido local: cerrar superficies, cancelar calentamiento y retirar assets al denegar, incluso al recibir la respuesta; conservar decisiones | VERIFICADO fixture con regrant, enumeración retenida y cola conservada; PENDIENTE nativo/inspector |
| APL-003 | P0 | Durante el desarrollo de APL-001: una consulta retenida devolvió su snapshot tras borrar y vació `removed` por reconciliación | Corregido antes de entregar: invalidar generaciones anteriores al iniciar y confirmar borrado | VERIFICADO prueba antes FAIL/después PASS. No se publica la implementación intermedia |
| APL-004 | P1 para soporte Duo anunciado | Inicial: CSS no considera insets left/right; prueba con 10/70 px falla | Corregido local parcialmente: shell y hojas aplican ambos lados por separado | VERIFICADO CSS sustituido en Edge; PENDIENTE regiones reservadas, inspector, cámara y bisagra en Duo |
| APL-005 | P1, puerta de seguridad | No hay prueba destructiva nativa actual de cancelación/error/parcial/favorita concurrente/restauración | PENDIENTE; se añadieron cuatro contratos JS. No se cambió el resultado PhotoKit | Simulador desechable con fixtures; nunca confirmar en biblioteca personal |
| APL-006 | P1, distribución | CI de la base hace build sin firma, no archive/validación/upload. Este diff no tiene build Swift nuevo | NO VERIFICABLE aquí; procedimiento en TEST_PLAN | Archivo firmado y TestFlight de release, conservando claves/bundle |
| APL-007 | P1, privacidad comercial | Ads/UMP y geocodificación presentes; manifiesto propio no acredita el informe agregado de terceros | PENDIENTE comparar archivo, tráfico, etiquetas y política | Archivo macOS, ATT/UMP regional, revisión administrativa |
| APL-008 | P1 si se declara optimizado | Duo tiene regiones reservadas/orientación dinámica; layout ancho se queda en columna 520 px | PENDIENTE propuesta de adaptación basada en simulador; no rediseñada | Device Hub/App Resizability y revisión de composición antes de cambiar identidad |
| APL-009 | P2 | No RAM/CPU/energía físicos, la biblioteca se enumera completa y vídeo permite caché de 1 GiB | NO VERIFICABLE; medir en equipo de pocos recursos | 10k/50k, Memory Graph, Allocations, Energy, presión de disco |
| APL-010 | P2 | Swift tiene textos de fallback sin localización; InfoPlist y UI principal sí tienen 7 idiomas | PENDIENTE inventario y traducción de errores/Live Photo; no rehacer i18n | Prompts y fallos en 7 idiomas, RTL y pseudolocalización |
| APL-011 | P2 | Parte del inspector calcula espacio con constantes; texto ampliado/VoiceOver no ejecutados en iOS | PENDIENTE auditoría de accesibilidad nativa | VoiceOver, Switch Control, teclado y tamaños de accesibilidad |
| APL-012 | P2 | SPM transitivo sin Package.resolved seguido; UMP real 3.1.0 en CI | PENDIENTE conservar resolución del archivo y evaluar actualización solo si se justifica | Resolver en macOS y comparar diffs/licencias/manifiestos |
| APL-013 | P2 | Persistencia agrupada hasta 350 ms; procesos terminados sin lifecycle pueden perder decisiones recientes | PENDIENTE prueba de interrupción en límites de escritura | Comprobar envelope/undo tras kill; no cambiar almacenamiento sin reproducción |
| APL-014 | P3 | Vite avisa de chunks >500 kB (native JS ~910 kB sin gzip) | Registrado, sin cambio masivo ni subir el umbral del aviso | Perfilar arranque real antes de dividir módulos |

## Secuencia de correcciones y puertas

1. **Hecho local:** baseline, reproducción APL-001/002, fixture sin acceso real,
   solución y regresión APL-003. Error/cancelación/parcial/éxito conservan el contrato.
2. **Hecho local parcial:** APL-004, manteniendo layout/tokens y hashes protegidos.
   No se declara completo soporte Duo.
3. **Siguiente técnico:** revisar diff e integrar de forma controlada en la base
   canónica. Ejecutar Swift/WKWebView del diff y APL-005. Cualquier fallo real de
   borrado es P0 y detiene avance a distribución.
4. **Compatibilidad:** mínimo iOS 17 + 26 + 27.1, pequeño/grande y Duo en todas
   sus poses. Resolver APL-008 antes de prometer optimización para Duo.
5. **Publicación:** APL-006/007; compras/consentimiento sandbox y etiquetas,
   disponibilidad de iPad/Mac/visionOS, firma y metadatos.
6. **Experiencia:** APL-009–013 con medidas y conjuntos sintéticos; P3 solo tras
   estabilizar los anteriores.

No se cambian Swift, permisos, claves de persistencia, contratos del puente,
gestos de decisión ni las dependencias. La invalidación alrededor de
`commitDelete` solo impide que un snapshot anterior contradiga su resultado.
Esta entrega no altera la confirmación del sistema ni borra nada del usuario.

Los fallos intermedios del propio test (expectativa de orden de IDs de borrado y
título de álbum) se corrigieron en el test: no eran defectos de la app. Se compara
el conjunto confirmado por el puente, conservando el orden real de la cola pendiente.

Recibos: [baseline de permisos](evidence/before-web.json),
[carrera intermedia](evidence/race-before.json),
[insets antes](evidence/safe-before.json),
[revocación durante enumeración](evidence/inflight-before.json),
[validación final](evidence/final-web.json).
