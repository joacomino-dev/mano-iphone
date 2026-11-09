# Matriz técnica inicial de compatibilidad

**Seguimiento 2026-11-09:** candidato 0.9.9.2, código `837875e`, mínimo iOS 17 sin cambios.
Suite iOS estándar y emulador Android en curso; los resultados se enlazan en
[Release Candidate](RELEASE_CANDIDATE.md). El usuario confirma Live anclada y la
ausencia de raya en su iPhone, sin modelo/OS registrados. Esa observación no
completa las filas de hardware ni acredita Duo, iCloud o Instruments.

**Evidencia actual2026-11-08:** iPhone18Pro/iOS27.0, run42514969280,
fuente662e67d: Releasearm64 sin firma, permiso completo, álbum exacto/relectura,
metadata ygestos de anclaje/pinch PASS; diez ciclos XCTest PASS314s ypostaudit
PhotoKit10ausentes/unknown0 PASS. Live UI FAIL al localizar toggle; test corregido
pendiente. Métricas host BLOCKED por contador de proceso recién nacido; no se afirma
presupuestoPASS de esa serie. 59912d8 sí conserva series previas conpresupuestoPASS.
Ningún dispositivo físico probado. iOS17/18/26 siguen NOT TESTED nativos.
La lista oficial iOS27 se reconsultó el8nov: SE2 yposteriores/11 yposteriores,
18Pro/Max yDuo confirmados por Apple; eso no prueba la ejecución de CocoWash.

**Auditoría previa:** mínimo17 conservado. Run42438304068 identificado directamente: simulador iPhone Duo/iOS27.1, fuente83ff731, onboarding/acceso completo/sesión PASS, álbum FAIL. Postura/display activo no registrados; no acredita cerrado/abierto/transiciones ni los cambios actuales ece507b. Ningún dispositivo físico probado.

**RC histórica:** mínimo17 conservado. Ninguna nueva fila física/simulador Apple probada en aquella intervención. PASS ES/EN en Edge375×667,390×844,440×956 con teclado y texto raíz200%; no acredita Dynamic Type/VoiceOver/Island. Se reconsultaron listas oficiales iOS27 y fichas18 Pro/Max/Duo. Continúan candidatos, sin promesa de Duo optimizado ni cambios de orientación/API basados en suposiciones. [Resultados](RELEASE_CANDIDATE.md).

2026-11-07 · base y alcance en [README](README.md).

**Mínimo configurado: iOS 17.0, arm64, target iPhone.** No es todavía una
promesa de ejecución verificada en todas las versiones posteriores.
Los sistemas de la tabla son intersecciones con soporte de Apple: no significan
que un modelo reciente admita instalar un iOS anterior al que traía de fábrica.

| Familia / modelos | Sistemas candidatos | ¿Puede ejecutar según configuración? | Limitaciones / validación prioritaria | Prueba de ese modelo en esta intervención |
| --- | --- | --- | --- | --- |
| SE 2.ª / 3.ª generación | 17, 18, 26, 27 | Sí, condicionado a QA | Pantalla compacta, RAM/almacenamiento; estética ausente en 17 | NO VERIFICABLE físico; render Edge 375×667 VERIFICADO como aproximación de espacio |
| 12 mini / 13 mini | 17, 18, 26, 27 | Sí, condicionado a QA | Notch, teclado, texto grande, vídeos pesados | NO VERIFICABLE físico; 375×812 en Edge, sin notch real |
| XR / XS / XS Max | 17, 18 | Sí, condicionado a QA; no 26/27 | Primera cohorte candidata con menos recursos; estética no en 17 | NO VERIFICABLE; no aceptación física reciente acreditada |
| 11 / 12 / 13 / 14 / 15 estándar | 17, 18, 26, 27 | Sí, en versiones que el modelo admite | iCloud, codecs y rendimiento; notch frente a Island | NO VERIFICABLE físico; 390×844 en Edge no identifica modelo |
| 14 Plus / 15 Plus | 17, 18, 26, 27 | Sí, condicionado a QA | Ergonomía, proporción de fotos, borde inferior | NO VERIFICABLE físico |
| 11–15 Pro / Pro Max | 17, 18, 26, 27 | Sí, en versiones que el modelo admite | Island según generación, 48 MP/RAW/HDR y vídeos largos | NO VERIFICABLE físico |
| 16 / 16 Plus / 16 Pro / 16 Pro Max / 16e | 18, 26, 27 | Sí, condicionado a QA | Live Photos, HDR, alta resolución y tasa de refresco | NO VERIFICABLE físico |
| 17 / 17 Pro / 17 Pro Max / Air / 17e | 26, 27 | Sí, condicionado a QA | Nuevas dimensiones, Island, reanudación y anuncios nativos | NO VERIFICABLE físico |
| 18 Pro / 18 Pro Max | 27 | Sí por mínimo/arquitectura; pendiente ejecución | SDK 27.1 disponible en CI de la base; no basta para aprobar hardware nuevo | NO VERIFICABLE físico ni simulador identificado |
| Otras variantes llamadas “18” / “18 Plus” | Sin establecer | NO VERIFICABLE: no se inventa un modelo | Las fuentes oficiales consultadas identifican 18 Pro y Pro Max | Ninguna |
| Duo cerrado, ambas orientaciones y márgenes laterales | 27.1 para la experiencia del dispositivo | Candidato por arquitectura; adaptación completa NO acreditada | Cámara/barra lateral, insets asimétricos, continuidad | NO VERIFICABLE nativo/físico; solamente estrés geométrico web |
| Duo abierto, plano o plegado parcialmente | 27.1 | Candidato; no declarar optimizado | Interior regular/regular, orientación dinámica, regiones reservadas/cámara/bisagra | NO VERIFICABLE nativo/físico |
| Duo Split View y transición exterior↔interior | 27.1 | PENDIENTE | Mantener misma carta/selección/undo, vídeo, modal y coordenadas del anuncio | Resize 390×844→890×626→360×626→390×844 solo en Edge; no simula la bisagra |
| SE 1.ª, 6s/7/8/X y anteriores | No alcanzan iOS 17 | No, fuera del alcance | No reducir arquitectura ni dependencias para incluirlos | No requerido |

