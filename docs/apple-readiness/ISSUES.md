# Incidencias vigentes — 2026-11-09, candidato 0.9.9.2

| Problema | Prioridad | Estado comprobado |
| --- | --- | --- |
| R-61: durabilidad de decisiones reconocidas | P0 | PASS relanzamiento×5 en ambos simuladores; almacenamiento averiado/físico pendientes, con límites silenciosos R-64 |
| R-67: WKWebView vacío tras relanzar | P1 | FAIL intermitente fa318ba/42634699746: 120s sin interfaz; no se reproduce en2794e4b; causa abierta, sin retry |
| R-07b: Live anclada | P1 | Foto clave/timeline/bucle PASS2794e4b; solo destino de zoom XCTest FAIL. Ajuste de padre CW-CX-062 pendiente; usuario confirma pinch físico |
| R-47b: Android fullscreen Back | P1 | PASS emulador fa318ba/42634538249: reproductor/posición/sonido/galería conservados, segundo Back cierra visor |
| R-01: álbum | P1 | PASS estándar iPhone18Pro/iOS27; Duo/mínimo17 pendientes |
| R-02: privacidad de distribución | P1 | Declaración y firmas proveedor PASS; archivo/ATT físico/exhaustividad/políticas publicadas BLOCKED |
| Comercio, firma y QA física | P1 | BLOCKED cuentas/configuración/identidades/QA/autorización de subida |

[Roadmap único](../ROADMAP.md) · [Pruebas y límites](RELEASE_CANDIDATE.md) ·
[Evidencia](evidence/strategic/0992-native-fa318ba.json).
El contenido siguiente es histórico y no declara aceptación del candidato actual.

# Registro priorizado de problemas y correcciones

**RC:** [registro detallado y checkpoints](RELEASE_CANDIDATE.md), [evidencia](evidence/rc/README.md). Corregidos P1 favorita obsoleta/catálogo vacío (645564f), etiquetas/manifiesto (cb927ad), canal tienda/versionado tras sync (55c6951); P2 errores nativos traducidos (9824907). **P1 abierto FAIL:** tracking=true sin dominios (TN3182), gate estricto bloquea archivo (880a9a0). Validación nativa adversa/firma/comercio siguen BLOCKED. No hay P0 reproducidos abiertos en contratos JS; no se certifica PhotoKit nativo. APL-010 traducido, ejecución Apple pendiente. Las tablas siguientes son históricas.

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
| APL-015 | P0 | Fase2: snapshot manual retenido vaciaba removed tras éxito de borrado | Corregido en b463bd2; generación y guards tras await en connect | FAIL antes/PASS después con puente; falta nativo |
| APL-016 | P0 | Fase2: Recuperar individual activo con solicitud de eliminación pendiente | Corregido en b463bd2; disabled y guards, restaurados al cancelar | FAIL antes/PASS después; falta PhotoKit real |
| APL-017 | P1 | Fase2: confirmar una mutación descartaba la respuesta pendiente de revocación | Corregido en13dae6f; vigencia de permisos separada de snapshots | FAIL antes/PASS después; falta WKWebView |
| APL-018 | P2, prueba | Coordenada8/8 de test caía fuera de la esquina42px del preview | Punto real en overlay con hit-test previo; mismas aserciones de animación | 8/8 Edge; runtime protegido intacto |

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

Fase2: [reproducciones y resultados](evidence/phase2/README.md),
[informe](PHASE2.md). Los commits locales conservan puntos de control; no se
confunden estas verificaciones de puente/JS con aceptación nativa o publicación.
APL-009/013 tienen ahora un perfil de metadatos Node reproducible; RAM/CPU/energía
de medios reales y terminación de iOS continúan NO VERIFICABLES EN ESTE ENTORNO.
