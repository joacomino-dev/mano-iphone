# CocoWash 0.9.5 — prompt listo (observaciones del usuario tras probar 0.9.4)

Estado (CW-CL-032): **implementado 2–7** (vídeo, favoritas, última mirada, introducción, Coqui y Memo, color). **Pendiente 1** (firma de Zángano Studio: falta el texto en curvas). Falta CI macOS y QA en iPhone. Rama de partida:
`claude/perf-stability-cotton` (0.9.4, build 13). Siguiente versión: 0.9.5 (build 14).

Asset recibido:
- `mano/brand/zangano-studio-logo-source.svg`: logo completo de Zángano Studio, tal como lo exportó el
  usuario desde Affinity (isotipo en trazos; «ZANGANO» y «studio» como `<text>` con Candara y Helvetica
  Light). **iOS no tiene Candara**: antes de usarlo hay que convertir el texto a curvas (ideal: reexportar
  desde Affinity con «Convertir en curvas»; si no, trazar un render fiel como se hizo con el logo de
  CocoWash, ver `mano/brand/README.md` y `trace-logo.py`). Nunca depender de la fuente del sistema.

---

## Prompt

> CocoWash 0.9.5 — refinamiento tras probar 0.9.4. Lee `AGENTS.md`, `mano/AGENTS.md`,
> `docs/ai-collaboration/CURRENT_STATE.md` y este archivo. Trabaja en la rama vigente, sin romper
> funciones, con las reglas de siempre (privacidad, descartar solo encola, borrar solo desde revisión
> con confirmación de Fotos, runtime protegido intacto, sin push sin autorización). Implementa por
> etapas, con pruebas donde haya lógica, y al final informe breve + bitácora + estado.
>
> **1. Firma de Zángano Studio (pantalla de inicio).** Sustituye el isotipo solo por el logo completo
> (`mano/brand/zangano-studio-logo-source.svg`, texto pasado a curvas). Composición sugerida: isotipo
> pequeño a la izquierda y, a su derecha, «ZANGANO» con «studio» debajo y más ligero (o isotipo
> encima y las dos palabras en una línea si a 30–36 px de alto queda más legible). Claro y legible,
> en tono tinta/café suave con opacidad moderada: debe firmar, no competir con el logo de CocoWash.
> Mismo hueco inferior actual, respetando el área segura.
>
> **2. Coqui lavando a Memo (inicio y tutorial).** Corrige el asset
> `mano/public/assets/characters/coqui-memo.webp` (y su fuente si existe): la espuma del jabón sale
> gris y debe ser blanca; el triángulo entre las piernas tiene relleno blanco y debe ser
> transparente. Revisa el canal alfa y que el contorno no quede con halo sobre el papel crema.
>
> **3. Corrección cromática leve.** La app ya se lee café, rosa y beige; el turquesa queda como color
> de **Conservar** (acción y estados de «guardar la foto») y de poco más. Pasa a café los acentos
> generales: Ajustes (interruptores, selección, enlaces), chips/filtros activos y detalles de
> navegación. Hazlo por tokens (no color suelto), comprueba contraste AA de texto y controles, y
> que la jerarquía no cambie. Es un ajuste, no un rediseño: antes/después en capturas.
>
> **4. Favoritas (lógica, prioridad alta).** Regla: una foto que es favorita en Fotos de iPhone
> **siempre** cuenta en el filtro «Favoritas» (si el iPhone tiene 34, el filtro dice 34) y **nunca**
> aparece en la pila normal; solo aparece cuando el filtro Favoritas está activo. No funcionan como
> las conservadas. Hoy `reconcileLibrary` (domain.ts) une los `favorite` nativos a
> `state.favorites`, pero el usuario ve conteos que no cuadran: audita de punta a punta (enumeración
> nativa `isFavorite`, cuándo y con qué lote se reconcilia, si se reconcilia solo una vez, quitar
> favorita desde Fotos, conteo del filtro con otros filtros activos — tipo de medio, fechas —,
> ocultas, iCloud) y corrige la causa. Pruebas con: favoritas solo nativas, solo de la app, ambas,
> desmarcadas en Fotos, y conteo con filtros combinados.
>
> **5. Introducción.**
> - Animaciones un poco más lentas (hoy `STEP_MS = 1250` en `Onboarding.tsx`; probar ~1.6–1.8 s por
>   gesto y ajustar la ronda/bloqueo de «Continuar» en consecuencia).
> - El resaltado de la acción activa en las pantallas 2 y 3 no gusta: rediseñarlo (por ejemplo,
>   icono que se rellena + texto que pasa a tinta plena mientras las demás filas bajan de opacidad,
>   o un indicador fino que acompaña a la fila), sin cajas que salten ni desplazamientos.
> - Al pulsar «Continuar», la pantalla 2 no debe empezar su demo de inmediato ni con la foto
>   deslizándose a su sitio: la foto aparece ya en su posición de reposo y la demo arranca tras una
>   pausa (~500–700 ms después de que termine la transición entre tarjetas).
> - «Toca para rotar» pasa demasiado rápido: darle más tiempo y que se vea el toque y el giro.
> - Anclar termina muy rápido y con la foto transparente: el final debe mostrar la foto anclada,
>   opaca, quieta un momento. Mensaje UX: **pellizcar y mantener+arrastrar hacen lo mismo** (ambos
>   anclan); que el texto y la demo lo digan juntos.
> - Cuarta tarjeta: quitar el texto «Puedes dar acceso solo a algunas fotos…».
>
> **6. Última mirada (revisión antes de eliminar).** «Recuperar» va encima de «Eliminar». Quitar el
> gesto de mantener y deslizar a la derecha para recuperar, y su texto de ayuda
> (`ManoApp.tsx`, `.review-hint`): solo se recupera con el botón.
>
> **7. Vídeo.**
> - **Regresión: en 0.9.4 los vídeos ya no se reproducen solos en la carta.** Encontrar la causa
>   (candidatos: efecto `wantsPlay` y `playheads`/`userPaused` en `InlineVideo.tsx`, que una pausa
>   recordada o el sonido de la sesión bloqueen el autoplay silencioso, `preload`, asignación de
>   `src`) y cubrirla con una prueba en navegador.
> - Al anclar, el sonido se queda como el usuario lo tenía (hoy anclar lo activa; revertir esa
>   decisión de 0.9.4).
> - En el vídeo anclado aparece el control de zoom pero no hace nada: hacerlo funcionar con el
>   mismo motor de zoom de las fotos o, si no es fiable en WKWebView, quitarlo.
>
> **Cierre:** `npm test`, `check:runtime`, `build`, `build:native`; capturas antes/después de inicio,
> tutorial, Ajustes y revisión; CI macOS verde; QA en iPhone no destructiva (favoritas con conteo
> real, autoplay, sonido al anclar). Bitácora y estado actualizados.

## Notas para quien lo implemente
- Decisiones de 0.9.4 que este prompt cambia: «anclar activa el sonido» (pasa a respetar la
  elección) y el isotipo solo en el inicio (pasa a firma completa).
- CI 0.9.4: presupuestos de tiempo del smoke test ampliados en 9b330af; ver CURRENT_STATE para el
  resultado.
