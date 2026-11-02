# Bitácora Claude

Sin intervenciones de Claude registradas al 2026-10-30. No se atribuye la
preparación de Codex a Claude ni se simula la recepción de CW-HO-001.

Al completar una intervención relevante con escritura autorizada, añadir al final
una entrada CW-CL-NNN siguiendo la única plantilla de [PROTOCOL.md](PROTOCOL.md),
con impacto para Codex. Incluir pantallas, componentes reutilizados/creados,
tokens, iconos, animaciones, contratos, decisiones aprobadas y validaciones en
los campos pertinentes. Auditoría solo lectura entrega en chat; registro posterior
según protocolo. Estado breve en [CURRENT_STATE.md](CURRENT_STATE.md).

### CW-CL-001 — Auditoría visual y propuesta de rediseño (CW-HO-001)
Fecha: 2026-10-30, America/Bogota
Agente: Claude
Tarea: CW-HO-001, auditoría de solo lectura; el usuario autorizó registrarla después.
Estado: completada local; propuesta no implementada ni integrada.
Base Git / commit: main, `.git` → 0a6d32d (Git CLI ausente; dirty no verificado).
Archivos modificados: docs/ai-handoff/CLAUDE_AUDIT_CW-HO-001.md (nuevo); esta bitácora; CURRENT_STATE.
Cambios realizados: [informe](../ai-handoff/CLAUDE_AUDIT_CW-HO-001.md) con 22 hallazgos C/I/H, dirección «Sello y papel», piloto sesión y plan en fases 0–4.
Decisiones relevantes: diagnóstico revisado por el usuario (2026-10-30); dirección, copys y tokens siguen como propuesta. Abiertas: hoja blanca de preview (runtime) y orden de revisión.
Validaciones: siete PNG y fuentes leídas; sin builds, render, contraste medido ni VoiceOver/Dynamic Type.
Impacto para Codex: Fase 0 (base recuperable) antes de implementar; revisar diffs de presentación; decidir aria-pressed de Favorita, etiqueta de carta, MotionConfig y avisos de BrandStatus.
Pendientes: decisiones del usuario; Fase 0 → Codex; piloto tras aprobación.

### CW-CL-002 — Rediseño visual completo «Sello y papel» (CW-HO-002)
Fecha: 2026-10-30, America/Bogota
Agente: Claude
Tarea: implementar el rediseño de todas las pantallas, autorizado por el usuario.
Estado: completada local; pendiente de revisión por Codex y de integración.
Base Git / commit: main 0a6d32d, dirty (base Fase 0); cambios sin stage y sin commit. El usuario indicó la rama `claude/nifty-hypatia-zp8tl0`, que no existe en este checkout.
Archivos modificados: mano/src/{ManoApp.tsx,Filters.tsx,prototype.css}; docs/ai-handoff/{CLAUDE_REDESIGN_CW-CL-002.md,UI_BASELINE.md,reference/2026-10-30-redesign/}; .claude/launch.json (preview).
Cambios realizados: tokens `--cw-*`, CSS consolidado, jerarquía Descartar≠Eliminar, revisión reordenada, salida direccional de cartas y sello de swipe; detalle en el [informe](../ai-handoff/CLAUDE_REDESIGN_CW-CL-002.md).
Decisiones relevantes: rojo solo para `Eliminar N` y sello; copys «Empezar a revisar/Terminar/Descartar/parecidas».
Validaciones: 34/34 tests, runtime 28 PASS, tsc, build web + Sites 4/4, build:native PASS (Node del runtime de Codex). 18 capturas demo con Edge; sin macOS, VoiceOver ni Dynamic Type.
Impacto para Codex: revisar el diff mixto de ManoApp, MotionConfig, Dynamic Type, aria-describedby nativo y QA nativa (§Para Codex del informe).
Pendientes: QA en dispositivo y commit autorizado.

### CW-CL-003 — Validación de la entrada nativa y dos correcciones CSS
Fecha: 2026-10-30, America/Bogota
Agente: Claude
Tarea: continuación de CW-CL-002, autorizada por el usuario («Ok, continua»).
Estado: completada local; sin commit.
Base Git / commit: main 0a6d32d dirty + CW-CL-002 sin stage.
Archivos modificados: mano/src/prototype.css (2 reglas); docs/ai-handoff/CLAUDE_REDESIGN_CW-CL-002.md (anexo); reference/2026-10-30-redesign/native-mock/.
Cambios realizados: CTA fijo de filtros alineado al borde de la hoja nativa; hoja nativa centrada a 560 px en pantallas ≥600 px.
Decisiones relevantes: render con puente Capacitor simulado fuera de la app (script en native-mock); ningún cambio de lógica ni de runtime.
Validaciones: 34/34 tests, runtime 28 PASS, tsc, build web + Sites 4/4, build:native + prepare-native PASS. Capturas SE/mini/Pro Max/iPad con mock; no es WKWebView.
Impacto para Codex: incluir las dos reglas en la revisión del diff de CW-HO-003; el script de mock puede servir para QA visual en Windows.
Pendientes: QA nativa en macOS/simulador.

