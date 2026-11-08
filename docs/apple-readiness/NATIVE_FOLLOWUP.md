# Seguimiento nativo actual — CW-CX-030,2026-11-08

R-01 reproducido en Duo27.1 y18Pro27.0: campo sigue en placeholder tras typeText, guardar deshabilitado, teclado visible y ninguna transacción PhotoKit. [Captura real después de escribir](evidence/strategic/album-native-before.png), run42486432883; exportación xcresult42488119404. La captura de Home después de teardown no era prueba del campo.

Se demuestra por regresión DOM que un input con value-tracking ya actualizado no dispara onChange aunque llegue input. [Antes](evidence/strategic/album-input-before.json):1 FAIL/2 PASS. Corrección mínima candidata: onInput actualiza el mismo estado, conservando onChange; ninguna escritura adicional. [Después](evidence/strategic/album-input-after.json):3 PASS, incluida escritura única y texto japonés. TypeScript/130Node/hash28 PASS. La causa exacta del camino WebKit sigue como inferencia hasta repetir el mismo XCTest sin cambiar sus asserts; no cerrar R-01 por el test de navegador.

La misión estratégica autoriza push/CI. El texto siguiente conserva el seguimiento anterior.

# R-01 / R-02 / R-03 · CW-CX-023

2026-11-07. Base local main1bc2561. Windows sin Swift/Xcode. Sin push ni ejecución nueva de CI.

## R-01 · FAIL nativo, causa pendiente

Comprobado mediante API GitHub: run42438304068/job128601842759 sobre83ff731, Xcode27.1; sesión autorizada real PASS; save retries1/2/3 y fallo en PhotosSmokeTests:142. El log no expone valor del campo, enabled ni error de PhotoKit. No demuestra un error de onChange y no se cambia AlbumInput por hipótesis.

Preparado para siguiente run:

- XCTest exige nombre exacto, después enabled=true y registra hittable/teclado antes de tocar. Si falla, conserva el fallo y la captura. No se inyecta JS ni se preconcede Fotos.
- PhotoKit registra solo inicio/count y éxito/count o error/code; sin nombres, IDs ni contenido personal. Una transacción sigue creando y añadiendo; solo tras éxito se resuelve.
- Si INPUT_MISMATCH, investigar teclado/WKWebView en la captura; si SAVE_DISABLED con nombre correcto, React/estado y targets; si READY sin CREATE_BEGIN, entrega del toque/interrupción/oclusiones; si CREATE_FAILED, investigar código real; si CREATE_OK y hoja sigue, callback JS/estado. Conservar asserts de avance y relectura del álbum real.
- ATT se sigue atendiendo por el mecanismo XCTest existente, sin cambiar consentimiento ni convertirlo en PASS.

**BLOCKED** nueva compilación/diagnóstico: los cambios son locales. Requieren autorizar push a main y run manual rc-native-gate.yml, o Mac compatible. La última ejecución sigue FAIL. No se declara corregido el álbum.

## R-03 · Capturas múltiples

Evidencia exacta del mismo run: simctl rechaza screenshot ambiguo, ofrece --display=3 LCD-1(primary-1)2007×2853 y --display=1 LCD(primary)1398×2034.

El colector nuevo intenta el caso normal y descubre los IDs del diagnóstico del simctl de esa ejecución. Captura cada pantalla por separado; guarda log y fallos, no fija IDs ni elige una pantalla arbitraria. Cleanup conserva el exit original del smoke. El workflow retiene PNG/logs de la biblioteca sintética efímera,7d, sin IPA/fotos personales.

**PASS automatizado Windows**:4 casos con respuesta grabada (una pantalla, dos pantallas, fallo parcial, error ajeno). Bash syntax y4 contratos estáticos PASS. **BLOCKED** simctl real y compilación XCTest; R-03 permanece pendiente de verificación macOS.

```powershell
# desde mano; Python no genera bytecode en el checkout
python -B -m unittest discover -s tests -p test_simulator_screens.py -v
node --test tests/native-contract.test.mjs
```

## R-02 · FAIL estricto conservado

Se descargaron otra vez los ZIP oficiales fijados Ads13.12.0 y UMP3.1.0; SHA256 contrastado con sus Package.swift oficiales. Sus manifiestos arm64 no contienen NSPrivacyTracking ni NSPrivacyTrackingDomains. [Recibo](evidence/cx023/sdk-tracking.json). No son una lista de dominios para CocoWash ni una verificación de firma Apple.

La [guía Google13.12.0](https://developers.google.com/admob/ios/privacy/data-disclosure) (actualizada2026-11-05) enumera datos recogidos pero no identifica dominios de tracking. La [respuesta del soporte Google](https://groups.google.com/g/google-admob-ads-sdk/c/bXq0Ex-o06w) confirma que true requiere dominios; no los suministra. [Apple TN3182](https://developer.apple.com/documentation/technotes/tn3182-adding-privacy-tracking-keys-to-your-privacy-manifest) exige identificar los contactos que rastrean y verificar el funcionamiento cuando ATT no autoriza.

`python scripts/check-apple-privacy.py --submission`: **exit1 FAIL**, app tracking=true/domains=[]; validaciones estáticas restantes PASS. No se elimina tracking ni se rellenan dominios a partir de nombres encontrados en binarios, listas genéricas o SKAdNetwork.

### Trabajo externo exacto

1. Con la cuenta AdMob, obtener respuesta del proveedor para Ads13.12.0 + UMP3.1.0, sin mediación: dominios que rastrean según Apple y recomendación del manifiesto de aplicación. Preguntar expresamente diferencias ATT autorizado/denegado y consentimiento UMP/regiones. No contactar en nombre del usuario sin autorización.
2. En dispositivo de fixtures con build de prueba apropiada, registrar destinos con App Privacy Report y herramientas de red de Apple, en sesiones ATT aceptar/rechazar, UMP aceptar/rechazar/revocar, anuncios/pago/offline. No incluir tokens, IP, perfiles ni capturas privadas en el repo público.
3. Contrastar destinos con propósito confirmado del proveedor; añadir solo los de tracking con recibo/fuente/fecha. No bloquear indiscriminadamente todos los endpoints de consentimiento o anuncios contextuales.
4. Compilar archivo, generar Privacy Report agregado y verificar dominios/SDKs/firma. Repetir gate estricto y pruebas ATT denegado. Actualizar etiquetas y política si la evidencia cambia su contenido.

No se cambian SDKs, monetización ni decisiones comerciales. El P1 bloquea envío aunque existan políticas y scripts.

```powershell
# desde raíz; descarga/inspección, sin instalación ni ejecución de binarios SDK
python scripts/inspect-apple-sdks.py --output work/apple-readiness/cx023/sdk
python scripts/check-apple-privacy.py --submission
```
