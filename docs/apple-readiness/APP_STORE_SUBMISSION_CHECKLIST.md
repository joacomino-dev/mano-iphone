# Checklist operativo de envío — CocoWash RC

7 noviembre2026. **Todavía no apta para envío.** Marcar cada paso solo con evidencia.
PASS=comprobado; FAIL=fallo comprobado; BLOCKED=falta herramienta/acceso/decisión;
NOT TESTED=no ejecutado. Preparar un procedimiento no cambia BLOCKED a PASS.

## 1. Fuente y punto de recuperación

- [x] PASS: checkout `C:/Users/Joaco/Developer/CocoWash-b24`, última base funcional
  `b0cf83d`; correcciones RC en commits locales. OneDrive antiguo intacto.
- [x] PASS: bundle recuperable `work/apple-readiness/rc-start-b0cf83d.bundle`,
  SHA256 `42db9b129bfb82c9a64bb4802bc368c4d9631800f6292b6b70972dbfc6ac4e0f`.
- [x] PASS: pruebas y archivos protegidos28; sin cambios en arte/CSS/personajes.
- [ ] Antes de mover/integrar: `git status --short`, `git rev-parse HEAD` y
  `git log --oneline b0cf83d..HEAD`. Revisar todos los commits, sin sobrescribir
  trabajo ajeno. No hacer push sin autorización específica para esta entrega.
- [ ] Registrar SHA candidato en la hoja de QA. No usar la rama release antigua
  como fuente alternativa ni transferir archivos selectivos perdiendo correcciones.

## 2. Elegir entorno de compilación

- [ ] BLOCKED: disponer de macOS/Xcode27.1 estable compatible, o autorizar después
  la integración/push y dispatch del [workflow RC preparado](../../.github/workflows/rc-native-gate.yml).
  Solo runner estándar público gratuito; sin contratar Mac/runners/servicios.
- [ ] Comprobar `xcodebuild -version`, `xcodebuild -showsdks`, `xcrun simctl list`.
  Mínimo de envío consultado: Xcode26+/SDK26+; para auditar Duo usar27.1.
- [ ] Desde `mano/`: `npm ci --no-audit --no-fund` y
  `bash scripts/validate-apple-native.sh`. Guardar salida/Package.resolved.
  Ver [procedimiento y límites](NATIVE_GATE.md). No actualizar dependencias para
  sortear un fallo sin identificar causa.
- [ ] BLOCKED: compilar/ejecutar el SHA actual. Los logs de CI de build43 antiguo
  no acreditan las correcciones RC. No omitir pasos de autorización de Fotos.

## 3. Cerrar el P1 de privacidad antes de firmar

- [ ] **FAIL actual:** `python scripts/check-apple-privacy.py --submission`
  devuelve1: `NSPrivacyTracking=true` y dominios vacíos.
- [ ] Obtener lista de dominios de rastreo del proveedor para Ads13.12.0 y la
  configuración comercial efectiva; contrastar con diagnóstico de tráfico en
  dispositivo de QA y ATT concedido/denegado/revocado. No rellenar por conjetura.
- [ ] Corregir manifiesto y añadir evidencia/regresión; repetir check estricto.
  No retirar tracking o SDKs para aparentar cumplimiento o alterar monetización.
- [ ] Xcode: verificar firmas SDK, recursos/manifiestos empaquetados y resolución
  nativa fijada. Comparar con [recibo oficial](evidence/rc-sdk-summary.json).
- [ ] Confirmar Required Reason APIs y motivos del agregado. No copiar razones
  de SDK al manifiesto propio sin API propia correspondiente.

## 4. Validación nativa de seguridad

- [ ] BLOCKED: completar [TEST_PLAN](TEST_PLAN.md) y [TESTFLIGHT](TESTFLIGHT.md)
  con biblioteca sintética, nunca borrar contenido personal.
- [ ] Full/limited/denied/revoked, limited0/1/N, cambios en ambos sentidos,
  reanudación con revisión/inspector/álbum abiertos, respuesta asíncrona antigua.
- [ ] Descartar uno/varios: no borrar desde swipe. Recuperar y Deshacer conservan
  semántica/contexto exactos. Eliminar solo en revisión con confirmación de Fotos.
