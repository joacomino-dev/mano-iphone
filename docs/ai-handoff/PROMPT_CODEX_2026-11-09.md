# Prompt para Codex — relevo de Claude (2026-11-09)

Escribe «Continúa,» y pega lo de abajo.

---

con este relevo de Claude. Trabaja con el método acordado: una sola rama `main`; antes de cada tarea lee
la última entrada de `CLAUDE_LOG.md` (CW-CL-063 a 065), `CURRENT_STATE.md` y `docs/ROADMAP.md`
(«Dónde estamos»); commit + push en cada checkpoint; commits de solo docs con `[skip ci]`; una ejecución
nativa combinada por checkpoint; usa `token-efficiency` y `/review` antes de push de Swift/Kotlin.

## Qué hizo Claude (verificado)

- `main` = `dfe2d23` (o posterior). IPA de desarrollo en `C:/Users/Joaco/Downloads/` con el SHA en el nombre.
- Terminó tu WIP: Live en pausa muestra la foto clave real; la cascada del gate venía del aviso de «operación
  interrumpida» que dejaba un test anterior; el aviso «Viewing full screen» de Android es del paquete `android`.
- Defectos del usuario en su iPhone, corregidos (el usuario: «se siente excelente y súper fluida»):
  - **R-00 lentitud al salir/volver:** desde la RC cada vuelta releía toda la fototeca. Ahora
    `PhotoLibrary.swift` registra `PHPhotoLibraryChangeObserver`; `assets()` devuelve `version` y
    `libraryVersion()` la consulta; al volver solo se relee si cambió el permiso o el contador, si el acceso es
    limitado o si no hay nada cargado (Android, sin contador, mantiene la relectura). `tests/resume-flow.mjs`.
  - **R-64 sin avisos de almacenamiento (decisión del usuario, cambia el contrato R-61):** nunca se muestran
    «No se pudo guardar…» ni «operación interrumpida». El diario reabre IndexedDB (iOS la corta en segundo
    plano) y reintenta; si falla, conserva el estado en memoria y en el espejo localStorage y el siguiente
    guardado sobrescribe; sin diario legible la app arranca con la copia local; la intención antigua se
    resuelve con la primera enumeración fresca; nunca se repite una operación de Fotos. Pruebas de
    persistencia ajustadas a este contrato. **No reintroduzcas esos avisos.**
  - **R-65 vista anclada:** solo «Cerrar»; arrastrar la foto/vídeo sin zoom la cierra (corto → vuelve).
    `tests/anchored-flow.mjs`.
  - **R-66 raya clara al anclar vídeos:** `frame.focus()` sin `preventScroll` desplazaba el WebView;
    ahora `focus({preventScroll:true})` y documento fijo en 0 mientras está anclada; además la barra del vídeo
    anclado no usa `backdrop-filter`. **Pendiente de confirmar por el usuario en iPhone.**
- **Zoom y anclar en todo (usuario, 2026-11-09):** fotos, Live y vídeos comparten gestos en la vista anclada:
  pellizco, **doble toque para hacer zoom en el punto tocado y otro doble toque para deshacerlo**, arrastre con
  zoom y arrastrar para cerrar sin zoom (`Inspector.tsx`, `tests/anchored-flow.mjs` 5/5).
- **Silenciar un vídeo ya no hace play/pausa:** iOS redirige al botón un toque que cae junto a él, pero la carta
  recibía el `pointerdown` y lo tomaba como toque rápido; la carta ignora toques a <14 px de sus botones.
- CI: los tres builds automáticos solo arrancan con archivos que usan (antes 107 ejecuciones/día).
- Gate nativo `8f2549e` 7/8 PASS: álbum, cancelar borrado, R-61 relanzar ×5, pulsación larga sin menú,
  10 rondas, anclar, pellizco de carta, foto clave Live (criterio visual), línea de tiempo y bucle Live.

## Qué te toca (en este orden)

1. **R-07b:** el usuario confirma en su iPhone que el pellizco en Live anclada funciona y que la raya al
   anclar desapareció. El gate nativo aún falla ese paso (~l.690 de `PhotosSmokeTests.swift`): ajusta el
   gesto simulado de XCTest, no la app. Regla del usuario: zoom y anclar en TODO (fotos, Live, vídeos; los
   vídeos ya hacen pellizco/arrastre, CW-CL-066) y ninguna animación debe dejar ver bordes ni «popping».
2. **R-47b Android:** Atrás no sale del vídeo a pantalla completa en el emulador (run 42549137917); el
   aviso del sistema ya se cierra. Revisa `CocoWebChromeClient` y el orden de `OnBackPressedCallback`.
3. Pasa el gate nativo completo en verde sobre un mismo SHA y deja `ReleaseReadiness.json` al día.
4. Lo que dependa del usuario sigue en «Paquete del usuario» del roadmap: cuentas Apple/Google, productos,
   versión/build, firma, TestFlight, publicar políticas, IDs AdMob Android, teléfono Android.

No infles infraestructura de medición; prioriza defectos de producto. No subas a tiendas, no toques cuentas,
precios ni AdMob, no cambies arte ni iOS 17. Termina con «Listo para entregar salvo acciones del usuario: …».
