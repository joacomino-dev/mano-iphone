# Mapa técnico de CocoWash

Auditado el 30 de octubre de 2026 en Windows. Rutas relativas a la raíz Git.
La primera preparación agregó documentación/instrucciones/capturas, sin cambios funcionales.
La revisión definitiva de la misma fecha reconsultó manifiesto, entradas, bridge
y destinos: stack/plataformas sin cambios. Estado operativo y coordinación:
`docs/ai-collaboration/CURRENT_STATE.md` y `PROTOCOL.md`. Las pruebas de build/demo
que siguen pertenecen a la primera preparación, no se repitieron por este cambio documental.

## Arquitectura verificada

Dos entradas Vite comparten una aplicación React, sin servidor de negocio:

```text
Preview: index.html → src/main.tsx → App → MobileRuntime → Prototype → ManoApp
iPhone: native.html → src/native.tsx → ManoApp → Library (Capacitor) → PhotoLibrary.swift
                                       ↓
                           domain / session / preload / media
```

La preview monta dispositivo/teclado/status bar simulados; usa 20 assets demo
(misma foto generada, un vídeo generado y un marcador Live Photo). No accede a Fotos.
La entrada instalada omite el marco y usa PhotoKit, Vision, AVFoundation e ImageIO.
`Sheet` elige BottomSheet de preview o Dialog Radix nativo. No hay React Router,
Redux, Zustand, autenticación de usuario ni backend de aplicación identificados.
«Iniciar sesión» inicia revisión local, no login. El worker sirve estáticos para Sites.

## Árbol útil

```text
CLAUDE.md / AGENTS.md / CURRENT.md
.claude/{skills/coco-mobile-ui/SKILL.md,agents/ui-auditor.md}
.github/workflows/build-ios.yml
docs/ai-handoff/{CLAUDE_START_HERE,PROJECT_MAP,UI_ARCHITECTURE,UI_BASELINE}.md
docs/ai-handoff/reference/2026-10-30/  # capturas demo + capture.json
mano/
  AGENTS.md / README.md / design-qa.md
  src/
    ManoApp.tsx / Filters.tsx / Inspector.tsx / InlineVideo.tsx
    prototype.css / native.css
    domain.ts / session.ts / library.ts / preload.ts / media.ts
    main.tsx / App.tsx / Prototype.tsx / native.tsx
    mobile/                          # runtime protegido; COMPONENTS.md
  brand/                             # fuentes vectoriales, paleta y guía
  public/assets/                     # marca, papel, sello, foto/vídeo demo, chrome
  docs/{design-reference.png,qa/}     # referencias históricas; no baseline actual
  ios/App/{App/PhotoLibrary.swift,ManoUITests/PhotosSmokeTests.swift,...}
  scripts/                           # integridad, packaging, sync, smoke iOS
  tests/                             # dominio, precarga, sesión, runtime, worker
  tools/                             # instalación Windows existente; fuera del rediseño
  worker/index.js / .openai/hosting.json
  package.json / package-lock.json / tsconfig.json / vite*.config.ts
```

## Stack y convenciones

| Área | Versiones declaradas en package.json |
| --- | --- |
| React / React DOM | 19.2.7 |
| TypeScript / Vite / plugin React | 7.0.2 / 8.1.3 / 6.0.3 |
| Capacitor CLI/core/iOS | 8.6.0 |
| Motion / use-gesture | 12.42.2 / 10.3.1 |
| Radix Dialog / Dropdown / Icons | 1.1.19 / 2.1.20 / 1.3.2 |
| Phosphor React | 2.1.10 |
| IBM Plex Mono / Sans / Roboto fontsource | 5.3.0 / 5.3.0 / 5.2.10 |
| Playwright test | 1.61.1 |

Versiones fijadas; conservar lockfile. TS estricto/noEmit, JSX y CSS convencional,
sin Tailwind ni biblioteca propia de tokens completa. Motion se usa en UI;
no asumir que toda dependencia declarada se utiliza en cada pantalla.
`package.json` mantiene versión 0.1.0; la configuración generadora iOS identifica
0.4.0/build 4. No igualar ni renombrar estas versiones durante el handoff.

