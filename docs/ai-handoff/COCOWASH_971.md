# CocoWash 9.7.1 / build 19 — desarrollo, sin publicar

Base exacta: `a3dba60051b4705cd403cae2f9ee6988aede7ea1`, estable **0.9.7/18**,
aceptada en iPhone. Rama única `cocowash/9.7.1`. Se usa literalmente la nueva
numeración solicitada `9.7.1`, no una versión de cuatro componentes. Main y el IPA
estable permanecen intactos. Sin Release, App Store ni instalación en el teléfono.
El IPA de desarrollo usa el bundle existente: instalarlo sustituye la app local;
no ofrece instalación paralela. No desinstalar para probar: conserva las decisiones.

## Paquete de prueba verificado

Fuente `268224a9f49bb52bbc62c7b149d2d9b4327338c7`;
[CI 41936437603](https://github.com/joacomino-dev/mano-iphone/actions/runs/41936437603) **success**.
111 pruebas Node, runtime28, TypeScript, web/native-web, Sites4, regresiones Edge,
oráculos Swift de firmas/geometría y checkpoint de 50.000 registros sintéticos PASS.
IPA: `C:/Users/Joaco/Downloads/CocoWash-9.7.1-desarrollo-268224a9.ipa`;
5.665.113 bytes; SHA256 `729dfa41479f9757540c9412c026ba5a3b812db4a9e3e9f45d768eca56e32b7a`.
CRC/identidad/textura, digest de artefacto y símbolos de agrupación nativa verificados;
Media Intelligence enlazada débilmente con mínimo iOS17. No es validación de ejecución
en iOS17 ni de reconocimiento/censura en iPhone. Recibo JSON junto al IPA.
Solo documentación cambia después de ese commit, manteniendo idéntica la app compilada.

## Implementación

- Personas, dentro de Filtros: consentimiento explícito, grupos anónimos con
  fotografía representativa, selección combinable con filtros y decisiones
  existentes, nombre opcional, unificación, exclusión y separación por **rostro**.
- Motor público [FaceGroupAnalyzer / Media Intelligence](https://developer.apple.com/documentation/mediaintelligence/facegroupanalyzer),
  iOS27+. Detección y agrupación de identidades del framework; no sustituirlas por
  similitud de imágenes de Vision. Sin modelo descargado, servicios ni dependencia nueva.
- El resto conserva iOS17+. Personas se oculta si no existe el SDK/API, en
  Simulator o si falla la inicialización real del analizador. No hay lista
  arbitraria de generaciones, requisito de Apple Intelligence ni implementación Android.
- Actor fuera del hilo principal, una imagen por vez, lotes de cuatro y agrupación
  periódica (primera tanda, cada 64 nuevas o al terminar). Cede ante preparación
  multimedia/gestos; pausa al salir, presión térmica o aviso de memoria. Reanudar es
  explícito. Sin promesa de ejecución ilimitada en segundo plano.
- Progreso/checkpoints SQLite del sistema, transacciones, actualización por filas;
  índice biométrico gestionado por Apple en su directorio. Cambios de Photos y
  firma de edición invalidan referencias; se reconcilian permisos limitados.
- Solo vistas **locales** para indexar/censurar, sin descargas masivas. Las fotos
  sin vista local quedan pendientes y se reintentan al reanudar. No se indexan vídeos.
- Breakup: normal, rostro censurado u ocultación completa con revelado explícito
  de tres segundos. Imagen censurada nativa **antes** de insertarse en el DOM;
  no desenfoque CSS aplicado después de mostrar el original. Coordenadas
  normalizadas de origen superior izquierdo sobre píxeles normalizados en orientación.
  Coincidencia obsoleta, rostro diminuto, geometría inválida o error → cubierta completa.
- La protección alcanza tarjetas, revisión, inspector y vistas de Personas.
  Reproducción externa/Live Photo bloqueada durante protección. Revelado cancelado
  al interrumpir/cambiar foto; respuestas tardías no cruzan identidades ni modos.
- Tamaños de tarjeta/zoom reutilizan la política existente; revisión usa miniaturas.
  Cola protegida de una preparación, 16 referencias; derivados con límite de 24
  archivos y 32MiB. Nunca modifica archivos de Fotos.
- Datos en Application Support con protección de archivo y excluidos del backup.
  «Desactivar y borrar índice» elimina agrupaciones, nombres y derivados; olvida
  referencias de Personas en historial sin perder decisiones ni orden.
- Terminar vacío: shake 280ms, sin finalizar; tercer toque en tres segundos muestra
  aviso centrado. Reduce Motion sin desplazamiento. Con pendientes abre revisión.
- Logo: zona no interactiva y sin tap highlight; se conserva la sustitución por avisos.
- Nube: rotación limitada al SVG del anillo; el icono permanece vertical.
- Deshacer: límite único 10→30, tanto al decidir como al validar/recuperar sesión.

## Superficie y comprobaciones

Nativo: `People.swift`, `PeopleCheckpoint.swift`, `PeopleGeometry.swift`, registro
en `PhotoLibrary.swift`, proyecto Xcode, propósito de Fotos y versión/configurador.
UI/dominio: `PeoplePanel`, `PeopleMedia`, `usePeople`, `people`, `FinishButton`,
`finish`, Filters/ManoApp/Inspector/ReviewGrid/Cloud/domain y estilos de la app.
Runtime Product Design, bundle, permisos de acceso, claves de sesiones, gestos y
confirmación/reconsulta de favoritas para borrar se conservan.

Resultados y SHA del paquete se cierran en CW-CX-014. Tests Node y navegador no
acreditan exactitud facial ni rendimiento físico. Fixtures de puente son mocks
explícitos, aislados de producción. El test de 50.000 filas prueba metadatos SQLite,
**no** reconocimiento sobre 50.000 fotografías. CI de desarrollo gratuito:
[workflow](../../.github/workflows/build-people-dev.yml), runner estándar `xcode-27`.

Antes de distribución pública deben validarse las nuevas declaraciones de privacidad
y retención en la política de la app y App Store Connect, conforme a las
[reglas de Apple](https://developer.apple.com/app-store/review/guidelines/#privacy).
No se cambia `NSPrivacyCollectedDataTypes` para afirmar envíos inexistentes.

## Aceptación física pendiente

Usar una biblioteca de prueba; nunca confirmar borrados en biblioteca personal.

| Prueba | Acción y resultado esperado | Fallo |
|---|---|---|
| ☐ Consentimiento/capacidad | iOS27: abrir Filtros → Personas; antes de aceptar no analiza; activar inicia progreso real | Trabajo antes de consentir, función visible sin capacidad, porcentaje inventado |
| ☐ Agrupación | Fotos de una persona, varias personas, poses y desconocidos; revisar grupos y representativas | Mezclas sistemáticas o identificación forzada |
| ☐ Correcciones | Renombrar, unificar dos grupos, excluir un rostro y separar otro; cerrar/reabrir | Cambios perdidos, otra cara modificada o fotos eliminadas |
| ☐ Pausa/cambios | Pausar, cerrar app, volver y reanudar; añadir/editar fotos y reducir acceso en Ajustes | Repetición completa, referencias revocadas o progreso perdido |
| ☐ Breakup | Censura/ocultación con fotos verticales, horizontales, EXIF rotado y varios rostros; avanzar rápido, deshacer, anclar y abrir revisión | Un solo fotograma sin protección, rostro equivocado descubierto o original cambiado |
| ☐ Revelado/iCloud | Revelar explícitamente y esperar tres segundos; bloquear/salir durante carga; probar una foto sin vista local | Revelado espontáneo/tardío, descarga masiva o bloqueo sin salida |
| ☐ Borrar índice | Confirmar desactivación y borrado, reabrir; decisiones/fotos intactas, índice/nombres ausentes | Persisten grupos o se pierden decisiones |
| ☐ Correcciones generales | Terminar vacío 1/3 toques; con pendientes; tocar logo; nube vertical/horizontal; 30 acciones, reiniciar y deshacer | Finaliza vacío, aviso al primer toque, logo parpadea, nube girada o undo incorrecto |

Con 100/1.000/10.000/50.000 fotos, medir en el mismo teléfono tiempos a primer
grupo y a tarjeta manipulable, picos/tendencia de memoria, hitches y estado térmico
con Instruments/registro local; comparar indexación apagada, activa y pausada.
Registrar tamaño/acceso local/iCloud y condiciones. No hay mediciones de FPS,
RAM, energía ni precisión facial física en esta entrega automática.
