# CocoWash 9.8 · build 27 de desarrollo (Claude)

Rama `claude/cocowash-9.8` desde `claude/people-crash-b24` (`36b4267`). Sin merge a
`main`, sin Release, sin instalación física. Worktree `C:/Users/Joaco/Developer/CocoWash-b24`.

## Decisión del usuario (2026-11-05)

Tras probar build 26: «todo está bien menos lo de los rostros». Personas y
Breakup Mode salen por completo de la app.

## Cambios

- **Personas y Breakup Mode retirados**: UI, hook, puente, motor nativo
  (`People*.swift`, traza, MetricKit), pruebas y pasos de CI. Los filtros guardados
  descartan `person/breakup/censorStyle` al cargarse; decisiones, sellos, sesión y
  Deshacer se conservan. `LegacyPeopleCleanup` borra `CocoPeople` y
  `CocoPeopleTrace` en cada arranque: no queda ningún dato facial en el teléfono.
  Texto de permiso de Fotos vuelve al de 0.9.7.
- **Orden inicial**: la primera vez, al azar, cualquier fecha, todo el contenido.
  Los filtros aplicados se guardan entre sesiones.
- **Compartir**: arriba a la derecha en fotos; en vídeos, en la misma fila y con el
  mismo estilo que volumen y VHS.
- **Resumen tras Terminar/Eliminar**: sin acceso a Filtros; solo «Seguir revisando»
  (y «Una última mirada» si queda algo marcado).
- **Modo de prueba** (Ajustes, solo iPhone, se retira en 1.0): la demo del teléfono
  dentro de la app — postales de ejemplo, cada acción imitada, nada se lee ni se
  escribe en Fotos, almacenamiento aparte — con anuncios de prueba cada 4–6 fotos y
  una carta en cada cierre. Indicador «Modo de prueba» en la pantalla.
- **Pestaña Apoyo**: los tres productos como sellos postales perforados grandes
  (año, para siempre, café), restaurar y privacidad de anuncios.
- **Anuncios como cartas**: papel de carta con ribete de correo aéreo, «Publicidad»
  en un sello de franqueo y el saludo «Esta carta mantiene CocoWash gratis». Ningún
  botón: se quitan deslizando (el primero aparta, el segundo despide), en la pila y
  en el resumen. VoiceOver tiene la acción «Seguir sin el anuncio».
- **Ajustes** reordenado por uso: Fotos, Vídeos, Sellos, Nitidez, iCloud,
  Experiencia, Biblioteca, Modo de prueba, Introducción. Título de la hoja según la
  pestaña.
- **Zángano Studio**: el bloque crece un 30 %; isotipo a 50 px, ≈1,4× el bloque del
  nombre.
- **Antigenéricos**: monoespaciada solo donde es material (Polaroid, sellos, VHS,
  Geek); sin metadatos unidos con «·» en formatos; CSS muerto de Personas eliminado.

## ¿Cómo ver los anuncios?

Activa Ajustes → Modo de prueba. En pocas decisiones aparece la carta de prueba de
Google en la pila, y otra al terminar la ronda. Así se revisa diseño, gesto y
consentimiento sin tocar tus fotos. En una versión de App Store hacen falta tus
IDs reales de AdMob; las compras necesitan productos en App Store Connect.

## Validación

Windows: 114 pruebas Node, TypeScript, runtime 28, builds web y native-web, Sites 4.
Edge con puente simulado: 16 capturas en `work/qa-98/` (antes en `work/qa-98-before/`),
390×844 y 375×667 con texto 130 %, sin errores JS (`mano/tests/qa-98-capture.mjs`).
La carta nativa solo se ve en el iPhone (la web reserva su hueco).
[CI 42134090699](https://github.com/joacomino-dev/mano-iphone/actions/runs/42134090699) **success**:
Swift, Release iPhone con GoogleMobileAds y smoke de arranque (reset opcional, reapertura del
mismo build y borrado de `CocoPeople` comprobado). IPA de fuente `50467a8`:
`C:/Users/Joaco/Downloads/CocoWash-9.8-build27-50467a8.ipa`, 7.003.770 bytes, SHA-256
`2753e93b9af993d1b455f50c1cf8001b37c2bc9ebd88de177ca0abaaa92e67bc`. 9.8 (27), sin reset,
anuncios de prueba activos, sin `MediaIntelligence` en el binario.

## Pendiente

Prueba en iPhone: carta y gesto, consentimiento, modo de prueba y su reinicio,
Compartir en vídeo. IDs reales de AdMob, productos en App Store Connect y
etiquetas de privacidad antes de la App Store. Retirar el modo de prueba en 1.0.
