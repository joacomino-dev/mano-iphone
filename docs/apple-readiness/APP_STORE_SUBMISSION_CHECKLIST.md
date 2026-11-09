# Checklist operativo de envío — CocoWash

2026-11-09. **Envío bloqueado.** Candidato **0.9.9.2**, app `fa318ba`, pruebas `afbd2f9`, en validación.
Configurado: iOS **0.9.9 / build44**, Android **0.9.9.2 / code4**. Confirmar que
estén libres en las consolas antes de firmar/subir; no volver a utilizar build43.
PASS exige evidencia del SHA/binario exacto;
FAIL=fallo comprobado; BLOCKED=decisión/herramienta/acceso ausente;
NOT TESTED=prueba aún no ejecutada. Documentación o CI verde sin XCTest no es PASS.
El [checklist previo](APP_STORE_SUBMISSION_CHECKLIST_2026-11-07.md) es histórico.

1. **Fijar fuente.** Usar main de `C:/Users/Joaco/Developer/CocoWash-android`.
   Ejecutar `git status --short`, `git rev-parse HEAD`, revisar diff/log yregistrar SHA.
   No usar b24, OneDrive, stage1 ni rama release antigua. No sobrescribir trabajo.
2. **R-61 — PASS acotado; hardware y fallos pendientes.** fa318ba conserva una
   decisión reconocida tras cinco terminaciones reales en iOS y Android, sin demora
   artificial. Fixtures web cubren abortos y respuestas fuera de orden. Completar
   pruebas físicas con biblioteca sintética, almacenamiento insuficiente, Deshacer y
   suspensión. Contrato R-64: recuperación silenciosa con reintento/memoria/espejo;
   no restaurar avisos ni prometer durabilidad del fallback con almacenamiento averiado.
   No confirmar borrados en biblioteca personal.
3. **Pruebas locales — PASS por ejecución, repetir al cerrar código.** Desde mano:
   `npm ci --no-audit --no-fund` si faltan dependencias; `npm test`;
   `npx tsc --noEmit`; `npm run check:runtime`; `npm run build`;
   `npm run build:native`; `npm run sync:ios`. No actualizar lock/dependencias.
   Ejecutar también `node --test tests/release.test.mjs`,
   `node --experimental-strip-types --test tests/native-contract.test.mjs` y,
   desde raíz, `python -B -m unittest discover -s scripts/tests -p 'test_native*.py' -v`.
   Guardar comandos/logs. Build web no acredita Swift.
