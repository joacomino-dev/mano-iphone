# Checklist operativo de envío — CocoWash

2026-11-09. **Envío bloqueado.** Checkpoint técnico `6386f55` en validación.
PASS exige evidencia del SHA/binario exacto;
FAIL=fallo comprobado; BLOCKED=decisión/herramienta/acceso ausente;
NOT TESTED=prueba aún no ejecutada. Documentación o CI verde sin XCTest no es PASS.
El [checklist previo](APP_STORE_SUBMISSION_CHECKLIST_2026-11-07.md) es histórico.

1. **Fijar fuente.** Usar main de `C:/Users/Joaco/Developer/CocoWash-android`.
   Ejecutar `git status --short`, `git rev-parse HEAD`, revisar diff/log yregistrar SHA.
   No usar b24, OneDrive, stage1 ni rama release antigua. No sobrescribir trabajo.
2. **R-61 — validación nativa del candidato pendiente.** El diario está implementado y revisado. Cerrar las pruebas nativas de errores,
   transacciones abortadas, respuestas fuera de orden, Deshacer yforce-stop inmediatamente
   después de la confirmación visible. Repetir Android y iOS con biblioteca sintética.
   No confirmar borrados en biblioteca personal ni convertir una demora de seis segundos
   en corrección. iOS `8f2549e` ya pasa relanzamiento ×5; falta Android y repetir el SHA final.
   Contrato R-64: recuperación silenciosa con reintento/memoria/espejo local. No mostrar otra vez
   avisos retirados ni afirmar que el fallback garantiza durabilidad cuando falla el almacenamiento.
3. **Pruebas locales — PASS por ejecución, repetir al cerrar código.** Desde mano:
   `npm ci --no-audit --no-fund` si faltan dependencias; `npm test`;
   `npx tsc --noEmit`; `npm run check:runtime`; `npm run build`;
   `npm run build:native`; `npm run sync:ios`. No actualizar lock/dependencias.
   Ejecutar también `node --test tests/release.test.mjs`,
   `node --experimental-strip-types --test tests/native-contract.test.mjs` y,
   desde raíz, `python -B -m unittest discover -s scripts/tests -p 'test_native*.py' -v`.
   Guardar comandos/logs. Build web no acredita Swift.
4. **Gate iOS real — NOT TESTED completo en SHA final.** Despachar
   `.github/workflows/rc-native-gate.yml` en main: standard y auto(Duo), runner público
   estándar xcode-27/Xcode27.1. No usar runners de pago. Exigir build arm64 Release,
   Swift, Photos real, álbum exacto, metadata, Livekey/timeline/loop/zoom, diez ciclos,
   métricas app/WebContent ypostauditPhotoKit. Leer xcresult/logs; ejecutar
   `python scripts/verify-native-gate-evidence.py mano/build/simulator-smoke full`.
   Un fallo conserva FAIL; no omitir autorizaciones ni fabricar resultados.
5. **Gate Android real — R-47b en validación.** `build-android.yml`: Kotlin/Java +RSAJVM, APKdeveloper yAABtienda
   separados por hash,16KB yE2E17checks +ten ciclos, favoritoencolado/Deshacer/Back,
   cancelación yforce-stop. Atrás debe salir de fullscreen sin cerrar el visor ni cambiar
   reproductor, posición o sonido; el siguiente Atrás cierra el visor. Exigir el resultado
   del checkpoint, no el PASS de una compilación anterior. Verificar varianteAPI30 yactual;
   no concluir rendimiento de teléfonos a partir del emulador API35.
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
   No inventar URLni publicar sin permiso.
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
    sin contenido personal ni marcos simulados. Android1080×1920; iPhone dimensiones
    oficiales detectadas, sin reescalar. No usar un conjunto incompleto como final.
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
    Cumplir prueba cerrada exigida por la cuenta (si corresponde,14días ytestersreales),
    sin inventar participación ni elegibilidad para producción.
16. **Envío final — BLOCKED.** Consolidar ReleaseReadiness yroadmap del SHA/binario,
    cerrar QAvisual con Claude, ypedir autorización expresa de AppReview/producción.
    Revisar disponibilidad accidental iPad/Mac/VisionPro en ASC. Lanzamiento manual
    o faseado solo según decisión del propietario. No publicar por preparar checklist.

Referencias vigentes: [Apple envío](https://developer.apple.com/app-store/submitting/),
[capturas](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/),
[Google capturas](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en).
