# CocoWash 9.8.1 · build 28 de desarrollo (Claude)

Rama `claude/cocowash-9.8.1` desde `claude/cocowash-9.8` (`5a18c44`). Sin merge a
`main`, sin Release, sin instalación física. Worktree `C:/Users/Joaco/Developer/CocoWash-b24`.

## Pedido del usuario (2026-11-05, tras probar 9.8)

Anuncios (validador, resumen roto, carta fija en «Una última mirada», cada 20–30
fotos), modo de prueba infinito, parpadeo al pasar de Filtros a Ajustes, rejillas
en Ajustes y Filtros, cinco idiomas, versión en el arranque, sellos de Apoyo, «g»
cortada, corazón rosa Wash, iCloud anticipado, intro de zoom, foto anclada más
limpia y cierre tocando fuera; todo para la App Store mundial.

## Cambios

- **Anuncios**: `GADNativeAdValidatorEnabled = NO` (el aviso solo existía con
  anuncios de prueba). Frecuencia 20–30 fotos, primera tras 1 min, 30 s mínimo
  entre cartas. Nueva carta **compacta y fija** (`inline`: media 120 × 120,
  «Publicidad», titular, botón) en el resumen y sobre «Recuperar todo»; se abre
  tocándola. La carta de la pila sigue saliendo solo deslizando. El hueco web se
  mide cada fotograma: mientras se mueve o no está entero en pantalla la carta
  nativa se oculta y vuelve al mismo sitio, sin salirse del margen. Las cartas de
  revisión y de resumen se turnan (`finishDue`): resumen cada 3 rondas (2 en
  prueba), máximo 2 al día. Textos de la carta en el idioma de la app.
- **Modo de prueba infinito**: cuando quedan menos de 8 cartas se reparte otra
  ronda de postales (`demoRound`, ids `demo-n~r`); se recuerdan las rondas; nada
  toca Fotos.
- **Parpadeo VHS**: Ajustes se monta al abrir su pestaña y la vista VHS ignora
  medidas 0 × 0.
- **Ajustes y Filtros**: opciones en rejilla de anchos iguales (2 o 3 columnas,
  filas completas). Fecha con 6 formatos (dd/mm/aaaa, mm/dd/aaaa, ISO, «17 jun
  2021», «jun 17, 2021», «jun 2021»). Filtro de fecha «Último año». Orden con «Al
  azar» en su fila y parejas opuestas. iCloud como interruptor «Ahorrar datos».
  Nuevo grupo Idioma.
- **Idiomas**: español (fuente), inglés, francés, árabe (RTL) y japonés.
  `i18n.ts` + `locales/*.ts` (403 textos, 29 mensajes nativos, 11 plurales con
  reglas de cada idioma). Idioma = elección en Ajustes, si no el del iPhone
  (inyectado por `ManoBridgeController`), si no inglés. `InfoPlist.strings` por
  idioma para los permisos. Prueba `i18n.test.mjs`: nada falta, mismos marcadores.
  Árabe: la barra de decisión mantiene lados físicos, sin espaciado entre letras,
  números latinos aislados. Francés: Ko/Mo/Go. VHS en inglés para árabe/japonés.
  Sellos de decisión: fuera del español, el sello ilustrado con la palabra en HTML.
- **Apoyo**: sellos postales reales (perforación por máscara en los 4 lados,
  marco interior, valor como franqueo, matasellos «Activo»); «Pronto» si no hay
  precio.
- **Otros**: versión «9.8.1 (28)» muy tenue bajo Zángano; pie Polaroid sin
  recortes; corazón #F17472 (rosa de «Wash») con base #B8444B; iCloud se descarga
  al llegar a la pila y anticipa la fila (por defecto; la etiqueta «vista ligera»
  solo si falla o con ahorro); intro 3 «Toca y haz zoom» (toca 5,2 s con dos
  toques sobre un grupo de 3; zoom: mantén y ancla, o pellizca); foto anclada sin
  ± ni %, pellizcar/arrastrar también alrededor y tocar fuera cierra.

## Validación (Windows)

119 pruebas Node (incluye i18n y cadencia), TypeScript, runtime 28, builds web y
native-web. Edge con puente simulado: 82 capturas en `work/qa-981/` (5 idiomas,
iPhone SE 130 %), sin errores JS; foto anclada cerrada tocando fuera en los 5;
carta del resumen dentro de la tarjeta sin scroll. La carta nativa solo se ve en
el iPhone.
[CI 42153652260](https://github.com/joacomino-dev/mano-iphone/actions/runs/42153652260) **success** (Swift, Release con
GoogleMobileAds, arranque). IPA de fuente `49f416b`: `C:/Users/Joaco/Downloads/CocoWash-9.8.1-build28-49f416b.ipa`,
7.050.697 bytes, SHA-256 `a79df37dbe23bacea0ed0ec7aebca4efa28deb44799b991dca574cf8617a96af`; 9.8.1 (28), sin reset,
anuncios de prueba, validador desactivado, `CFBundleLocalizations` es/en/fr/ar/ja y sus `InfoPlist.strings`.
La CI anterior (`b207c04`) dejó `en` fuera por `configure-ios.mjs`; corregido en `49f416b`.

## Pendiente

Prueba en iPhone: cartas compacta y de pila, consentimiento, modo de prueba sin
fin, idiomas (Ajustes › Idioma) y árabe RTL. Antes de la App Store: IDs reales de
AdMob, productos en App Store Connect, fichas de la tienda en los 5 idiomas y
etiquetas de privacidad. Retirar el modo de prueba en 1.0.
