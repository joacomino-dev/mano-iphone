# CocoWash — «Lo que importa, se queda»

App de iPhone y Android para ordenar la biblioteca de fotos con decisiones rápidas: cada
foto o vídeo llega como una postal y se decide con un gesto. Todo el análisis ocurre en el
teléfono; nada se borra sin la confirmación del sistema (Fotos en iPhone, Android en Android).

Estado: **0.9.9.2** (versión de bundle `0.9.9`; el build se ve en el arranque). iOS 17+,
solo iPhone, 7 idiomas (es, en, fr, de, it, ar, ja). Bundle `work.joaquin.mano`.
**Android** (en preparación para Google Play): Android 11+ (minSdk 30, targetSdk 36), mismo
`applicationId`, plugins Kotlin en `android/app/src/main/java/work/joaquin/mano/`, `npm run
sync:android`; hoja de ruta en `../docs/ai-handoff/ROADMAP_PLAYSTORE.md`.

## Cómo se usa

- **Derecha** conserva · **izquierda** marca para eliminar · **arriba** favorita ·
  **abajo** «Más tarde» (al final de la pila). «Deshacer» revierte la última decisión.
- **Terminar** abre «Una última mirada»: todo lo marcado, con «Recuperar» en cada
  elemento y «Recuperar todo». Solo «Eliminar» borra, y la app Fotos pide confirmación;
  lo borrado pasa 30 días en «Eliminado recientemente». Favoritas y ocultas se vuelven a
  comprobar justo antes y nunca se borran.
- **Filtros** (capturas, borrosas, parecidas, «Más tarde», fechas…), **Ajustes**
  (formato de fecha, sellos, iCloud, idioma, ayuda y privacidad) y **Apoyo** (compras).
- Las hojas se cierran con la X o deslizando hacia abajo desde arriba.

## Arquitectura

React 19 + TypeScript en un WKWebView (Capacitor 8) y dos plugins nativos en Swift:

| Pieza | Archivo | Qué hace |
|---|---|---|
| Interfaz | `src/ManoApp.tsx` | Pantallas, pila, hojas; orquesta el resto |
| Dominio | `src/domain.ts`, `sequence.ts`, `review.ts` | Decisiones, cola, sellos, orden de la pila (puro, con tests) |
| Medios | `src/media.ts`, `preload.ts` | Miniaturas, iCloud y vídeo con colas acotadas |
| Textos | `src/i18n.ts`, `src/locales/` | Español como clave; plurales con `Intl.PluralRules` |
| Anuncios y compras | `src/Monetization.tsx`, `adCadence.ts` | Cadencia, huecos de la carta, Apoyo |
| Canal | `src/channel.ts` | `DEVELOPER`: «Modo developer» solo en `main` |
| Fotos (nativo) | `ios/App/App/PhotoLibrary.swift` | PhotoKit, Vision (en el iPhone), vídeo, compartir, borrar |
| Monetización (nativo) | `ios/App/App/CocoMonetization.swift` | AdMob nativo, UMP + ATT, StoreKit 2 |

Reglas que no se rompen (ver `AGENTS.md`):

- Deslizar nunca borra; solo «Eliminar» en «Una última mirada», confirmado por Fotos.
- Sin servidores propios, cuentas, analítica ni telemetría. Las fotos no salen del iPhone.
- Solo APIs públicas de Apple: nada de esquemas de URL privados ni selectores ocultos.
- Los registros nativos (`devLog`) solo se escriben en Debug o en el simulador.

## Privacidad

Política publicada en https://joaquinmino.work/cocowash/privacidad.html (fuente en
`web/cocowash/`). Coherente con `ios/App/App/PrivacyInfo.xcprivacy` y con las respuestas
de `docs/appstore/app-privacy.md`. Si cambia qué datos salen del iPhone, se actualizan
los tres a la vez.

## Ramas y compilación

- **`main`** — desarrollo: anuncios de prueba de Google, «Modo developer» en Ajustes
  (modo de prueba con postales de ejemplo, anuncios sí/no). Cada push genera una IPA de
  desarrollo sin firmar (`.github/workflows/build-people-dev.yml`).
- **`release`** — App Store: `main` + un commit con los IDs reales de AdMob y
  `DEVELOPER = false`. `verify-release.yml` lo compila y comprueba. Para publicar:
  fusionar `main` en `release`, subir la versión y firmar.

```sh
npm ci
npm test               # dominio, i18n, cadencia de anuncios… (Node)
npm run check:runtime  # integridad de la vista previa protegida
npm run build          # web
npm run sync:ios       # web nativa + Capacitor + proyecto Xcode
```

Swift solo se compila en la CI de macOS (runners gratuitos de GitHub).

## Documentos

- Hoja de ruta a la App Store: `../docs/ai-handoff/ROADMAP_APPSTORE.md`
- Ficha, compras, privacidad, capturas, notas de revisión: `../docs/appstore/`
- Estado y bitácoras: `../docs/ai-collaboration/`