Estado con hooks/useRef/useMemo en `ManoApp`; navegación condicional con `session`,
`sheet` y `inspect`, no rutas URL. `domain.ts` calcula elegibilidad, sellos, bundles,
decisiones y undo. `session.ts` valida/migra un envelope local con registro/contexto.
Se conserva `mano-demo-v1`, `mano-library-v1`, `mano-similarity-v1`,
`mano-analysis-complete-v1`; sesiones `cocowash-*-session-v1`. No renombrar claves.
`preload.ts` limita a dos preparaciones y ventana de diez; `media.ts` coordina
cancelación y conversión de URLs. `library.ts` declara contrato del plugin.
Swift acota caché de vídeo y protege originales; EXIF se consulta localmente.

## Funcionalidad y plataformas

Implementado en fuente: bienvenida, precarga con cancelar/reintentar, cartas
agrupadas, conservar/descartar/favorita, undo diez decisiones, sesión persistente,
filtros/fechas, revisión/recuperación, álbum existente/nuevo, inspector/Geek,
vídeo inline y fallback de reproducción. La evidencia de ejecución nueva y sus
límites están en UI_BASELINE; tener código no prueba todos los casos en hardware.

| Plataforma | Estado real |
| --- | --- |
| Web preview | Implementada; demo ejecutada en Edge, con iPhone y Pixel simulados |
| iPhone | Integración nativa implementada; iOS mínimo 17, familia de dispositivo 1. Compilación Swift nueva no ejecutada en Windows |
| iPad | Pendiente como destino nativo: familia 2 no habilitada. Flex/ResizeObserver ofrecen base adaptable, sin layout/QA de tablet acreditados |
| Android | Preparado parcialmente por UI React/Capacitor y preview Pixel; sin `android/`, `@capacitor/android` ni plugin PhotoLibrary Android. No aplicación Android funcional |

CURRENT registra un gate macOS anterior verde para otra referencia publicada y
aceptación física 0.4 pendiente. No se reconsultó CI remoto ni se conectó un iPhone
en esta misión. No presentar aquel gate como prueba de este árbol sucio.

## Ejecución y comprobaciones

Desde `mano/`, con Node compatible y npm disponible; CI usa Node 22. Aquí se usó
Node 24.22.1 y dependencias ya instaladas; no se instaló nada.

| Comando existente | Propósito / resultado de la primera preparación |
| --- | --- |
| `npm run dev -- --host 127.0.0.1 --port 4183 --strictPort` | Preview; iniciado mediante CLI Vite equivalente |
| `npm test` | Equivalente Node: 34/34 PASS |
| `npm run check:runtime` | Equivalente Node: 28 archivos PASS |
| `npm run build` | Pasos equivalentes completos PASS; aviso chunk >500 kB, no corregido |
| `npm run build:native` | Pasos equivalentes completos PASS; genera assets web, no compila Swift |
| `npm run test:sites` | Equivalente Node: 4/4 PASS |
| `npm run test:runtime` | Intentado vía CLI Playwright; bloqueado al iniciar webServer porque falta npm en PATH |
| `npm run sync:ios` | Disponible, no ejecutado: reescribe/sincroniza fuentes nativas |
| `bash scripts/test-ios-simulator.sh` | macOS/Xcode; pendiente en esta misión |

No existe `npm run lint` ni `npm run typecheck`. `tsc` corre en ambos builds.
La captura demo por Playwright externo ya disponible + Edge no sustituye la suite
runtime ni XCTest. No hay navegador Chromium de Playwright instalado en esta máquina.

Equivalentes exactos ejecutados en PowerShell (cada línea por separado, detenerse
ante cualquier fallo; el build web fue precedido por check:runtime):

```powershell
node scripts/check-mobile-runtime.mjs
node --experimental-strip-types --test tests/domain.test.mjs tests/preload.test.mjs tests/session.test.mjs
node node_modules/typescript/bin/tsc
node node_modules/vite/bin/vite.js build
node scripts/prepare-sites-build.mjs
node --test tests/sites-worker.test.mjs
node node_modules/typescript/bin/tsc
node node_modules/vite/bin/vite.js build --config vite.native.config.ts
node scripts/prepare-native.mjs
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4183 --strictPort
```