4. **Gate iOS real — FAIL.** [2794e4b / 42669952998](https://github.com/joacomino-dev/mano-iphone/actions/runs/42669952998):
   5 PASS, 1 FAIL, 2 SKIP; solo falta el destino del pellizco de Live anclada.
   Pasan cancelación, cinco terminaciones, foto clave/timeline/bucle y diez rondas.
   R-67 no se reproduce aquí, pero su causa sigue abierta. CW-CX-062 prepara el
   destino en el contenedor del timeline: [afbd2f9/42682535759](https://github.com/joacomino-dev/mano-iphone/actions/runs/42682535759)
   standard/full ya está en curso. Consultar ese resultado, sin duplicarlo.
   Auto/full prueba Duo por separado.
   Exigir todas las aserciones, métricas y postaudit; no ocultar fallos con retries.
   Validar logs con `python scripts/verify-native-gate-evidence.py mano/build/simulator-smoke full`.
5. **Gate Android real — PASS acotado.** [fa318ba / 42634538249](https://github.com/joacomino-dev/mano-iphone/actions/runs/42634538249)
   pasa Kotlin/Java, firmas RSA, canales por hash, 16KB, E2E17, fullscreen Back,
   cancelación, favoritas, diez rondas, force-stop ×5 y presupuestos originales.
   2794e4b / 42669935821 confirma PASS completo y sus instaladores se verificaron
   por digest/CRC/hashes de canal. API30 y teléfono real
   siguen pendientes; API35 y biblioteca pequeña no acreditan otros dispositivos.
   Si cambia la firma, no desinstalar la app con decisiones: conservar la misma clave
   o utilizar un dispositivo de pruebas limpio. Un AAB sin firma/configuración real
   no puede enviarse como producción.
6. **QA de dispositivos — BLOCKED propietario.** Completar [plantilla](device-results.template.csv)
   y[procedimiento](TESTFLIGHT.md) con SE2/3, mini/estándar, ProMax/Island e iOS17/18/26/27.
   Duo: exterior/interior/transición, modal/teclado/vídeo/selección sin perder contexto.
   Bibliotecas pequeñas/medianas/grandes, iCloud/offline, memoriaInstruments, permisos
   completos/limitados/denegados/revocados, suspensión/interrupciones yfavorita externa.
   No marcar un dispositivo probado porque figure en matriz o renderweb.
7. **Privacidad — declaración PASS; aceptación final BLOCKED.** Leer [propuesta de dominios](TRACKING_DOMAIN_PROPOSAL.md).
   El propietario aprobó los dos hosts exactos y se incorporaron. Contrastar documentación proveedor,
   tráfico real ATTallowed/denied/revoked yPrivacyReport del archivo. Con la lista aprobada:
   `python scripts/check-apple-privacy.py --submission` ya pasa en alcance estático; repetir al cerrar. Verificar firmas
   del proveedor mediante `apple-vendor-signatures.yml` ymanifiestos efectivamente
   empaquetados. El PASS estático no certifica exhaustividad, prácticas ni AppReview.
8. **Políticas públicas — BLOCKED.** Confirmados Joaquin Miño/QuitoEcuador y
   cocowash@joaquinmino.work. Revisar ES/EN de web/cocowash junto con declaraciones
   SDK/geocodificación/compras. Autorizar publicación por separado; después comprobar
   URLHTTPS real accesible sin login en ambas lenguas y enlaces desde app/metadatos.
   No inventar URL ni publicar sin permiso. Las tres URL públicas respondieron 200 con
   agente de navegador el 9 de noviembre, pero conservan archivos anteriores sin Android;
   [recibo](evidence/strategic/0992-public-policies.json).
9. **Comercio — BLOCKED cuentas.** Mantener estrategia actual. En consolas crear/validar
   IDsexactos existentes, contratos/impuestos/banco, precios/regiones/restauración y
   expiración. Android: IDsAdMobAndroid porVariables yclave públicaPlay porSecret;
   ejecutar `./gradlew verifyStoreConfiguration` con configuración real. No usar IDsiOS
   o muestras como producción. Probar recibos/errores/sandbox reales; firmaJVM no basta.
   R62 debe probar rechazo desconocido sin quitar acceso pagado ni ofrecer compras falsas.
10. **Ficha internacional — preparación PASS / aceptación pendiente.** Utilizar
    storefront/metadata.json,review-localizations.json ydocs/playstore/listing.md:
    ES/EN/FR/DE/IT/AR/JA. Ejecutar check-release ycheck-play-listing; keywordsApple≤100bytesUTF8.
    Revisar edades/IAP/DSA/países por el propietario. No anunciar Personas/Breakup/funciones
    experimentales ni declarar AccessibilityFeatures sin QAreal.
11. **Capturas — generación PASS, aceptación visual pendiente.** Ya hay 28 capturas por plataforma, siete idiomas: iOS 42516036408 y Android 42516038859. Claude debe aceptar el resultado. Para regenerar, ejecutar apple-store-screens.yml y
    android-store-screens.yml; descargar artefactos del SHA exacto, revisar files/report,
    hashes, idioma/RTL/textos/controles ycadaPNG. Usar capturas RGB24 reales, sin alpha,
    sin contenido personal ni marcos simulados. Android 1080×1920; iPhone1206×2622, clase mediana exigida en el resumen vigente de Apple, sin reescalar.
    Confirmar los slots reales del portal: la tabla conserva una condición contradictoria
    de clase grande; no declarar un bloqueo nuevo ni una prueba ProMax por inferencia. No usar un conjunto incompleto como final.
12. **Preparar firma sin distribuir.** Ejecutar apple-signing-dry-run.yml: exit78
    es correcto mientras privacidad/credenciales/gates estén bloqueados. El propietario
    elige versión/build sin reutilización en ASC, TeamID, identidadAppleDistribution y
    perfilAppStore existente. Nunca enviar claves por chat ni confirmar certificados
    en Git. Seguir [gate](NATIVE_GATE.md); plantilla ExportOptions destinoexport,
    manageAppVersion/buildfalse, sin uploadSymbols/allowProvisioningUpdates.
13. **Archivo yexportación — BLOCKED.** Solo con autorización explícita:
    en macOS/Keychain privado revisar variables COCOWASH_* y ejecutar
    `COCOWASH_SIGNING_AUTHORIZED=YES bash scripts/archive-apple-release.sh`.
    Validar codesign,entitlements,get-task-allowfalse,bundle,familia1,arm64,min17,
    versión/build,AdMobreal ysinflagsTEST/DEVELOPER. Conservar SHA256IPA,
    PrivacyReport agregado ylogs privados. Este script no sube nada.
14. **TestFlight — BLOCKED.** Con P0/P1cerrados yautorización de subida separada,
    cargar el IPA firmado del SHA aceptado. Completar exportcompliance ydatosbeta;
    probar el binario distribuido con fixtures,sandbox,permisos,iCloud,VoiceOver y
    presión de memoria. No confundir IPA unsigned/iLoader con aceptación TestFlight.
15. **Play interno/cerrado — BLOCKED.** ClaveUpload/AppSigning/recuperación yAABtienda
    validados,DataSafety/ficha/edades/ads yproductos reales. Autorizar subida aparte.
    Cumplir prueba cerrada exigida por la cuenta (si corresponde,12 testers inscritos continuamente14 días y participación real),
    sin inventar participación ni elegibilidad para producción.
16. **Envío final — BLOCKED.** Consolidar ReleaseReadiness yroadmap del SHA/binario,
    cerrar QAvisual con Claude, ypedir autorización expresa de AppReview/producción.
    Revisar disponibilidad accidental iPad/Mac/VisionPro en ASC. Lanzamiento manual
    o faseado solo según decisión del propietario. No publicar por preparar checklist.

Referencias vigentes: [Apple envío](https://developer.apple.com/app-store/submitting/),
[SDK mínimo vigente](https://developer.apple.com/news/upcoming-requirements/?id=04282026a),
[capturas](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/),
[Google capturas](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en).
