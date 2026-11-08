# R-04 · Cola Android y snapshots (CW-CX-024)

2026-11-08. Base main67dd04d. Sin cambios Kotlin, diseño, monetización, versiones ni lógica de borrado/confirmación de Fotos.

## Fallos reproducidos

[Antes](evidence/cx024/android-before.json):4 FAIL/1 PASS sobre código previo. No son pruebas Android nativas: React real + proxy Capacitor + galería sintética en Edge.

1. Una enumeración fresca sin favorite borraba la decisión local todavía en cola; reconciliación trataba la galería como si ya hubiera recibido el lote.
2. Encolar invalidaba innecesariamente un snapshot útil con favoritos externos, aunque no había mutación del sistema.
3. Al terminar, un snapshot tomado durante la confirmación nativa se aceptaba después: flushFavorites no invalidaba al confirmar y retiraba la cola antes de reconciliar la respuesta antigua.
4. Deshacer mientras el diálogo estaba pendiente cancelaba el registro local opuesto; la confirmación antigua aplicaba true y borraba trabajo nuevo. El usuario quedaba con la favorita aunque había deshecho.

Además, save absorbía errores de almacenamiento y setFavorite resolvía como encolado aunque no había guardado nada. El comentario decía memoria, pero read solo leía localStorage.

## Corrección mínima

- iOS conserva invalidación antes/después de su escritura inmediata. Android invalida alrededor de cada llamada real del lote (también fallo/cancelación); encolar solo persiste.
- Solo al reconciliar se superponen las decisiones en cola. Los rawAssets y las protecciones nativas mantienen los valores reales de la galería.
- El acuse de un lote elimina únicamente intenciones que aún coinciden con lo enviado. Un undo opuesto en curso queda pendiente y se envía después.
- Marcador persistente de lote en curso antes de invocar Android: si termina el proceso sin callback, un undo posterior no se reduce a cancelar una cola que quizá ya llegó a la galería. Reintentos idempotentes. Se mantiene cola/v1 y estrategia por lotes; nueva clave de marcador cocowash-android-favorites-inflight-v1, sin migración destructiva.
- Fallo real de persistencia se propaga antes de registrar éxito en UI. Error del sistema retiene cola; cancelación descarta solo ese lote, conservando intenciones opuestas posteriores.

## Resultado

[Después](evidence/cx024/android-after.json):7 PASS, incluidos reintento/error/cancelación, marcador persistido de operación interrumpida (simulado, no muerte real del proceso) y escritura denegada.2 regresiones puras añadidas; pruebas anteriores de marcar/desmarcar antes de enviar permanecen PASS.

[Resumen final](evidence/cx024/summary.json):130 Node;14 configuración (6 Release+4 contratos+4 Sites);4 Python con error simctl grabado;68 casos navegador (incluye8 runtime); TypeScript;28 hashes; builds web/native-web; sync iOS en Windows.10 ciclos con aserción incremental repetidos PASS. No se extrapola memoria JS a iPhone.

**BLOCKED**: diálogo real de Android30/36, cancelación, foreground antes/después del diálogo, muerte real durante la confirmación y galería externa. La corrección local no certifica un nuevo APK/AAB. iOS PhotoKit/Live Photo también requieren compilar el nuevo SHA.

## Reproducir

Desde mano, Vite activo en127.0.0.1:4186:

```powershell
node tests/android-favorite-flow.mjs
node --experimental-strip-types --test tests/favorites.test.mjs
node tests/rc-flow.mjs
node tests/apple-safety.mjs
```

Las demás pruebas usan comandos del package.json; véase el relevo y el resumen. Solo fixtures; ninguna biblioteca personal.