- [ ] Cancelar, error real de sistema, favorita externa, asset ausente/modificado,
  operación interrumpida y cierre antes/después de la confirmación: comparar UI,
  historial persistido y Fotos. Nunca sumar eliminados en un fallo.
- [ ] Local/iCloud foto/vídeo/Live Photo, offline/red intermitente, retry/cancel,
  caché llena/vídeo512MiB+, suspensión/memoria/almacenamiento limitados.
- [ ] Cero P0 abiertos y ningún P1 de seguridad sin resolver; guardar pasos,
  resultado y artefactos locales en [plantilla](device-results.template.csv).

## 5. Compatibilidad, rendimiento y accesibilidad

- [ ] BLOCKED: mínimo17, iOS18/26/27.1 según modelo/OS disponibles. No rebajar17.
  Elegir una cohorte compacta, estándar Island y grande; completar la
  [matriz](COMPATIBILITY.md) con modelos concretos, sin extender PASS a su familia.
- [ ] Duo: Device Hub27.1, cerrado/abierto/plegado/giros/Split View y transición;
  cámara/barras, insets asimétricos, carta/selección/undo/vídeo/modal/anuncio.
  No anunciar «optimizado para Duo» hasta pasar esta prueba.
- [ ] Instruments con1k/10k/50k y medios representativos,30min, review y reanudación.
  Registrar RAM/CPU/energía/disco/tiempos y condiciones; no trasladar cifras Node.
- [ ] VoiceOver sin gestos, orden/foco/retorno de modales, labels y anuncios de
  error/selección; Dynamic Type, Reduce Motion, contraste y áreas táctiles44pt.
  ES/EN completos en pantalla y prompts del sistema. Los seis checks Edge son parciales.
- [ ] iPad en compatibilidad iPhone, Mac Apple silicon y visionOS: decidir destinos
  en ASC y probar los ofrecidos. Familia1 no desactiva toda disponibilidad automática.

## 6. Cuenta y configuración comercial — titular

- [ ] BLOCKED: Apple Developer Program activo; comprobar titular/equipo/roles y
  App ID explícito `work.joaquin.mano`. Si ya existe, reutilizar el registro correcto.
  No crear uno nuevo para resolver un conflicto de propiedad.
- [ ] En ASC → Apps → nueva app solo si no existe: iOS, CocoWash, idioma principal
  elegido, Bundle ID existente y SKU interno elegido por titular. Comprobar nombre
  disponible. No inventar App Apple ID/SKU/Team ID.
- [ ] Agreements/Tax/Banking y Paid Apps Agreement vigentes para IAP; países,
  fiscalidad y precios reales. No efectuar compras reales en pruebas.
- [ ] Crear/verificar IDs **existentes**: `work.joaquin.mano.noads.year`
  no autorrenovable; `.noads.lifetime` no consumible; `work.joaquin.mano.coffee`
  consumible. Localizar nombres/descripciones ES/EN, precios/países y material de
  revisión de cada producto. Confirmar que el catálogo devuelve esos productos.
- [ ] Sandbox: cancel/pending/error/success, compra doble, relanzar/reinstalar en
  equipo de QA, restauración, expiración/reembolso/revocación y offline. Confirmar
  que café no elimina publicidad y que el año no se renueva automáticamente.
- [ ] AdMob: confirmar propiedad de IDs del Release, bundle vinculado, estado de
  app/unidad/mensajes de consentimiento regionales y disponibilidad. ATT/UMP
  rechazar/revocar no bloquea ordenar; no tocar/clicar anuncios reales en QA.
- [x] PASS decisión del usuario: mantener monetización actual. Cambiar a un primer
  lanzamiento sin anuncios/compras requeriría otra decisión expresa; no es la RC elegida.

## 7. Privacidad, soporte y regiones

- [x] PASS: responsable/ciudad/email confirmados. Fuentes completas ES/EN corregidas.
- [ ] BLOCKED: adoptar/revisar política y prácticas de soporte/conservación,
  transferencias y obligaciones territoriales. Resolver DSA y representación
  aplicable; dirección/teléfono comercial verificable en ASC si corresponde.