Suite intentada: `node node_modules/@playwright/test/cli.js test`; su configuración
lanza `npm run dev` en 4174. Resolver npm y navegador de prueba antes de exigirla.
No debilitar ni editar la configuración para ocultar el bloqueo.

## Git y colaboración segura

Snapshot inicial: Git en raíz, rama `main`, HEAD
`0a6d32d65d273b1408ef79bedc728acf9579fad1`. Ya había **31 rutas en índice**,
dos rutas con cambios sin preparar (`.github/workflows/build-ios.yml` y
`mano/scripts/test-ios-simulator.sh`; solo el segundo tenía además cambios en índice), más raíz
`.gitignore`, `AGENTS.md`, `CURRENT.md` y `mano/tools/` sin seguimiento.
Revisar `git status --short` actual: esta descripción es una foto inicial.
Hay evidencia de desfase entre HEAD local y fuentes remotas en CURRENT; no fetch,
reset, stash, checkout, commit, ramas ni push en esta misión. No asumir paridad.

Ignorados: raíz `work/`, `outputs/`; app `node_modules/`, `dist/`, `build/`,
`test-results/`, `playwright-report/`, `.env*`, `.p12`, `.mobileprovision`, `.ipa`,
`.xcarchive`. Gitignore evita inclusiones accidentales de esos nombres, no evita
publicar un secreto ya seguido ni fotos colocadas en otra ruta. Revisar diff
antes de cualquier publicación; no se añadió configuración privada de Claude.

Procedimiento canónico de trabajo secuencial, respaldo/base común, worktrees,
transferencia, integración/conflictos y OneDrive en
[PROTOCOL.md](../ai-collaboration/PROTOCOL.md). Estado más reciente en
[CURRENT_STATE.md](../ai-collaboration/CURRENT_STATE.md). Un worktree no aísla el
carrete ni la persistencia si se reutiliza origen/browser o bundle en hardware.

## Fuentes existentes y externas

Reutilizar `mano/AGENTS.md`, `README.md`, `src/mobile/COMPONENTS.md`,
`brand/README.md` y `design-qa.md`; este último y `docs/qa/` son históricos.
No se reescribió CURRENT, que conserva contexto de compilación/distribución.

Formato Claude contrastado con documentación oficial el 30-10-2026:
[CLAUDE.md](https://code.claude.com/docs/en/memory),
[skills de proyecto](https://code.claude.com/docs/en/skills),
[subagentes y herramientas](https://code.claude.com/docs/en/sub-agents).
No hay `claude` en PATH: compatibilidad documental comprobada; carga real en
Claude Code pendiente. No se instalaron plugins, MCP, hooks ni dependencias.

Comprobaciones de la primera preparación (histórico): enlaces locales y estructura simple de frontmatter
PASS; CLAUDE.md por debajo de 200 líneas. Los hashes de `git diff --binary` y
`git diff --cached --binary` antes/después coinciden: no se modificaron los
cambios existentes ni el índice. `capture.json` registra sus hashes y una huella
de los archivos de trabajo seguidos bajo mano/.github para identificar el baseline
sucio. `git diff --check` pasó sobre los cambios seguidos. El validador genérico
de skill-creator no pudo ejecutarse por falta de PyYAML en el Python disponible;
se comprobaron por separado los campos simples, nombre y allowlist del agente,
sin instalar paquetes. Esto no acredita ejecución real de skill/subagente.

Revisión definitiva: se importa AGENTS desde CLAUDE en raíz y alcance móvil,
sin copias ni symlinks. Solo docs/instrucciones/bitácoras pueden cambiar; comprobar
inventario SHA256 de todos los archivos previos, índice, refs y HEAD para asegurar
que fuente/configuración/assets y trabajo anterior siguen intactos. Resultados
del cierre en CODEX_LOG (entrada CW-CX-002) y CURRENT_STATE. No instalar PyYAML
solo para validar dos frontmatters simples; declarar el bloqueo del validador
y verificar estructura/referencias separadamente.