Los límites de OS proceden de las listas oficiales de
[iOS 26](https://support.apple.com/en-ie/guide/iphone/-iphe3fa5df43/ios) y
[iOS 27](https://www.apple.com/os/ios/). XR/XS pertenecen a la cohorte de iOS
17/18, excluida de las listas 26/27. Los modelos nuevos están confirmados en
[18 Pro/Max](https://www.apple.com/iphone-18-pro/specs/) y
[Duo](https://www.apple.com/iphone-duo/specs/).

## Matriz por sistema operativo

| Sistema | Declaración actual | Evidencia de ejecución |
| --- | --- | --- |
| iOS 15 / 16 | No soportados por la configuración de CocoWash | No ejecutados. El mínimo 15 de Capacitor no cambia los targets 17 |
| iOS 17.x | Mínimo configurado | PENDIENTE XCTest/WKWebView y dispositivo en este mínimo |
| iOS 18.x | Candidato; estética opcional con guard de disponibilidad | PENDIENTE; fuente incluye fallback si Vision falla |
| iOS 26.x | Candidato | PENDIENTE ejecución identificada sobre esta base |
| iOS 27.x / 27.1 | Candidato; SDK 27.1 compila la base | VERIFICADO histórico: Duo27.1 en run42438304068, sesión autorizada PASS/álbum FAIL sobre83ff731. Posturas y fuente actual pendientes |
| Betas o versiones posteriores | Sin promesa | NO VERIFICABLE hasta disponer del runtime y repetir gates |

## Otros dispositivos Apple

| Destino | Configuración comprobada | Pendiente |
| --- | --- | --- |
| iPad | Familia 2 no habilitada; no layout universal propio | Verificar disponibilidad/modo de compatibilidad de app iPhone en iPad. No confundir family=1 con exclusión administrativa |
| Mac Apple silicon | Sin target Catalyst explícito; binario iOS arm64 | App Store Connect puede habilitar apps iOS en Mac; revisar disponibilidad y decidir antes de publicar |
| Apple Vision Pro | Sin target visionOS propio | Revisar disponibilidad de compatibilidad en App Store Connect; no declararlo probado |
| Watch / Apple TV | Sin targets watchOS/tvOS | Fuera del producto actual |

La disponibilidad en Mac se administra aparte del target de Xcode:
[Apple, apps iOS en Mac](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/manage-availability-of-iphone-and-ipad-apps-on-macs-with-apple-silicon/).

## Funciones comunes y degradación honesta

- Fotos, favoritas, álbumes, revisión y borrado: dependen del permiso PhotoKit,
  no de tener un chip reciente. Con acceso limitado solo se ofrece el conjunto permitido.
- Parecidas y limpieza: Vision local; análisis parcial/omitido si la vista no
  está disponible. No interpretar ausencia de coincidencias como análisis completo.
- Estética: iOS 18+ y ejecución satisfactoria; si falta, no inventar puntuaciones.
- Personas / Breakup: retiradas en build 43; no existen como función compatible
  ni se exige Apple Intelligence para ellas. Solo queda limpieza de datos derivados antiguos.
- iCloud: necesita red para material no local; sin conexión deben conservarse
  decisiones y explicarse los elementos pendientes. Caché local no prueba descarga completa.
- Vídeo/Live Photo: formato y recursos del dispositivo importan; ficheros mayores
  de 512 MiB pueden alcanzar el límite de preparación. Probar fallback nativo.
- Ads/compras: requieren servicios externos; su fallo no debe impedir organizar
  medios locales. Restauración y caducidad necesitan sandbox/TestFlight.

## Criterio para subir una fila a probada

Registrar modelo real/identificador o UDID sintético de simulador, OS y build,
Xcode/SDK, SHA de fuente, permisos, conjunto demo, pasos, resultado y artefactos.
Una captura Edge, un build arm64 o un test en otro iPhone no satisfacen ese criterio.

## Evaluación del mínimo y cobertura — Fase 2

**Recomendación: conservar iOS17.** No se encontró un motivo comprobado para
elevarlo ni existe evidencia que permita rebajarlo a15/16. Capacitor permite15,
pero la combinación completa de código/StoreKit/Swift/medios debe verificarse en
el mínimo elegido, no inferirse del runtime de Capacitor. API de estética está
guardada en18; Personas/Breakup/Media Intelligence no son requisitos actuales.
No se encontró enlace a Media Intelligence en el proyecto actual inspeccionado.

| Criterio | Evaluación técnica / puerta pendiente |
| --- | --- |
| Cobertura | 17 conserva XR/XS/XS Max y SE2/3 como candidatos, más cohortes posteriores dentro de sus OS de fábrica; no se da porcentaje de mercado sin datos |
| Dependencias/API | Versiones fijadas y configuración17 coherentes en cuatro checks estáticos; falta compilación y ejecución del mínimo con Apple |
| Rendimiento | SE/compactos y XR/XS son la prioridad de memoria/decodificación; el perfil Windows muestra coste de serialización con 50k marcas, no rendimiento de esos teléfonos |
| Seguridad | Deployment17 no acredita un parche seguro o mantenido. Reconsultar actualizaciones de seguridad de Apple para cada OS y usar el parche aplicable más reciente en QA; no prometer mantenimiento de Apple por fijar un mínimo |
| Mantenimiento | 17/18/26/27.1 requieren cohortes separadas; ampliar a15/16 añadiría combinaciones sin evidencia ni necesidad justificada |

| Cohorte | Clase de ventana web ensayada (no tamaño nativo acreditado) | Riesgo / capacidades |
| --- | --- | --- |
| SE y compactos | 375×667, 375×812; estrés320×568 | Menor margen para miniaturas/vídeo y texto; UIKit/PhotoKit/Vision básicos, sin exigir Neural Engine/Face ID |
| Estándar / notch / Island | 390×844 | Cambios de permisos, reanudación y overlays; safe areas reales pendientes |
| Plus / Pro Max | 440×956 | Archivos de alta resolución, HDR y vídeos largos; pantalla amplia no garantiza memoria suficiente |
| Duo / especial | Estrés890×626 y360×626, resize dinámico | No presets oficiales; escenas/displays, cámara y bisagra requieren Device Hub/hardware |

**Estado de ejecución por modelo:** ninguna nueva fila de simulador Apple o
hardware se acredita en esta fase. Windows no dispone de esos SDKs. Las listas
oficiales 26/27 y las fichas 18 Pro/Max/Duo se reconsultaron; no se añadió una
variante de iPhone que Apple no documentara. [Detalle](PHASE2.md).

## Capturas ejecutadas y requisitos actuales

AndroidAPI35/x86_64, fuente813114c, run42516038859:28capturas reales RGB24,
1080×1920, ES/EN/FR/DE/IT/AR/JA, cuatro pantallas por idioma. Frontendtienda
verificado porhash, nativoDebug/testads. Esto prueba renderizado en el emulador,
no dispositivos físicos ni iPhone. Arabicmain yJapaneseReview inspeccionadas;
revisiónvisual de todas las imágenes aúnpendiente. Primerintentoincompleto por
recarga se conserva comoFAIL; no se da por corregido un bug sin causa demostrada.

Apple ahora exige al menos una captura de DynamicIsland (mediumdisplay) ynoalpha.
Duo tiene dimensiones propias yrequisito anunciado desdeabril2027 paraSDK27.1+.
No subir capturas Duo que prometan optimización sin auditar posturas/transiciones.
[Especificaciones oficiales](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/).
[Modelos iOS27](https://www.apple.com/os/ios/).