### CW-CL-004 — Publicación y compilación iOS lanzada
Fecha: 2026-10-30, America/Bogota
Agente: Claude
Tarea: el usuario pidió compilar (Codex sin tokens) y autorizó commit + push con docs.
Estado: push hecho; compilación en cola, resultado no consultado.
Base Git / commit: commit 8e73093 sobre origin/main d65a416, creado con índice temporal; checkout local, índice y main local sin tocar (main local sigue en 0a6d32d, 7 por detrás).
Archivos modificados: publicados mano/src/{ManoApp.tsx,Filters.tsx,prototype.css}, mano/AGENTS.md, docs/, .claude/, AGENTS.md, CLAUDE.md. No publicados: CURRENT.md, .gitignore, mano/CLAUDE.md, mano/tools/.
Validaciones: run https://github.com/joacomino-dev/mano-iphone/actions/runs/41124449495 (queued al lanzarlo).
Impacto para Codex: sincronizar el checkout local con origin/main sin perder los archivos no publicados; revisar el resultado del run.

### CW-CL-005 — Publicación de documentos y compilación preparada para Codex
Fecha: 2026-10-30, America/Bogota
Agente: Claude
Tarea: el usuario pidió «sube lo que debas subir y deja listo para que Codex inicie la compilación».
Estado: completada local + remoto.
Base Git / commit: origin/main 8e73093; main local sincronizada (solo refs/índice; árbol de trabajo idéntico).
Archivos modificados: publicados .gitignore y docs (CLAUDE_LOG, CURRENT_STATE). Commit local sin push con mano/CLAUDE.md y mano/tools/ para que el push de Codex lance la compilación. CURRENT.md queda sin publicar.
Decisiones relevantes: no tocar mano/** en el push para no cancelar el run 41124449495 en curso.
Impacto para Codex: CW-HO-004.

### CW-CL-006 — Corrección de la compilación iOS (timeout de build-for-testing)
Fecha: 2026-10-30, America/Bogota
Agente: Claude
Tarea: corregir el run 41124449495 (job 124299285359, fuente 8e73093) a petición del usuario.
Estado: corrección publicada (86bbec1); nuevo run https://github.com/joacomino-dev/mano-iphone/actions/runs/41132758705 in_progress al cerrar, resultado sin consultar. Commit local de herramientas recolocado como d0241c2 sobre 86bbec1 (sin push).
Base Git / commit: origin/main f5f6208; commit de corrección solo con los 2 archivos de abajo.
Archivos modificados: mano/scripts/test-ios-simulator.sh; mano/ios/App/ManoUITests/PhotosSmokeTests.swift.
Cambios realizados: compilar ANTES de arrancar el simulador (sin arranque en paralelo); boot + bootstatus síncrono con límite 600 s; build-for-testing 900→600 s. Selectores XCTest: «Empezar a revisar», BEGINSWITH «Terminar», «Crear álbum nuevo».
Decisiones relevantes: diagnóstico = bloqueo, no lentitud. build.log completo (artefacto) muestra que tras CapApp-SPM quedó parado en CompileStoryboard (ibtool) y CompileAssetCatalogVariant thinned (actool), sin compilar Swift de App; el runner terminó un actool huérfano. Arranque en paralelo en primera migración; `simctl list` tardó 2,5 min (vs 43 s/13 s). Referencias: build sin arranque ~3,5 min (run 40964299983, que falló por bootstatus 240 s); arranque observado 4:48; build de dispositivo 45 s. Presupuesto peor caso antes de XCTest ≈2195 s < paso 38 min; esperado ≈20 min. Workflow sin cambios; runner estándar gratuito.
Validaciones: bash -n OK; 34/34 tests, runtime 28 PASS, tsc, build:native + prepare-native PASS. Swift/XCTest solo verificable en CI.
Impacto para Codex: revisar resultado del nuevo run; publicar IPA solo si pasan todos los gates.
Pendientes: resultado CI. CLAUDE_LOG/CURRENT_STATE y CODEX_LOG locales sin publicar.

### CW-CL-007 — Segunda corrección iOS: importación de medios de prueba
Fecha: 2026-10-30, America/Bogota
Agente: Claude
Tarea: corregir el run 41132758705 (86bbec1) a petición del usuario.
Estado: corrección publicada (6e9214e); run https://github.com/joacomino-dev/mano-iphone/actions/runs/41134652509 in_progress al cerrar, resultado sin consultar. Commit local de herramientas recolocado como 1980528 (sin push).
Archivos modificados: mano/scripts/test-ios-simulator.sh.
Cambios realizados: `simctl addmedia` 60→180 s; build-for-testing 600→480 s (presupuesto del paso igual: peor caso previo a XCTest ≈2195 s < 38 min); diagnóstico de fallo incluye assetsd/photolibraryd.
Decisiones relevantes: CW-CL-006 funcionó: build 1:53, arranque 2:55, instalación 1:25. Falló `addmedia` (>60 s) iniciada 85 s después del arranque; es la primera importación que crea la biblioteca de Fotos del dispositivo nuevo. En el run verde 40966694363 la misma importación, ~4 min tras el arranque, ya rondaba los 60 s.
Validaciones: bash -n OK; 34/34 tests; runtime 28 PASS.
Impacto para Codex: revisar resultado; IPA solo si pasan todos los gates.

### CW-CL-008 — Tercera corrección iOS: zoom automático en campos de 15 px
Fecha: 2026-10-30, America/Bogota
Agente: Claude (también en función de Codex y como auditor, a petición del usuario)
Tarea: corregir el run 41134652509 (6e9214e).
Archivos modificados: mano/src/prototype.css (fuente de select/campo de álbum: 15 px → 1rem = 16 px).
Diagnóstico: infraestructura ya correcta (build, arranque, instalación, addmedia, PhotoKit count=8, vídeo 69792 B). XCTest pasó sesión y álbum y falló en PhotosSmokeTests.swift:93: tras «Filtros» no existía ningún Switch. Jerarquía de triage del xcresult: hoja de Filtros nunca abierta, contenido web 430×933 en pantalla 402×874 (factor 16/15) con scroll horizontal. Grabación del test: zoom de WebKit al escribir el nombre del álbum (fuente 15 px < 16 px); iOS lo deshizo entre 135,5 s y 138 s, justo al tocar «Filtros», y el toque se consumió. La interfaz anterior también usaba 15 px (pasó por coincidencia de tiempos); además era un defecto visible para el usuario.
Auditoría del resto del test contra el código actual: Geek (role=switch), «Aplicar filtros», «Ampliar y anclar», inspector «Modo Geek/Ancho/Alto/nota local», «Cerrar» y marcas nativas MEMSWIPE_* coinciden. Selector `.date-fields input` sin uso (calendario propio), inocuo.
Validaciones: flujo equivalente al XCTest en bundle nativo con puente simulado (Edge 402×874): campos 16 px, sin desborde (402/402), Geek encontrado, inspector correcto, sin errores JS. 34/34 tests, runtime 28, tsc, build web + Sites 4/4, build:native + prepare-native, bash -n.
Publicado: 94d3362 (solo prototype.css). Run https://github.com/joacomino-dev/mano-iphone/actions/runs/41137661896 in_progress al cerrar; resultado sin consultar. Commit local de herramientas recolocado como a11d8ea (sin push).

### CW-CL-009 — Instalación de skills de diseño
Fecha: 2026-10-30, America/Bogota
Agente: Claude
Tarea: el usuario autorizó instalar y activar cinco skills de diseño UX/UI y desarrollo móvil.
Estado: completada local; sin commit.
Archivos modificados: .claude/skills/{ui-ux-pro-max,styleseed,swiftui-pro,frontend-design}/ (nuevos); CLAUDE.md (sección de skills y prioridad); .claude/skills/coco-mobile-ui/SKILL.md (paso 1).
Origen revisado antes de copiar (clonado en scratch, sin ejecutar instaladores npx): nextlevelbuilder/ui-ux-pro-max-skill@9a3f14f (solo la skill ui-ux-pro-max; sin tests); bitjaru/styleseed@ce66f1d (skills/styleseed; sin extensiones ni instrucciones de proyecto); twostraws/swiftui-agent-skill@f2920b6; anthropics/claude-plugins-official@a7ba5b9 (plugins/frontend-design). Word: anthropic-skills:docx ya disponible. «Impeccable Taste» no existe en styleseed; se instaló StyleSeed.
Dependencias: Python 3.13.16 (Python Software Foundation, winget, ámbito de usuario) para el buscador de ui-ux-pro-max; probado con consultas ux y stack swiftui.
Decisiones relevantes: StyleSeed sin setup/resolve/migrate/update sin aprobación (escriben instrucciones de proyecto o consultan la red). SwiftUI Pro aplica hoy al código nativo; la UI es React en WKWebView.
Validaciones: las cuatro skills aparecen registradas en la sesión; buscador de ui-ux-pro-max devuelve resultados.

### CW-CL-010 — Cuarta corrección iOS: mayúsculas CSS en el panel Geek
Fecha: 2026-10-30, America/Bogota
Agente: Claude (también en función de Codex y auditor)
Tarea: corregir el run 41137661896 (94d3362).
Archivos modificados: mano/src/prototype.css (`.geek-panel strong` sin `text-transform:uppercase`).
Diagnóstico: el arreglo de zoom funcionó (contenido 402×874, Filtros y Geek pasaron). Falló PhotosSmokeTests.swift:110: la jerarquía de triage muestra el inspector completo pero el título expuesto como «MODO GEEK»; WebKit entrega el texto transformado por CSS a XCTest y VoiceOver. El rediseño añadió esa mayúscula; antes no existía.
Auditoría: script que replica cada consulta del XCTest contra texto renderizado (innerText) sobre el bundle nativo con puente simulado: 18/18 OK, sin errores JS. Única mayúscula CSS visible restante: lema de bienvenida (no consultado). Marcas nativas PHOTOS_READ_OK y VIDEO_PREPARED_OK presentes en el run; target nativo de la app sin cambios desde el último verde (d65a416), solo el test.
Validaciones: 34/34, runtime 28, tsc, build web + Sites 4/4, build:native + prepare-native, bash -n.
Publicado: 726b2ba (solo prototype.css). Run https://github.com/joacomino-dev/mano-iphone/actions/runs/41140716793 en cola al cerrar; resultado sin consultar. Commit local de herramientas recolocado como 4760056 (sin push).

### CW-CL-011 — Revisión UI/UX, textos y código guiada por skills + quinta corrección iOS
Fecha: 2026-10-30, America/Bogota
Agente: Claude (también en función de Codex y auditor)
Tarea: el usuario pidió aplicar la revisión planificada con las skills, mejorar y recompilar.
Archivos modificados: mano/src/{prototype.css,ManoApp.tsx,Filters.tsx,InlineVideo.tsx}; mano/scripts/test-ios-simulator.sh; .github/workflows/build-ios.yml; informe docs/ai-handoff/CocoWash-Revision-CW-CL-011.docx.
CI: run 41140716793 falló al resolver capacitor-swift-pm (caché global de SwiftPM del runner apuntaba a un clon inexistente). Ahora -packageCachePath build/simulator-smoke/PackageCache en ambas llamadas del smoke y en el build de dispositivo.
Skills: coco-mobile-ui (dirección), ui-ux-pro-max (pautas y checklist), styleseed audit (solo lectura, sin preflight de red), frontend-design (marcas de plantilla), swiftui-pro (Swift nativo, hallazgos para Codex), code-review (6 hallazgos, todos corregidos), docx (informe).
Cambios: lema y «seleccionada» sin mayúsculas/mono; estado vacío sin controles inertes; textos de aviso, análisis, filtros, calendario, revisión y vídeo; avisos 3 s; CSS muerto fuera. Sin cambios de lógica, gestos, PhotoKit, borrado ni runtime.
Pendiente para Codex: forzados y GCD en PhotoLibrary.swift; botón «Abrir Ajustes» al denegar permiso.
Validaciones: auditoría XCTest 18/18; 0 textos transformados; sin objetivos < 44 pt ni texto < 12 px; 34/34, runtime 28, tsc, web + Sites 4/4, build:native.
Publicado: 906172f. Run https://github.com/joacomino-dev/mano-iphone/actions/runs/41142509421 en curso al cerrar; resultado sin consultar. Commit local de herramientas recolocado como 89c667e (sin push).

### CW-CL-012 — Sexta corrección iOS: resolución de paquetes Swift
Fecha: 2026-10-30, America/Bogota
Agente: Claude (también en función de Codex)
Tarea: el run 41142509421 (906172f) falló al minuto.
Diagnóstico: «Missing package product 'CapApp-SPM'». Con -packageCachePath (introducido en CW-CL-011) xcodebuild no resolvió paquetes: sin «Resolve Package Graph» y grafo de 2 targets frente a 6 en los runs que compilaron. Error mío.
Corrección (mano/scripts/test-ios-simulator.sh, .github/workflows/build-ios.yml): quitar -packageCachePath; borrar las cachés globales de SwiftPM del runner desechable (causa del fallo de 41140716793); paso explícito `xcodebuild -resolvePackageDependencies` acotado a 240 s con log propio y verificación de checkouts/capacitor-swift-pm antes de compilar; build 420 s y bootstatus 480 s para mantener el peor caso previo a XCTest en ~2257 s < 38 min. resolve.log y bootstatus.log añadidos al artefacto de diagnóstico. Workflow idéntico al último verde salvo esos dos paths.
Validaciones: bash -n; YAML parseado; ensayo en seco del script completo con xcrun/xcodebuild/PlistBuddy simulados: camino feliz EXIT 0 con orden correcto (reset de caché → resolve → build → vídeo → boot → install → addmedia → XCTest → marcas → limpieza) y camino de error que se detiene antes de compilar con mensaje claro. App sin cambios desde 906172f.

### CW-CL-013 — Mejoras UI/UX del usuario: vídeo, onboarding, anclaje, metadatos Polaroid/VHS
Fecha: 2026-10-30, America/Bogota
Agente: Claude (también en función de Codex, con alcance funcional explícito del usuario)
Tarea: aplicar las 11 observaciones del usuario (vídeo crítico primero) sin regresiones.
Archivos: mano/ios/App/App/PhotoLibrary.swift; mano/ios/App/ManoUITests/PhotosSmokeTests.swift; mano/src/{ManoApp,InlineVideo,Inspector,Filters}.tsx, {media,library,domain}.ts, prototype.css; nuevos {Onboarding,Screens,DisplaySettings,Loader,Vhs}.tsx y {meta,pixelfont,place,haptics}.ts; tests/meta.test.mjs; package.json (solo el script test añade meta.test.mjs).
Vídeo — causas encontradas y corregidas: (1) póster y vídeo en un único Promise.all: el fallo o la cancelación de uno tumbaba al otro y mostraba dos errores superpuestos (Photo + InlineVideo); ahora el póster precarga solo y el vídeo va en VideoStore con un único estado. (2) Timeout fijo de 180 s mataba descargas de iCloud que seguían avanzando; ahora watchdog por inactividad (90 s) realimentado por el progreso. (3) El progreso nativo `mediaPreparationProgress` existía pero nadie lo escuchaba; ahora llega a la UI (descarga 0–85 %, preparación/exportación 85–100 %). (4) La copia del AVURLAsset se hacía sin retener el asset (extensión de sandbox) y fallaba si no se podía leer el tamaño; ahora se retiene, el tamaño desconocido no es error y si la lectura falla se reexporta con AVAssetExportSession. (5) Más de 2 peticiones devolvían PREPARATION_BUSY como error; ahora la cola JS reserva un hueco para la carta visible y reintenta con back-off. (6) El handler de Capacitor responde a «bytes=0-» leyendo el archivo entero en memoria en el hilo principal; los vídeos preparados se sirven por un esquema propio `cocowash-media://` con rangos 206 en bloques de 512 KB. (7) En React StrictMode la limpieza borraba el `src` del <video> y no se restauraba (reproducido en preview: readyState 0); corregido. Pantalla completa: webkitEnterFullscreen conserva posición; si no, AVPlayerViewController (usa la copia local si existe) presentado desde el VC superior.
UI: sin Landing; onboarding de 4 tarjetas solo en el primer arranque (sin «saltar», Atrás/Continuar, progreso, demos animadas) que pide Fotos al final; pantalla de acceso con «Abrir Ajustes» (denegado) y relectura al volver; acceso limitado con «Elegir más fotos». Al montar ya no se llama authorize (no hay prompt sin explicación). Sesión arranca sola; «Terminar» lleva a un resumen de ronda. Cabecera con el nombre CocoWash. Pulsación prolongada: aislamiento en el sitio (+3 %, muelle críticamente amortiguado), la foto sigue al dedo, una única zona de anclaje abajo con respuesta progresiva y háptico; sale volviendo a la carta. Sin icono de ampliar: doble toque o pellizco amplían; botón accesible solo con foco. Pie Polaroid (lugar · fecha) y cinta VHS para vídeos con OSD pixelado propio (fuente 5×7 en SVG, aberración cromática, grano, jitter y parpadeo inicial, todo desactivado con Reduce Motion), composición adaptable A–D. Hoja «Filtros y ajustes» con pestañas: Ajustes de visualización persistentes (`cocowash-display-v1`), independientes de los filtros; Modo Geek pasa a Ajustes. Contador = revisadas/total del conjunto filtrado (filterScope) con número animado. Loader de marca (coco con anillo, progreso real cuando existe). Hápticos nativos contextuales con límite de frecuencia y opción de desactivarlos.
Ubicación: nuevo método nativo `place` (CLGeocoder, coordenadas redondeadas ~1 km, cola con 1,2 s entre consultas, caché local por id). Implica una consulta al servicio de Apple; está explicado en el onboarding y en Ajustes, desactivable. Decisión pendiente del usuario si prefiere desactivarla por defecto.
Skills: coco-mobile-ui (procedimiento), ui-ux-pro-max (búsquedas onboarding/carga/movimiento; su pauta «onboarding saltable» cede ante la instrucción expresa del usuario), styleseed review (checklist aplicada: hex a tokens, objetivos 44 px), swiftui-pro (Swift 5 + GCD por convención existente; force unwraps eliminados; CLGeocoder y exportAsynchronously deprecados en SDK 26: aviso, no error), frontend-design (dirección VHS/Polaroid).
Validaciones: 43/43 tests (9 nuevos), runtime 28, tsc, build web + Sites 4/4, build:native + prepare-native, bash -n. Preview demo verificada: onboarding 1–4, sesión automática, vídeo inline reproduce (readyState 4, pausa, tiempo, fin), descarte con contador, anclaje (proximidad 0→1, armado, «Anclada», salida monótona 346→301 px), filtro 24 h → 0 de 6, ajustes VHS 3→0 líneas y persistencia, fin de ronda, sin errores de consola.
No verificado: Swift no compila en Windows; reproducción real con vídeos locales/iCloud/HEVC/slow-motion, esquema `cocowash-media`, hápticos, geocodificación y XCTest actualizado (onboarding → permiso → anclaje por gesto) requieren el workflow macOS. Sin commit ni push.

### CW-CL-022 — Barra de decisiones cartoon + set «Favoritas»
Fecha: 2026-11-01, America/Bogota
Agente: Claude (con alcance funcional explícito del usuario)
Tarea: rediseñar e implementar la barra Eliminar · Favorita · Conservar a partir de la referencia del usuario (cápsulas con concavidad, corazón protagonista; Cuphead/Balatro/Papers, Please; coherente con Coqui y Memo), conectada a la lógica real.
Decisión del usuario: las favoritas siguen saliendo de la pila general; nuevo filtro «Favoritas» donde el corazón está encendido y las quita de Favoritas.
Archivos: nuevo mano/src/DecisionBar.tsx; mano/src/{ManoApp,Filters}.tsx, domain.ts, prototype.css; mano/ios/App/App/PhotoLibrary.swift (enumeración incluye favoritas con `favorite`); mano/public/assets/fonts/ (Patua One latin, OFL + licencia); tests/{domain,album-preview}.test.mjs.
Diseño: geometría vectorial calculada al ancho real; la concavidad es el desplazamiento de Minkowski de la silueta del corazón (hueco constante de 5 px entre contornos). Capas sólidas tinta #2A1C14 / crema #FCEFD9 / color (#4E5A68, #1E7470, corazón #EB4E69 muestreado de la referencia) y base de tinta de 3 px. Variantes por medición del texto: completa (flecha + icono + palabra, ≥16 px, iPhone Plus/Pro Max), compacta (icono + palabra, 393 y SE), solo icono (≤ 340 pt o texto grande). Pantallas cortas: botones 50 pt, corazón 62.
Interacción: pulsar hunde la cara sobre la base y vuelve con --cw-ease-settle; el lado hacia el que se arrastra la carta se eleva; deshabilitado = plano y atenuado; foco = anillo que sigue la silueta; Reduce Motion sin recorrido. En «Favoritas»: corazón encajado con filete crema (aria-pressed), Eliminar deshabilitado, deslizar a la izquierda no encola y avisa.
Dominio: Smart 'favorites'; acción 'unfavorite' (deshacer la devuelve; nativo Library.favorite false/true); conservar o «Más tarde» sobre una favorita la sella/pospone sin quitarla; nunca se encola para borrar. reconcileLibrary toma de Fotos el flag de favorita. La prueba de álbum que exigía «favorita nunca sellada» se actualizó a este contrato.
Validaciones: tsc; npm test 66/66 (6 nuevos); check:runtime 28; build + Sites 4/4; build:native (la fuente llega a dist/native). Preview demo con foto: 363 pt (más estrecho que SE), 393 pt 1:1, 430 pt, pantalla corta, 340 pt; pulsado, foco, Favoritas, Reduce Motion; flujo real conservar/eliminar/favorita/deshacer/Favoritas/quitar/deshacer. Suite Playwright del runtime con el Chromium preinstalado (config temporal, no versionada): 7/8; falla «BottomSheet remains mounted…», fixture que solo importa src/mobile y styles.css (sin cambios aquí).
No verificado: Swift no compilado (requiere CI macOS); WKWebView real en iPhone (paint-order en texto HTML, fuente, hápticos); favoritas reales de Fotos en el filtro.

### CW-CL-023 — CocoWash 0.8: pantalla principal en el lenguaje de la barra, icono, Terminar, VHS, sellos
Fecha: 2026-11-01, America/Bogota
Agente: Claude (alcance del usuario tras probar CW-CL-022 en el iPhone)
Tarea: extender el estilo de la barra de decisiones (sin tocarla) al resto de la pantalla principal; quitar el recuadro blanco del título; nuevo wordmark; foto centrada; progreso coherente; revisar colores del icono nuevo; tour visible; Terminar → última mirada → cerrar vuelve a las cartas; VHS Pequeño/Mediano iguales en la vista previa; explicación de sellos en Filtros.
Archivos: nuevo mano/src/Chrome.tsx (Wordmark SVG, PileProgress); mano/src/{ManoApp,Onboarding,Filters,DisplaySettings}.tsx, meta.ts, prototype.css; fuentes mano/public/assets/fonts/fredoka-latin-600.woff2 (+OFL); icono public/assets/app-icon.png e iOS AppIcon-512@2x.png; brand/{app-icon-source.png,recolor-app-icon.py,README.md}; versión 0.8.0 (8) en scripts/configure-ios.mjs y project.pbxproj.
Causas: recuadro = regla global `.mano-app [tabindex]:focus-visible` sobre el h1 enfocado por script (WebKit lo cuenta como foco visible); ahora excluye tabindex=-1. Foto descentrada = top 51 % y márgenes 12/8 del escenario; ahora 50 % y 12/12 (25/25 pt medidos). Terminar llamaba a closeSession antes de abrir la revisión; ahora la hoja se abre sobre la sesión y la ronda termina con «Eliminar N». VHS: el ajuste de letra redondea en medios píxeles con mínimo 1 px; en la miniatura de 232 pt s/m/l caían a 1 px; la vista previa se maqueta a 360 pt y se reduce (1,5/2/2,5 px, como en la tarjeta).
Diseño: pegatina común (borde crema 3,5, anillo tinta 2,5 y base de tinta sólida 3 px, sin desenfoque) en Filtros/Terminar, Deshacer/Álbum (teal profundo), «Más tarde» (café, color de su matasellos), segmentado, chips, casilla de selección, contador y CTA del tour. Contador de «Terminar» = insignia grafito (color de Eliminar). Progreso: canal con banda crema que se llena con el turquesa de la esponja + etiqueta del recuento. Wordmark Fredoka 600 en SVG (Coco blanco, Wash rosa, tinta, margen crema, tinta, base); Fredoka para el chrome, Patua solo en verbos de decisión.
Icono: fondo cian #01B4B5 fuera de paleta → turquesa oficial #1E7470, plano y a sangre (sin esquinas redondeadas horneadas); líneas negro-azuladas → tinta del modelo; coco/cerebro/esponja ajustados al arte modelo; sin halo cian (0 píxeles residuales).
Tour: clave v2 → se muestra una vez tras actualizar; con permiso ya concedido el último botón dice «Empezar» (el smoke test de simulador sigue viendo «Permitir acceso a Fotos»).
Validaciones: tsc; npm test 66/66; check:runtime 28; build + Sites 4/4; build:native (fuentes en dist/native). Preview demo: 363/393 pt y pantalla corta, grupo de parecidas, flujo Terminar→cerrar→cartas y Eliminar→celebración, VHS s/m/l, tour 1 y 4.
No verificado: iPhone real (Fredoka/paint-order en WKWebView, icono en pantalla de inicio).

### CW-CL-024 — CocoWash 0.9: refinamiento visual y paleta Coco Cream
Fecha: 2026-11-01, America/Bogota
Agente: Claude (encargo del usuario: mejora principalmente gráfica; sin push sin autorización)
Skills/agentes: coco-mobile-ui (procedimiento: baseline, capturas antes/después, contratos), frontend-design (criterio de dirección, restricción, anti-plantilla), agente ui-auditor (crítica independiente de solo lectura de las capturas «antes»). No hay skills taste/anti-slop/iOS/animación instaladas.
Diagnóstico: el tratamiento de pegatina (banda crema + anillo + base + texto contorneado) estaba en casi todo; las herramientas pesaban como las acciones; fondo teal oscuro + contornos café + rosa saturado = pesadez. La casilla de selección aparecía en cartas sueltas, donde no hace nada.
Cambios: paleta Coco Cream como 8 primitivas `--pal-*` en prototype.css con capa semántica encima; Coco Mint preparada en `:root[data-palette="mint"]` (sin control público). Nivel 1 (DecisionBar) intacto en geometría: contorno = color de texto #253A3A (el café deja de ser contorno), banda marfil, corazón #EF9A98 con base y filete «activo» #A3405A. Nivel 2: papel único marfil con grano al 18 % para Polaroid, tour y resumen; sombras teñidas del color de texto. Nivel 3: Filtros/Terminar en marfil con un filete, IBM Plex, sin base ni contorno de texto; progreso dentro de la cabecera (pista de 6 px + cifras); contador de Terminar en línea con papelera (= «N para eliminar»); Deshacer/Más tarde/Álbum sin discos (icono + etiqueta, 72×52 pt, reloj en café); segmentado y chips con un filete; casilla de selección solo en grupos. Wordmark retirado de la clasificación (h1 accesible conservado) y aligerado donde sigue. Cabecera estrecha (<330 pt): Filtros solo icono con nombre accesible.
Nativo (mínimo, necesario): PhotoLibrary.swift `.darkContent` (la hora sería blanca sobre crema); fondo de Capacitor, native.css y theme-color #F6F4EC. Versión 0.9.0 (9).
Validaciones: tsc; npm test 66/66; check:runtime 28; build + Sites 4/4; build:native; runtime Playwright 7/8 (mismo fallo previo de la fixture BottomSheet, solo runtime protegido); recorridos conservar/eliminar/favorita/deshacer/Favoritas/quitar/Terminar→cerrar→cartas/Eliminar→celebración; capturas antes/después en 4 estados (carta, grupo, VHS, pantalla corta) + 340 pt + tour/resumen/filtros/vacío/anclada + Coco Mint.
No verificado: iPhone real (barra de estado, WKWebView), Swift sin compilar aquí. Sin push (pendiente de autorización).

### CW-CL-025 — CocoWash 0.9.1: cabecera recuperada y material Warm Paper
Fecha: 2026-11-01, America/Bogota
Agente: Claude (encargo del usuario; versión 0.9.1, sin push sin autorización)
Skills/agentes: coco-mobile-ui (procedimiento y antes/después), frontend-design (criterio), ui-auditor (verificación independiente de capturas finales).
Cambios: cabecera de dos filas otra vez — Filtros · wordmark CocoWash (recurso existente, Chrome.tsx) · Terminar; debajo, pista de progreso turquesa de 8 px + contador en cápsula ligera (no se encoge: 313/1686 entero). Filtros/Terminar como cápsulas de nivel intermedio: marfil, contorno verde grafito 1,75 pt, base sólida de 2 pt que se hunde al pulsar, Fredoka sin contorno de texto. Insignia de Terminar otra vez superpuesta (absoluta, esquina superior derecha, grafito + anillo marfil + filete tinta), sin cambiar el ancho; crece a píldora con 2–3 dígitos; el texto accesible «, N para eliminar» sigue dentro del botón. Cabecera como container: ≤350 pt el nombre baja a 33 px; ≤318 pt Filtros pasa a icono con nombre accesible.
Material: fondo Warm Paper #F4EFE6 (texto 10,5:1; secundario 7,7; cifras 4,7) + textura procedural: public/assets/paper-grain.svg (feTurbulence 240 px enlazable, opacidad efectiva ~1–3 %) y paper-tone.svg (deriva tonal cálida 560 px, ~2 %), < 1 KB cada una, solo en el marco (.mano-app). Medido: desviación media ~2/255 y σ ≈ 1,8 niveles. «Revisión guardada»/celebración: papel texturizado + grano. Polaroid conserva su papel propio; sin textura en texto, iconos, fotos, vídeos ni controles.
Nativo: fondos #F4EFE6 (native.css, theme-color, Capacitor). Versión 0.9.1 (build 10).
Validaciones: tsc; npm test 66/66; check:runtime 28; build + Sites 4/4; build:native (texturas en dist/native); recorridos conservar/eliminar/favorita/deshacer/Favoritas/Terminar→cerrar/Eliminar; capturas 393/SE/340 pt, contadores 313/1686 e insignia 128 (inyectados en el DOM solo para la prueba), texto al 125 %, textura ampliada.
No verificado: iPhone real (textura en Retina/OLED, Dynamic Type real: el WebView no escala rem). Sin push.
Tras la verificación del ui-auditor: wordmark sin reserva de base (centro óptico = etiquetas, medido), nombre a 30 px ≤318 pt, contador con ancho mínimo por dígitos del total (pista estable 1/20→10/20, medido), insignia a -10/-12 (≈3 pt de la «r» al 125 %), icono Filtros del tour a 18, papel de celebración con velo 30 % (menos motas). El «círculo» del resumen era el cursor táctil del simulador (comprobado por teclado).

### CW-CL-026 — CocoWash 0.9.2: fondo más cálido y con más papel
Fecha: 2026-11-01, America/Bogota
Agente: Claude (ajuste puntual pedido por el usuario: solo el fondo principal)
Cambios: --pal-bg #F4EFE6 → #F3ECE1 (medio paso hacia beige; texto 10,3:1). Textura: grano 0,055→0,075, deriva tonal 0,05→0,06 y nueva capa public/assets/paper-fibre.svg (motas claras y oscuras a escala de fibra, feTurbulence .17, losa 300 px; tamaños 240/300/560 para que ninguna repetición se alinee). Probadas antes en maqueta: fibra anisotrópica (rayas verticales, descartada) y moteado de baja frecuencia (manchas de pergamino, descartado); elegido el punto intermedio entre la 0.9.1 y la variante más marcada. Único token de texto tocado por contraste: --pal-text-faint #566864 → #51625E (5,5:1 de media; ≥ 4,5 sobre el 1 % más oscuro del grano). Fondos nativos #F3ECE1. Sin cambios de layout, componentes ni comportamiento. Versión 0.9.2 (11).
Medido sobre píxeles de fondo en la app: media −2/−1,3/−0,6 niveles respecto al color plano, σ ≈ 7–10 (0.9.1: 6–7). Texto 10,1:1 y secundario 7,4:1 de media.
Validaciones: tsc; npm test 66/66; check:runtime 28; build; build:native (tres SVG en dist/native); capturas 0.9.1 vs 0.9.2 en carta, grupo y VHS; detalle a 3×. No verificado: iPhone real.
Seguimiento CI: el smoke test del simulador falló dos veces sobre 54965f2 (tour sin «Continuar» a los 240 s; luego «Cerrar» sin encontrar, app muy lenta). La única diferencia con la 0.9.1 verde eran filtros feTurbulence más pesados en fondos SVG, que WebKit re-renderiza al pintar. Corrección: la textura pasa a una sola losa horneada public/assets/paper-cream.webp (512 pt a 2×, 39 KB, sin costuras; fuente brand/paper-cream-tile.svg); se retiran los tres SVG. Aspecto medido igual (σ 8,5 vs 8,5). Coco Mint desactiva la losa (lleva el color crema). Chromium no mostraba diferencia de coste (cachea el SVG); WebKit no se pudo medir aquí.
Control CI: sobre main (0.7) el smoke test pasó en 13 min (run 41368573549) mientras 6f58033 fallaba en paralelo: la causa es de la rama, no del runner. Hipótesis: la textura pintada como fondo de .mano-app se repinta (pantalla completa, reescalada de 2× a 3×) con cada animación en un simulador sin GPU; la 0.9 sin textura tardó 10,7 min, la 0.9.1 19 min, la 0.9.2 excede. Corrección: la textura va en .mano-app::before con capa de composición propia (translateZ), rasterizada una vez; aspecto idéntico (estadísticas de fondo iguales).
Diagnóstico confirmado: la rama de prueba claude/ci-probe-flat-paper (0.9.2 con fondo liso) pasó el smoke test (run 41373241834, ~14 min) mientras 9019d4e con textura fallaba en las mismas condiciones. Causa: el simulador de iOS del runner compone sin GPU y la capa de papel a pantalla completa lo ahoga. Solución: solo las compilaciones de Simulator (#if targetEnvironment(simulator) en ManoBridgeController) inyectan data-paper="flat" (mismo color, sin textura); el IPA de dispositivo pinta el papel. El smoke test sigue validando el flujo completo; no valida la textura decorativa. Pendiente: confirmar fluidez en iPhone real.
Seguimiento CI (2): 247afe9 falló dos veces en el sistema, no en la app (instantánea de testmanagerd tras el permiso; luego sin alerta de Fotos en 240 s, con errores IOSurface de WebKit GPU). Con autorización del usuario: (a) se retira el userscript de Simulator y el selector data-paper; el workflow aplana el papel solo en la copia web instalada en el simulador (token --cw-paper-texture a none, idéntico a la rama de prueba que pasó) y lo restaura con cap copy antes de compilar el IPA, comprobando que la textura vuelve; (b) entrada manual ipa_even_if_smoke_fails: si el smoke test falla, el run sigue en rojo pero publica Mano-AltStore para probar en iPhone. Por defecto y en push a main no cambia nada. App igual a 9019d4e.
