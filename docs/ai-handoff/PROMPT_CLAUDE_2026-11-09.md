# Relevo de Codex — 0.9.9.2, 9 de noviembre de 2026

Fuente única: `C:/Users/Joaco/Developer/CocoWash-android`, `main`.
Checkpoint de pruebas `afbd2f991aeddbd850b72eac547fe6cfc420714b`;
la documentación posterior no cambia app/binarios. Comprueba Git, CURRENT_STATE,
ROADMAP y CW-CX-061/062/063 antes de escribir. No hay otra rama de integración.

## Cambios y límites

- Visible 0.9.9.2; iOS 0.9.9/build44/min17; Android 0.9.9.2/code4. Los cuatro
  componentes no son válidos para CFBundleShortVersionString de Apple.
- R-47b PASS emulador: Back sale de fullscreen al mismo reproductor, conserva
  fuente/posición/sonido/galería; siguiente Back cierra Inspector. No tocar sonido.
- El muestreo Android usa meminfo --local porque el dump normal fuerza GC dentro
  de la ventana medida. Presupuestos intactos. Nuevos resultados: memoria 219097→
  228590 KiB; pendiente 515,15 KiB/ciclo; mediana CPU tardía 0 al nivel del contador,
  picos intermedios combinados 102,92 %. No equivale a batería/CPU física nulas.
- R-07b cambia solo XCTest: vídeo pausado omitido de AX; el menor ancestro
  visible del timeline es el destino, con centro encima de controles. Conserva
  cambio real de píxeles y barra sin escalar. Revisión integrada sin hallazgos.
- `InlineVideo.tsx` e `Inspector.tsx` conservan sus hashes. Nunca reintroducir
  `sound` en el efecto de reproducción ni los avisos de almacenamiento R-64.
  No se modifican PhotoKit, diario, personajes, lettering, animaciones o arte.

## Evidencia que consultar (sin duplicar CI)

- [iOS tienda fa318ba](https://github.com/joacomino-dev/mano-iphone/actions/runs/42634699549): PASS.
- [iOS desarrollo fa318ba](https://github.com/joacomino-dev/mano-iphone/actions/runs/42634699515): PASS, arranque/relanzamiento.
- [Android 2794e4b](https://github.com/joacomino-dev/mano-iphone/actions/runs/42669935821): PASS completo,
  17 checks, diez rondas, force-stop×5 y presupuestos originales; 65 assets generados.
- [Fotos iOS 2794e4b](https://github.com/joacomino-dev/mano-iphone/actions/runs/42669952998):
  5 PASS, 1 FAIL, 2 SKIP. Cancelación/relanzamiento×5/key/timeline/bucle/diez rondas
  PASS; solo falla el destino por label. Los SKIP pertenecen a workflows separados.
- [Fotos iOS afbd2f9](https://github.com/joacomino-dev/mano-iphone/actions/runs/42682535759):
  standard/full en curso para el ajuste del padre. Esperar el resultado; no duplicar.
- R-67: WebView sin contenido 120s en fa318ba, antes de cualquier borrado. No se
  reproduce en 2794e4b; causa abierta. No cerrarlo por una ejecución posterior verde.
  No añadir relanzamientos para ocultarlo; diagnóstico físico/Mac pendiente.

## Paquetes verificados en Descargas

- `CocoWash-0.9.9.2-build44-fa318ba.ipa`: unsigned, para firma con iLoader.
- `CocoWash-0.9.9.2-android-build4-2794e4b.apk`: firma debug temporal.
- Mismo nombre `.aab`: unsigned, no subir a Play.
- `CocoWash-0.9.9.2-politicas-ES-EN.zip`: dos HTML, instrucciones/hashes, sin desplegar.
- `CocoWash-0.9.9.2-SHA256-fa318ba-2794e4b.txt`: hashes de los cuatro archivos.

Las fuentes compiladas de la app no cambiaron entre esos artefactos y afbd2f9;
solo XCTest/documentación. No renombrar un archivo para atribuirle otro SHA.
Nunca desinstalar la app con decisiones por un conflicto de firma. No se instaló
nada en el teléfono ni se confirmó borrado sobre una biblioteca personal.

## Tu aceptación visual

Hay 28 capturas reales por plataforma, cuatro pantallas × siete idiomas: iOS
1206×2622 RGB24 /42516036408; Android 1080×1920 RGB24 /42516038859. Comprueba sus
SHA y vigencia respecto al producto; revisa Fredoka/RTL/carta de anuncio, Live y
ausencia de selección/lupa. La guía Apple vigente exige clase mediana en su
resumen; las existentes cubren esa clase. Tabla contradictoria registrada: no se
impuso clase grande, alteró selector ni lanzó otra CI de capturas.
No forzar anuncios con compras/configuración desconocidas. No reemplazar arte.

## Bloqueos de publicación

R-67, gate Live, QA física, cuentas/firma, Privacy Report/ATT físico,
IDs reales AdMob Android/clave pública Play y productos/sandbox. Políticas públicas
HTTP200 pero anteriores sin Android; archivos corregidos preparados. Cada despliegue,
subida y publicación requiere autorización separada. No reabrir las decisiones ya
confirmadas: responsable/contacto, mantener monetización, dos hosts, diario duradero.

[RC/evidencia](../apple-readiness/RELEASE_CANDIDATE.md) ·
[Checklist de ambas tiendas](../apple-readiness/APP_STORE_SUBMISSION_CHECKLIST.md) ·
[Roadmap y pasos del propietario](../ROADMAP.md).
