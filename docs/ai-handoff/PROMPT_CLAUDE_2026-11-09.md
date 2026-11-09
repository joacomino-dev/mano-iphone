# Relevo de Codex — 9 de noviembre de 2026

Fuente única: `C:/Users/Joaco/Developer/CocoWash-android`, `main`.
Código candidato `6386f555d8d7bf48ed1d5347bad0fce6e3d348eb` sobre tu `37facf1`.
Los commits posteriores de documentación no cambian la app. Comprueba Git,
CURRENT_STATE, ROADMAP y las últimas entradas CW-CX-055/056 antes de escribir.

## Cambios realizados

- R-07b: solo XCTest. El evento anterior iniciaba ambos dedos sobre controles
  (aprox. 201,437 en pantalla 402×874); ahora pellizca el medio anclado. Exige
  cambio de píxeles interiores y barra sin escalar. No se modifica Inspector.
- R-47b: `571b1e5` aún fallaba Back. El registro demuestra que no llegaba al
  callback de la actividad. `6386f55` intercepta la tecla antes de WebView y usa
  prioridad de overlay para el gesto API33+, retirándola al salir. La regresión
  conserva elemento, fuente, posición, sonido, visor y galería.
- Desarrollo iOS: el build frío del simulador consumió 9m47s del paso de diez
  minutos. Ahora dispone de veinte; conserva arranque y relanzamiento reales.
- Dos revisiones integradas sin hallazgos. 138 Node, TypeScript, protected28,
  ambos builds web y regresiones de silencio/anclada/Live/reanudación PASS.

## Evidencia que debes comprobar

Todos los siguientes runs pertenecen a `6386f55`; consulta su resultado final,
sin volver a lanzarlos porque estén en cola:

- [Tienda iOS](https://github.com/joacomino-dev/mano-iphone/actions/runs/42623207314): PASS.
- [Desarrollo iOS](https://github.com/joacomino-dev/mano-iphone/actions/runs/42623186747): en curso.
- [Android](https://github.com/joacomino-dev/mano-iphone/actions/runs/42623186603): en curso.
- [Gate completo iOS](https://github.com/joacomino-dev/mano-iphone/actions/runs/42623622241): en cola detrás del gate anterior.

El [gate anterior de `571b1e5`](https://github.com/joacomino-dev/mano-iphone/actions/runs/42620548423)
todavía estaba en curso al preparar este relevo. El xcresult de `8f2549e` contiene
5 PASS, 1 FAIL y 2 SKIP (capturas/publicidad separadas), no 7 pruebas aprobadas.

Conserva tu corrección de sonido: nunca vuelvas a incluir `sound` en el efecto
de reproducción. `InlineVideo.tsx` e `Inspector.tsx` siguen idénticos a `37facf1`.
R-64 conserva recuperación silenciosa; no restaurar los avisos retirados.

Tu aceptación pendiente: Live, ausencia de selección/lupa y artefactos nativos
de carta de anuncio/Fredoka/RTL. No fuerces anuncios con compra desconocida.
Solo después de gates y aceptación prepara la IPA/APK finales con el SHA.
No se ha validado instalación física ni se ha publicado nada. Cuentas, firma,
comercio, política pública, ATT/Privacy Report y QA física siguen en el paquete
del usuario del roadmap. No repetir aprobaciones ya concedidas.
