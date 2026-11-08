# Prompt para Codex — estado de CocoWash tras la integración (2026-11-07)

Copia todo lo que sigue a Codex.

---

Retoma CocoWash. Claude integró tu RC iOS con el trabajo Android y dejó GitHub en una sola rama.
Antes de escribir, verifica todo con Git real; este texto es un resumen, no sustituye al repositorio.

## Fuente única

- Repositorio `joacomino-dev/mano-iphone` (público). **Solo existe la rama `main`**. El código
  verificado y la IPA corresponden a `376855de6a13798cb17f849b765b469655c5bfe3`; encima solo hay commits
  de documentación (este prompt y el estado). Las demás 20 ramas (incluidas `release`, `android`,
  `claude/cocowash-9.8.6` y `codex/*`) se borraron del remoto por petición del usuario, tras una
  copia local verificada: `C:/Users/Joaco/Developer/CocoWash-android/work/backup/mano-iphone-all-branches-2026-11-07.bundle`
  (21 ramas + 3 etiquetas, sha256 `b547931d10bb4c8a618e6e433655393957aefe79089d0846e5e750134bfa5303`).
  También quedan como `refs/backup/2026-11-07/*` en ese repositorio local.
- Checkout de trabajo: `C:/Users/Joaco/Developer/CocoWash-android` (en `main`, limpio). Las copias
  `CocoWash-b24`, `CocoWash-stage1`, el worktree `codex/cocowash-monetization-ios` y la copia de OneDrive
  no se tocaron; siguen en sus ramas locales antiguas y `CocoWash-stage1` tiene cambios sin confirmar.
  No las uses como base: actualiza desde `main`.
- Versiones sin cambios: iOS 0.9.9 (43), visible 0.9.9.1, iOS mínimo 17.0, Android versionCode 3,
  bundle `work.joaquin.mano`. Un build de envío nuevo requiere consultar App Store Connect.

## Qué contiene `main`

`a4f765d` (Android build 3) + tu cadena completa `691cded..8fdd2bf` (merge `bc6db8c`, sin pérdidas de
ningún lado: comprobado archivo por archivo) + estos commits de Claude:
- Resolución de conflictos: `ManoApp.tsx` usa `setFavorite`/`flushFavorites` (cola Android) **dentro**
  de tu invalidación de snapshots (favorita, deshacer y antes/después de borrar); en iPhone delega en
  `Library.favorite` como en la RC; `flushFavorites(ids)` sigue antes del borrado Android.
  Políticas `web/cocowash/privacy.html` y `privacidad.html`: tus correcciones + apartado Android.
- `library.ts`: `backHandling` (solo Android) pasó a `AndroidLibraryPlugin`; `LibraryPlugin` vuelve a
  ser el contrato común con `PhotoLibrary.swift` (tu `native-contract.test.mjs` fallaba tras la fusión).
- `PhotosSmokeTests.swift`: la app se lanza con `-AppleLanguages (es)` (el test lee textos en español y
  el simulador nuevo es inglés desde que la app sigue el idioma del dispositivo, 9.8.1).
- CI con una sola rama: `main` es el **canal de tienda** (`DEVELOPER=false`, IDs AdMob iOS comerciales
  en Release). `verify-release.yml` corre en `main`. `build-people-dev.yml` cambia solo su copia de CI a
  canal developer (ID de muestra, anuncios de prueba) para la IPA de desarrollo; no confirma nada.
  `build-android.yml` solo en `main`. `rc-native-gate.yml` vuelve a ser solo manual (ya despachable).
- Registro: `CLAUDE_LOG` CW-CL-059 y CW-CL-060; `CURRENT_STATE` actualizado.

## Resultados verificados

- Local (Windows, Node 24): 124 Node (120 RC + 4 Android), 6 Release, 4 contratos estáticos,
  `check-release` PASS, tsc, runtime 28, builds web/native-web, Sites 4, sync iOS, 52 casos de
  navegador (Edge, puente sintético). Web servida = hash compilado.
- CI en `main` `376855d`: tienda iOS [42442110715] PASS; desarrollo iOS [42442110733] PASS (IPA +
  arranque y relanzamiento en simulador); Android [42442110729] PASS (APK/AAB, 16 KB, emulador E2E).
- IPA de desarrollo (sin firma, anuncios de prueba):
  `C:/Users/Joaco/Downloads/CocoWash-0.9.9.1-build43-376855d.ipa`, sha256
  `6e80ecaf015f5e4dcd588c38949b294534a5a9e17f86af27e707abeab97766d8`; Info.plist 0.9.9 (43), mínimo 17.0,
  ID AdMob de muestra, `CocoWashTestAds`=true, 5 manifiestos de privacidad, JS con tus correcciones.
- Gate nativo RC [42438304068] sobre `83ff731` (mismo código de app): compilación Release arm64 sin
  firma PASS (Xcode 27.1), oráculos Swift PASS, onboarding + acceso completo real a Fotos + sesión PASS
  en simulador «iPhone Duo» iOS 27.1. **FAIL** en el paso de álbum (ver tarea 1).

## Tareas abiertas para ti

1. **FAIL del smoke en «Crear y añadir»** (`PhotosSmokeTests.swift:142`): tras escribir el nombre, tres
   toques en «Crear y añadir 1 elemento» no cierran la hoja. Ni la RC ni la fusión tocaron ese flujo
   (en navegador el álbum pasa). Antes apareció el aviso ATT (canal de tienda) y XCTest lo atendió por
   defecto. Hipótesis por comprobar: `typeText` no llega al estado React de `AlbumInput` en WKWebView
   (botón deshabilitado), error de PhotoKit, o efecto del Duo de dos pantallas. Además, la captura de
   fallo de `scripts/test-ios-simulator.sh` falla en el Duo: `simctl io screenshot` necesita `--display`.
   Reproducir: despachar `rc-native-gate.yml` en `main` (log y evidencias en el run).
2. Revisar la invalidación alrededor de la cola Android: en Android `setFavorite` no muta de inmediato,
   así que invalidar ahí descarta una lectura en curso sin necesidad; decidir si se limita a iOS y si el
   `flushFavorites()` de fin de ronda necesita protección.
3. **P1 privacidad sigue FAIL**: `NSPrivacyTracking=true` sin dominios; `check-apple-privacy.py
   --submission` exit 1. No inventar dominios.
4. Bloqueos que no cambian: QA física (permisos, borrado con fixtures, iCloud, vídeo, Duo, VoiceOver,
   Dynamic Type), Instruments, productos y sandbox de App Store Connect, firma/archivo/TestFlight,
   publicar las políticas (la web pública sigue con la versión anterior, sin apartado Android) y los IDs
   reales de AdMob Android.

Reglas: no push forzado, no reescribir `main`, no cambiar versiones sin ASC, no alterar identidad visual
ni monetización, no debilitar tests ni los 28 hashes, QA destructiva solo con demo/fixtures. CocoWash
**no está lista para enviar** mientras sigan abiertos los puntos 1, 3 y 4.
