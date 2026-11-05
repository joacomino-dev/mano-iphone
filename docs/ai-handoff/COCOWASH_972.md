# CocoWash 9.7.2 / build 20 — desarrollo para pruebas

Rama `cocowash/9.7.2`, desde d6d6f21: última entrega de 9.7.1, confirmada por el
usuario como funcional en iPhone. No se ha integrado en main ni publicado Release.
Los 24 archivos con diferencias previas de CRLF se conservaron sin cambios de contenido.
Respaldo previo verificado: `C:/Users/Joaco/CocoWash-Backups/20261105T003938Z-pre-972`.

## Paquete y validación

Fuente exacta: `01f150b8dcb1374dab52dcee084102d7734fc87c`.
[CI 41949432356](https://github.com/joacomino-dev/mano-iphone/actions/runs/41949432356):
**success**, Xcode 27.1, compilación Release arm64 para iPhone, SDK público real.
IPA de desarrollo sin firmar (firmar con el instalador habitual):
`C:/Users/Joaco/Downloads/CocoWash-9.7.2-desarrollo-01f150b8.ipa`.
5.782.219 bytes; SHA256 `2500ced0224112b4277a550c56ea22f8d2c9868f3dc6e2f7f84fa087416bd086`.
Recibo JSON junto al IPA. Verificados digest del ZIP de GitHub, CRC, ausencia de
entradas duplicadas, bundle `work.joaquin.mano`, versión/build, arm64, mínimo iOS17,
enlace **débil** a Media Intelligence, textura y marcadores del nuevo código.
No se instaló en el teléfono. Misma identidad de app: no desinstalar 9.7.1 para
actualizar y conservar los datos. Sin instalación paralela ni garantía de downgrade
del índice nuevo; existe backup privado previo a la migración.

## Problemas comprobados y solución

1. **Fragmentación:** en 9.7.1 cada entityID distinto de Apple recibía otro UUID;
   no existía reconciliación posterior. Se conservan FaceGroupAnalyzer y sus
   representaciones biométricas privadas; no hay umbral público configurable de
   distancia/embedding. Este mecanismo explica que la app perpetuara fragmentos,
   pero no acredita por sí solo la causa biométrica de cada caso del usuario.
2. **Identidad lógica estable:** `PeopleIdentity.swift:153` conserva asignaciones
   por rostro y ancla geométrica única en la misma foto no editada. Alias persistentes
   resuelven IDs antiguos, incluidos filtros/sesiones. Las correcciones ganan sobre
   el modelo; separaciones son barreras, exclusiones permanecen y nombres se conservan.
3. **Reconciliación global:** `People.swift:364` toma hasta cuatro fotos distintas
   por identidad, priorizando tamaño facial y separación temporal, y analiza sus
   recortes con un segundo índice del mismo framework. Representantes y resultados
   se reutilizan por firma; se eliminan muestras obsoletas. `PeopleIdentity.swift:57`
   exige al menos dos fotos por grupo y acuerdo de al menos tres cuartas partes
   sobre una misma entidad secundaria. No es una probabilidad de identidad.
   Rechaza puentes de una sola coincidencia, grupos con rostros en la misma foto,
   barreras manuales y nombres personalizados distintos. No construye una matriz
   de distancias entre todas las fotos. La reducción real de falsos positivos y
   fragmentos requiere medir con fotos etiquetadas, todavía no disponibles.
4. **Grupos pequeños:** `PeoplePolicy.minimumPhotos=5` centraliza la presentación.
   Membresía usa Set de fotos; publicación interna conserva también grupos menores.
   Solo la lista visible filtra por mínimo, después de reconciliar. IDs de grupos
   pequeños continúan siendo consultables y se reevaluarán con nuevos datos.
   Una identidad de una sola foto no se fusiona automáticamente sin más evidencia;
   es una limitación conservadora deliberada, no borrado ni ocultamiento del índice.
5. **Screenshots:** exclusión por `PHAsset.mediaSubtypes.photoScreenshot`, también
   de entradas antiguas al refrescar. No hay OCR ni cambio de otros filtros. No se
   incorporan screenshots a identidades consolidadas en esta política predeterminada.
6. **Publicación estable:** `People.swift:161,209,428` separa checkpoint de índice
   y snapshot comprometido en una transacción SQLite. Primera pasada con conjunto
   finito persistido; llegadas posteriores pasan al siguiente ciclo. Recursos no
   locales fallan con espera acotada y no mantienen la pantalla cargando eternamente.
   Durante incrementales se conserva la última publicación; referencias revocadas
   o desaparecidas se retiran inmediatamente por seguridad. UI sin porcentajes ni
   contadores, en submenú independiente. Puede seguir clasificándose fuera de Personas.
7. **Miniaturas:** `PersonMosaic.tsx` solicita hasta cuatro rostros distintos;
   `PeopleProcessing.crop` usa coordenadas almacenadas/refinadas con margen natural
   y orientación normalizada. No miniaturiza fotos enteras. Cola de dos, caché JS64,
   disco256/48MiB; no procesa identidad para mostrar un avatar. La selección favorece
   variedad temporal, no afirma medir expresiones o pose. Avatares cubiertos en Breakup.
8. **Censura:** `PeopleProcessing.refinement/censor`, `PeopleGeometry` y
   `PeopleMedia.tsx` generan el derivado nativo antes de mostrarlo. Segunda pasada
   solo sobre ROI facial con Vision landmarks, persistida y reutilizada; se refina
   una vez más cuando la resolución realmente aumenta. Óvalo inclinado con margen,
   unión de detección original/refinada, blur fuerte y borde suave. Barra inclinada
   usa ojos medidos; si faltan, usa óvalo. Geometría inválida/error deja cubierta
   completa y permite reintentar. La barra es censura parcial, no anonimización.
   Claves incluyen foto/edición/persona/revisión/estilo/tamaño; resultados tardíos
   y revelados interrumpidos se descartan. El original nunca se modifica.
9. **Ajustes:** exactamente Normal / Rostro censurado; óvalo/ojos son estilos
   secundarios. El antiguo modo oculto migra a rostro/óvalo, nunca a normal.
   Corazón roto no interactivo dentro de Polaroid; cambiar estilo no reinicia mano.
10. **Eficiencia e integridad:** actor y tareas utility; una imagen de indexación,
    lotes de cuatro, un contexto de modelo retenido por fase, liberado al terminar.
    Cede ante gestos/multimedia, calor, memoria y segundo plano; reanuda intención
    persistida al volver. Sin ejecución ilimitada de fondo. No solicita miniaturas
    originales adicionales para tarjetas protegidas. Precarga protegida de tres,
    cola1/caché16, derivados24/32MiB. Escrituras por filas sucias y metadata solo
    al cambiar. SQLite conserva backup de v1, publicación y alcance atómicos;
    error de publicación revierte cambios. Se eliminan también assets huérfanos
    del SDK tras interrupciones. Datos editados con correcciones no transferibles
    conservan referencia pendiente y muestran advertencia para revisión manual.

API utilizada: [Apple FaceGroupAnalyzer](https://developer.apple.com/documentation/mediaintelligence/facegroupanalyzer).
No dependencias nuevas, servicios externos, fotos subidas ni modelos descargados.
Personas mantiene gate físico iOS27/SDK/inicialización; resto iOS17 sin cambio.

## Pruebas verificadas y límites

- **113 Node**, TypeScript, runtime protegido28: PASS. Sesiones/decisiones50.000,
  alias, migración de modo, orden, filtros, undo30 y contratos existentes.
- Web y native-web builds, empaquetado Sites4: PASS. Sigue advertencia de bundle
  grande de Vite; no se hizo code splitting ajeno a la tarea.
- macOS/Swift CI: firmas/oráculo exacto, geometría300 y nuevas máscaras/landmarks,
  fusiones sintéticas conservadoras, relabel y correcciones, ciclo finito,
  SQLite50.000 metadatos, backup/reapertura/rollback transaccional: PASS.
- Edge con bridge explícitamente simulado: submenú, no provisionales/contadores,
  organización durante análisis, cuatro solicitudes faciales, modos/estilos,
  corazón, misma mano tras recarga, avatares protegidos: PASS.
- Fixtures Edge normal/Reduce Motion: Terminar, respuestas tardías, cobertura,
  revelado cancelado y reintento sin caché nativa: PASS. Hook con consentimiento,
  pausa, membresía estable, evento Photos y correcciones: PASS. Demo aplicación:
  logo inerte, Terminar vacío, undo30 y recarga exacta: PASS. Cero errores JS observados.
- Evidencia local generada: `work/qa-972/`; capturas usan gráficos demo, no rostros.
  No equivale a ejecución nativa ni precisión facial. Una captura adicional intentó
  reabrir una vista ya abierta y agotó espera; se corrigió el recorrido de captura,
  sin modificación de app, y la ejecución final pasó.
- **Pendiente físico:** precisión, fusiones indebidas, poses/edades/gafas, orientación
  real PhotoKit, transiciones privadas en WKWebView, FPS/RAM/calor y biblioteca grande.
  Sin dataset etiquetado no se afirma mejora cuantificada. SDK update es cooperativo:
  una operación ya iniciada puede tardar en ceder. Recursos solo iCloud sin vista
  local se omiten/reintentan al revisar agrupaciones; censura permanece cubierta
  hasta disponer de imagen local. No hay descarga masiva ni indexación de vídeos.
- Migración comprobada con datos sintéticos, no con copia del índice privado real.
  No usar reset como primer paso si interesa conservar nombres/correcciones.

## Prueba personal y medición reproducible

- [ ] Instala encima de 9.7.1 y abre: decisiones, filtros y mano conservados; fallo:
  mano vacía inesperada, decisiones/nombres perdidos. No borres el índice para probar.
- [ ] Filtros → Ver grupos: durante primera reconstrucción solo indicador/mensaje;
  vuelve y clasifica varias fotos. Fallo: grupos provisionales, contadores o gestos trabados.
- [ ] Al terminar revisa tus fragmentos conocidos y personas parecidas. Cuenta
  identidades duplicadas **y** fotos ajenas en cada grupo; menos grupos no basta.
  Resultado esperado: evidencia suficiente consolida, dudas quedan separadas.
- [ ] Comprueba cinco fotos distintas por tarjeta y hasta cuatro recortes del rostro
  correcto, incluso en foto grupal. Fallo: caras ajenas, imagen completa o orientación errónea.
- [ ] Renombra, separa/excluye un rostro y reinicia; vuelve a «Revisar agrupaciones».
  Debe conservar correcciones/IDs. Añade nuevas fotos: actualización sin lista fluctuante.
- [ ] Ajustes → Rostro censurado → óvalo/ojos. Revisa inclinadas, pequeñas,
  horizontales/verticales y grupales; cambia rápido, abre inspector, interrumpe app.
  Debe verse corazón y rostro protegido siempre; si falta geometría, cubierta u óvalo.
  Cualquier destello de rostro original sin revelado explícito es fallo prioritario.
- [ ] Normal elimina corazón/censura; vuelve a protegido y reinicia: estilo y mano
  se conservan. Revelado temporal termina al interrumpir o cambiar foto.
- [ ] Prueba foto solo iCloud sin red, permisos limitados, pausa/reanudación y nueva
  captura de pantalla: sin carga eterna ni inclusión no autorizada; screenshot no crea grupo.
- [ ] Descarta solo demo, deshaz, recarga, Terminar vacío/con pendientes. Fallo:
  pérdida de decisión, salto de orden o borrado por gesto. No confirmar borrados personales.
- [ ] Sesión sostenida organizando mientras analiza: anota modelo/iOS, cantidad de
  fotos locales, fase y temperatura. Con Instruments comparar 9.7.1/9.7.2 en mismas
  condiciones: Allocations/VM, Time Profiler, hitches y latencia de gesto. Bibliotecas
  100/1.000/10.000/50.000 son protocolos pendientes, no benchmarks realizados.

Para precisión: conjunto local etiquetado por persona y foto, fijar mismos recursos,
comparar fragmentos por identidad y pares falsamente fusionados antes/después,
separando cambios de apariencia y fotos grupales; no subir biometría al repositorio.

## Handoff visual CW-HO-008

Codex → usuario (pruebas físicas) → Claude (refinamiento), lista, sin aceptación
9.7.2 ni integración. Claude puede refinar composición de mosaicos, posición/icono
del corazón, jerarquía del submenú y acabado de estados/controles. Mantener dos modos,
estilos secundarios, cobertura preventiva, colas/cache, geometría nativa, claves de
invalidación, protección de previews y contratos PhotoKit. No cambiar algoritmos,
borrado, persistencia ni tiempos/curvas existentes como efecto de la revisión visual.
