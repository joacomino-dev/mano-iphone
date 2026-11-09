# R61 — propuesta de persistencia duradera

**FAIL reproducido. Cambio aprobado expresamente por el usuario el 2026-11-08; implementación local en validación nativa.**

Run42513754519/27b03ca: descarte sintético encola1, localStorage devuelve1, cierre
forzado inmediato yarranque devuelven0. Observer antes de React confirma que no se
perdió al reconciliar la fototeca: el sobre antiguo ya estaba en almacenamiento.
En otro caso, seis segundos en segundo plano conservan1. Una transacción separada
IndexedDB strict terminó en1,9ms ysu copia sobrevivió; un caso no es benchmark ni
prueba de integridad del producto. No usar una espera artificial como corrección.

## Cambio acotado solicitado

Mantener React/Capacitor, contratos PhotoKit/MediaStore yel dominio de decisiones.
Añadir solo un módulo local IndexedDB, sin dependencias, red, modelos, telemetría ni
servicios. Migrar el sobre validado actual; conservar claves/versiones e historial.
Usar revisiones secuenciales para evitar que una respuesta antigua pise una nueva.
Esperar `transaction.oncomplete` con durabilitystrict, no solo request.onsuccess.
Si motor/almacenamiento/cuota/transacción fallan, no confirmar la decisión ni avanzar
la carta como si se hubiera guardado; mostrar error ypermitir reintentar.

| Operación | Orden que debe garantizarse |
| --- | --- |
| Conservar/Descartar/Más tarde/Deshacer/Recuperar | Calcular misma transformación pura actual → persistir de forma serial → aplicar UI e historial confirmados |
| Favorita Android encolada | Cola de favorita ydecisión en la misma transacción; restaurar ambas al arrancar |
| Favorita iOS/álbum | Persistir intención antes del efecto nativo; guardar resultado confirmado; reconciliar interrupción sin inventar que el efecto se deshizo |
| Eliminar desde revisión | Persistir intención; solicitar confirmación del sistema existente; guardar solo IDs confirmados; nunca repetir automáticamente un borrado interrumpido |
| Arranque | Leer diario válido antes de montar la sesión; recuperar estado/historial/contexto ycolas compatibles; espejo legacy como recuperación/migración controlada |
| Filtros/semilla/mano/biblioteca renovada | Guardados ordenados respecto a decisiones; un refresh nunca vuelve a persistir una revisión anterior |

No convertir un ID ausente tras permiso limitado/revocado en eliminación confirmada.
Una interrupción entre efecto nativo yacuse duradero exige reconciliación conservadora:
resultado incierto, no éxito supuesto. Deshacer conserva su semántica actual yno
recupera desde CocoWash un archivo ya borrado en Fotos/MediaStore.

## Gates antes de aceptar

- Regresiones puras: orden de revisiones, errores/cuota/abort, historial/contexto exactos,
  sobre inválido yactualización antigua, migración sin perder datos ycola de favoritas.
- Navegador real: transacciones abortadas, petición exitosa antes de abortar, cierre
  durante escritura yarranque; no usar un mock que garantice siempreoncomplete.
- Android: repetir caso exacto sin añadir esperas después de la confirmación visible;
  comprobar IDs MediaStore intactos, pending/undo/favoritas/contexto exactos y10ciclos.
- iOS: mismo cierre yrecuperación, permisos limitados/revocados, cancelación/errores de
  PhotoKit yno éxito falso. Bibliotecas grandes en simulador yposteriorInstruments.
- Medir latencia real ymemoria por tamaños; no extrapolar Node a teléfono. La prioridad
  es integridad, sin una refactorización general o cambios de UX/arte.

`strict` es una indicación al motor; la prueba de force-stop es la evidencia objetivo.
No prometer tolerancia universal a fallo físico de almacenamiento/corte de energía.

Fuentes: [W3C IndexedDB, transacciones/durabilidad](https://www.w3.org/TR/IndexedDB/),
[Chromium, localStorage commit diferido](https://chromium.googlesource.com/chromium/src.git/+/435e399c1f5938df9301f4e96e19a3df24489a94/components/services/storage/dom_storage/local_storage_impl.cc).

## Implementación y evidencia local — CW-CX-051

Diario IndexedDB local con transacciones `strict`, acuse en `oncomplete`, revisiones
comparadas dentro de la transacción y cola serial. Arranque antes de React, migración
sin descartar datos ilegibles, cola Android y decisión atómicas. El espejo legacy es
opcional después del commit. Las decisiones, Deshacer, recuperación y reset demo
esperan el guardado. Se conservan las transformaciones del dominio y los contratos nativos.

Intención antes de favorita iOS, álbum y borrado; si falla el guardado tras el sistema,
no hay éxito inventado ni repetición automática. Al reconocer la advertencia se
reconsulta la galería. Un ID no visible conserva su pendiente y puede retirarse de la
cola, sin inferir que se borró. Esa recuperación no recupera archivos de Fotos.

PASS local: 138 pruebas Node (8 nuevas), 8 casos Edge/IndexedDB reales, TypeScript,
protected28, builds y sincronización de fuentes iOS. `/review` integrado sin hallazgos.
[Resultados y condiciones](evidence/strategic/r61-local-journal.json). Las métricas
Windows de 100/5.000/50.000 registros no describen rendimiento de un iPhone.

**Gate de force-stop Android/iOS: NOT TESTED en esta implementación. R-61 no está
cerrado hasta ejecutar esas pruebas nativas.** Ninguna confirmación sobre fotos personales.
