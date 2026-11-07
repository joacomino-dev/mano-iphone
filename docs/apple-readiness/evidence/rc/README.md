# Evidencia RC — 7 noviembre2026

`results.json` identifica fuente, alcance y counts. El informe principal es
[RELEASE_CANDIDATE](../../RELEASE_CANDIDATE.md). No contiene medios personales,
credenciales, archivos de firma ni SDK binarios.

- `flow-before.json`:2 fallos de producto reproducidos sobre b0cf83d.
- `flow-after.json`:10 escenarios posteriores de favorita/monetización sintéticas.
- `web.json`, `safety.json`, `accessibility.json`:19+9+6 casos Edge.
- `node.log`, `release.log`, `native-contract.log`, `sites.log`, `runtime.log`:
  120+6+4estáticos+4+8 originales.
- `web-build.log`, `native-web-build.log`, `capacitor-sync.log`: compilaciones web
  y sync Windows; NO Swift/Apple SDK.
- `release-source.json`: icono, versión/build, longitudes ES/EN y configuración fuente.
- `performance.json`/`.log`: Node sintético,5 muestras y CPU/heap/RSS reales del proceso
  Windows, sin representatividad iPhone.
- `fixture-manifest.json`:12 PNG de prueba generados y decodificados en Edge;
  no fueron importados en Fotos ni usados para acreditar hardware.

## Comandos desde mano/

```powershell
pnpm test
node scripts/check-mobile-runtime.mjs
node node_modules/typescript/bin/tsc
node --experimental-strip-types --test tests/native-contract.test.mjs
node --test tests/release.test.mjs
node scripts/check-release.mjs
node node_modules/vite/bin/vite.js build
node scripts/prepare-sites-build.mjs
node --test tests/sites-worker.test.mjs
node node_modules/vite/bin/vite.js build --config vite.native.config.ts
node scripts/prepare-native.mjs
node node_modules/@capacitor/cli/bin/capacitor sync ios
node scripts/configure-ios.mjs
```

Detener ante error, conservar logs. npm no está disponible en este PATH; se usaron
equivalentes directos, sin instalar dependencias. Mac con npm usa comandos canónicos.

Para browser: en una terminal desde mano, iniciar Vite propio con
`node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4186 --strictPort`.
En otra terminal misma carpeta, con Edge instalado:

```powershell
$env:APPLE_AUDIT_OUTPUT='../work/apple-readiness/rc-repeat-web'
node tests/apple-readiness.mjs
$env:APPLE_AUDIT_OUTPUT='../work/apple-readiness/rc-repeat-safety'
node tests/apple-safety.mjs
$env:APPLE_AUDIT_OUTPUT='../work/apple-readiness/rc-repeat-flow'
node tests/rc-flow.mjs
$env:APPLE_AUDIT_OUTPUT='../work/apple-readiness/rc-repeat-a11y'
node tests/rc-accessibility.mjs
node node_modules/@playwright/test/cli.js test --config playwright.apple.config.ts --reporter=line
node --experimental-strip-types --expose-gc tests/benchmark-apple-readiness.mjs
```

Los fixtures interceptan el puente y prohíben conexión real a PhotoKit. No son
simuladores Apple. Salida por defecto del benchmark se llama phase2-performance.json;
este directorio guarda la ejecución RC con su fecha real.

Desde raíz: `python scripts/inspect-apple-sdks.py`,
`python scripts/check-apple-privacy.py`,
`python scripts/check-apple-privacy.py --submission` (**FAIL esperado1 actualmente**).
Sintaxis: Git Bash `-n` sobre ambos scripts nativos. Ejecución en Windows: exit78.
Las capturas de accesibilidad son QA local en `work/apple-readiness/rc-accessibility/`;
no se publican como capturas de App Store.

Las copias de logs normalizan espacios de fin de línea; los originales permanecen
en work/apple-readiness. No se alteran resultados, advertencias ni tiempos.
