# CocoWash · Roadmap compartido (Codex ↔ Claude ↔ usuario)

Documento vivo y **único** para saber qué falta y cómo avanzamos. Sustituye como referencia a
[ROADMAP_APPSTORE](ai-handoff/ROADMAP_APPSTORE.md) y [ROADMAP_PLAYSTORE](ai-handoff/ROADMAP_PLAYSTORE.md),
que quedan como historial detallado (fuentes, requisitos de Play, firma Android).

## Cómo trabajamos (decisión del usuario, 2026-11-07)

Al empezar **cada** tarea, Codex o Claude:

1. Actualiza desde `main` (única rama) y comprueba Git real.
2. Lee **la última entrada del otro agente** (`docs/ai-collaboration/CODEX_LOG.md` o `CLAUDE_LOG.md`)
   y `CURRENT_STATE.md`.
3. Lee **este roadmap** y compara: qué avanzó, qué se cerró, qué falta. Si cree que falta algo que no
   está aquí, o que algo está mal clasificado, lo **añade o corrige aquí** (con su nombre y la fecha),
   no solo en el chat.
4. Al terminar: marca los puntos cerrados con su evidencia (commit, run de CI, archivo), añade una línea
   al [registro de avance](#registro-de-avance) y escribe su entrada de bitácora.

Un punto solo pasa a **Hecho** con evidencia comprobable. Preparar un script o documento no cierra
una puerta nativa, comercial o de distribución.

**Estados:** Hecho · En curso · Pendiente · Bloqueado (falta herramienta, acceso o decisión) · FAIL
(comprobado y fallando). **Quién:** U = usuario · CX = Codex · CL = Claude · C = cualquiera de los dos.

## Dónde estamos (2026-11-07, CW-CL-060)

- Una sola rama: `main`. Código verificado `376855d`; IPA de desarrollo
  `C:/Users/Joaco/Downloads/CocoWash-0.9.9.1-build43-376855d.ipa`.
- iOS 0.9.9 (43), visible 0.9.9.1, iOS 17+, solo iPhone, 7 idiomas. Android versionCode 3.
- `main` = canal de tienda (sin modo developer, IDs AdMob iOS reales). La IPA de desarrollo se deriva
  en CI. CI en verde en `main`: tienda iOS, desarrollo iOS (arranque en simulador), Android.
- Compila nativo en Xcode 27.1 y abre sesión con acceso real a Fotos en simulador.
- **No está lista para enviar**: quedan abiertos R-01, R-02 y todo lo de cuentas, QA física y firma.

## A · Código y pruebas iOS (antes de firmar)

| ID | Qué | Quién | Estado | Evidencia / siguiente paso |
|---|---|---|---|---|
| R-01 | Smoke nativo: «Crear y añadir» no guarda el álbum ni cierra la hoja (`PhotosSmokeTests.swift:142`, simulador iPhone Duo iOS 27.1) | CX | **FAIL** | Run 42438304068. Reproducir con `rc-native-gate.yml` en `main`; diagnosticar si es la app (estado de `AlbumInput`, error PhotoKit) o el test |
| R-02 | Privacidad: `NSPrivacyTracking=true` sin dominios de rastreo; `check-apple-privacy.py --submission` exit 1 | CX (+U con AdMob) | **FAIL** | No inventar dominios: confirmación del proveedor o inspección de tráfico real |
| R-03 | Captura del fallo del smoke en dispositivos de 2 pantallas (`simctl io screenshot` exige `--display`) | CX | Pendiente | `scripts/test-ios-simulator.sh` |
| R-04 | Revisar invalidación de snapshots alrededor de la cola de favoritas Android y el `flushFavorites()` de fin de ronda | CX | Pendiente | CW-CL-059; en iOS el comportamiento es el de la RC |
| R-05 | QA destructiva en simulador con fixtures: borrar/cancelar/error, favorita externa, permiso revocado, cierre antes/después de confirmar | CX | Bloqueado | Procedimiento en `docs/apple-readiness/NATIVE_GATE.md` y `TEST_PLAN.md`; necesita Mac o CI ampliada |
| R-06 | Tamaño del bundle web (> 500 kB, aviso de Vite) | C | Pendiente | Solo con medición en Instruments; no tocar sin evidencia |

## B · Cuentas, legal y tienda Apple (usuario)

| ID | Qué | Quién | Estado | Evidencia / siguiente paso |
|---|---|---|---|---|
| R-10 | Apple Developer Program activo con `work.joaquin.mano` | U | Pendiente | — |
| R-11 | App en App Store Connect, acuerdo de apps de pago, banco e impuestos | U | Pendiente | — |
| R-12 | DSA (UE): condición de comerciante y datos públicos | U | Pendiente | — |
| R-13 | Perfil de pagos de AdMob | U | Pendiente | AdMob iOS y mensajes ya hechos (2026-11-06) |
| R-14 | Marca «CocoWash» sin conflicto en los mercados | U | Pendiente | — |
| R-15 | Productos en ASC con IDs exactos: `noads.year` (no renovable), `noads.lifetime` (no consumible), `coffee` (consumible); precios | U (+C textos) | Pendiente | Textos en `docs/appstore/in-app-purchases.md` |
| R-16 | Versión y build de envío (no reutilizar 43; consultar ASC) | U + C | Pendiente | No subir versiones sin ASC |
| R-17 | Publicar las políticas corregidas ES/EN con apartado Android (`web/cocowash/`) y comprobarlas tras desplegar | U autoriza, C prepara | Pendiente | La web pública sigue con la versión anterior (comprobado 2026-11-07) |
| R-18 | Ficha, etiquetas de privacidad, clasificación por edad, notas de revisión | U + C | En curso | Borradores en `docs/appstore/` y `docs/apple-readiness/storefront/`; revisión nativa de textos pendiente |

## C · Arte y capturas

| ID | Qué | Quién | Estado | Evidencia / siguiente paso |
|---|---|---|---|---|
| R-20 | Icono definitivo del basurero (sello «Eliminar») y la otra imagen pendiente | U | Pendiente | — |
| R-21 | Capturas nativas reales de iPhone 6,9" (sin fotos personales) | U + CL | Bloqueado | Requiere dispositivo o simulador; plan en `docs/appstore/screenshots.md` |

## D · Distribución iOS

| ID | Qué | Quién | Estado | Evidencia / siguiente paso |
|---|---|---|---|---|
| R-30 | Certificado de distribución y perfil App Store; firma y archivo con `scripts/archive-apple-release.sh` | U + C | Bloqueado | Depende de R-02, R-10, R-16 |
| R-31 | TestFlight interno y QA en iPhone real: sandbox (comprar, restaurar, caducidad, café), RGPD/ATT, biblioteca grande, iCloud, 7 idiomas, árabe RTL, texto grande, VoiceOver, SE e iOS 17 | U + C | Bloqueado | Plantilla `docs/apple-readiness/device-results.template.csv` |
| R-32 | Envío a App Review y lanzamiento | U | Bloqueado | Tras R-01…R-31 |

## E · Android / Google Play

| ID | Qué | Quién | Estado | Evidencia / siguiente paso |
|---|---|---|---|---|
| R-40 | Teléfono Android 11+ y cuenta de Play Console verificada | U | Pendiente | Bloquea todo Play |
| R-41 | 15–20 testers para la prueba cerrada (14 días) | U | Pendiente | — |
| R-42 | Keystore de desarrollo en los secretos de GitHub | U | Pendiente | Clave en `C:\Users\Joaco\Developer\cocowash-keys` (LEEME) |
| R-43 | IDs reales de AdMob Android y canal de tienda Android en `main` (ya no hay rama `release`) | U (IDs) + C | Pendiente | `PROMPT_WEB_ANDROID.md`; no usar los IDs iOS |
| R-44 | Con `main` en canal de tienda, el APK de desarrollo oculta «Modo developer»: decidir si su CI cambia su copia a desarrollo como la IPA | U decide, C implementa | Pendiente | CW-CL-060 |
| R-45 | Detector de texto y embedder LiteRT («Texto y documentos», «parecidas») | C | Pendiente | P1 del roadmap de Play |
| R-46 | Verificar firma de compras con la clave de licencias | C + U | Pendiente | — |
| R-47 | Carta de anuncio con Fredoka y espejo RTL; vídeo a pantalla completa | C | Pendiente | — |
| R-48 | Prueba interna, cerrada (14 días) y solicitud de producción | U + C | Bloqueado | Tras R-40…R-43 |

## F · Repositorio y entorno

| ID | Qué | Quién | Estado | Evidencia / siguiente paso |
|---|---|---|---|---|
| R-50 | Una sola rama `main`; copia de las 21 ramas en `work/backup/mano-iphone-all-branches-2026-11-07.bundle` | CL | Hecho | CW-CL-060 |
| R-51 | Copias locales antiguas (`CocoWash-b24`, `CocoWash-stage1` con cambios sin confirmar, worktree de Codex, OneDrive) | U decide | Pendiente | No usarlas como base; archivar tras revisar los cambios de `CocoWash-stage1` |
| R-52 | Workflows heredados (`build-ios.yml`, `build-ios-package.yml`) y avisos de Node 20 en acciones | C | Pendiente | Solo manuales; decidir si se retiran |

## Después del lanzamiento

Fallos en el Organizador y en Play Vitals, valoraciones, AdMob (relleno, consentimiento), revisión de
textos con hablantes nativos, 1.0.1 para lo que salga.

## Registro de avance

Una línea por intervención: fecha · agente · entrada · puntos cerrados/abiertos.

- 2026-11-07 · Claude · CW-CL-059/060 · Integrada la RC de Codex con Android; una sola rama `main`;
  CI en verde; IPA build 43. Abiertos R-01 (FAIL) y R-02 (FAIL). Roadmap creado.