- [ ] Con autorización separada, publicar `web/cocowash/privacy.html` y
  `privacidad.html` en sus URLs existentes. GET200 actual sirve la versión previa.
  Descargar de nuevo y comparar fecha/contenido/enlaces desde red pública.
- [ ] App Privacy ASC: partir de [propuesta corregida](../appstore/app-privacy.md),
  contrastar Privacy Report y tráfico; incluir SDKs, no marcar Data Not Collected.
- [ ] Cuestionario de edad real y export compliance. No deducir edad del ratingG
  de Ads ni exención de cifrado solo del nombre de una API; revisar el binario/SDKs.
- [ ] Disponibilidad mundial: titular selecciona países/regiones con condiciones
  legales/comerciales resueltas; no afirmar autorización universal.

## 8. Metadatos y recursos

- [x] PASS: [ES/EN](storefront/metadata.json), límites comprobados. Nombre30,
  subtítulo30, keywords100, promo170 y descripción/notas4000.
- [x] PASS fuente: icono aprobado1024 RGB, bundle/nombre/orientación retrato/familia1
  y Release coherentes; sin icono generado ni modificación de personajes.
- [ ] BLOCKED: compilar asset catalog/launch screen y validar recursos en archivo.
- [ ] Obtener [capturas nativas reales](storefront/SCREENSHOTS.md) ES/EN en tamaños
  aceptados; sin fototeca personal, mocks o funcionalidades no ejecutadas.
- [ ] Introducir categoría/derechos/copyright, soporte/privacidad, texto y capturas;
  comprobar idioma por idioma. No copiar los borradores históricos de siete idiomas
  como si fueran esta ficha final verificada.
- [ ] Adjuntar [notas App Review ES/EN](storefront/REVIEW_NOTES.md), teléfono del
  titular, explicación de permisos y productos que se envían con la primera versión.

## 9. Archivo Release y firma

- [ ] BLOCKED: confirmar en ASC versión comercial y build **no usados**.
  Fuente actual0.9.9/build43; no asumir que44 está libre. Revisar también versión
  visible de la app cuando el titular elija la comercial definitiva.
- [ ] Preparar certificados/perfil App Store existentes en Keychain, equipo,
  capacidades y entitlements. Nada por texto plano; no cambiar certificados sin permiso.
- [ ] Seguir [NATIVE_GATE §4](NATIVE_GATE.md). Copiar/revisar ExportOptions con
  Team ID real y `destination=export`. Ejecutar archivo local solo con autorización.
- [ ] Guardar xcarchive, SHA de fuente/IPA, versiones, arquitecturas, firma/perfil,
  SDK, Privacy Report, resolución y resultados; sin developer/test ads/reset.
- [ ] Repetir pruebas de seguridad y recursos en **esa** compilación candidata.
  No llamar distribuible a un `build:native` web ni a un `.app` sin firma.

## 10. TestFlight y App Review — autorización externa final

- [ ] BLOCKED: autorización explícita del propietario para validar/subir el archivo
  concreto a Apple. Revisar el hash y build; Organizer → Distribute App → App Store
  Connect. No usar el script de exportación como permiso de upload.
- [ ] Esperar procesado y resolver avisos de Apple sin declararlos aprobados antes.
  Completar beta description/What to Test/contacto/exportación y grupo interno.
- [ ] TestFlight en hardware con cuenta de QA y fixtures: instalación/actualización,
  permisos, borrado cancelado/confirmado, recuperación, persistencia, iCloud,
  anuncios/consentimiento/IAP sandbox, VoiceOver y memoria. Registrar build/modelo/OS.
- [ ] Si procede, grupo externo y Beta App Review; no prometer acceso antes de aprobación.
- [ ] Cerrar P0/P1 y criterios de [RELEASE_CANDIDATE](RELEASE_CANDIDATE.md).
- [ ] Titular revisa ficha/privacidad/capturas/productos y autoriza **ese** envío
  App Review. Seleccionar la build correcta y la liberación manual si así lo decide.
- [ ] Solo después de revisión/aprobación de Apple y permiso del titular publicar.
  Ninguno de estos pasos externos se ejecutó durante esta preparación.
