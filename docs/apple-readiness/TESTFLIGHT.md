# Protocolo de dispositivos físicos y TestFlight

**RC 0.9.9.2, actualizado 2026-11-09:** fuente ya preparada con developer=false y ajustes comerciales Release existentes, sin cambio de estrategia. Archivo/subida no realizados. Seguir el [gate Mac actualizado](NATIVE_GATE.md) y [checklist de envío](APP_STORE_SUBMISSION_CHECKLIST.md); cerrar R-67/Live y privacidad del archivo antes de firmar. El texto siguiente conserva procedimientos de Fase2.

Preparado 2026-11-07; **PENDIENTE**, no ejecutado. Ninguna subida, publicación,
compra o modificación de certificados se autoriza por este documento.

## Puertas técnicas previas

1. Integrar los commits revisados en el canal release conservando la última base.
   Confirmar que DEVELOPER=false, IDs comerciales existentes y ausencia de reset/
   test ads; mantener `main` como único canal de tienda. El workflow developer cambia solo
   su copia CI y no es un archivo de TestFlight.
2. Ejecutar `bash scripts/validate-apple-native.sh` en macOS y conservar SHA, diff,
   Xcode/SDK, Package.resolved, arquitecturas, logs y recursos del bundle.
3. Ejecutar PhotoKit real en simulador desechable y los casos destructivos definidos
   en TEST_PLAN. El gate legado de lectura no cubre esa puerta. Fallos P0 detienen
   distribución; no usar pregrants, marcadores falsos o borrar fotos personales.
4. Inventariar los simuladores realmente disponibles, incluyendo SDK/runtime y tipo
   exacto. Si no existe uno solicitado, registrar NO VERIFICABLE, sin instalar runtimes
   o declarar un modelo probado por inferencia de dimensiones.

## Cuenta, firma y archivo: acciones del propietario

- Confirmar Developer Program activo, equipo propietario del bundle `work.joaquin.mano`,
  app correcta en ASC, contratos y acceso necesario. No compartir claves privadas.
- Consultar el mayor build ya recibido en ASC y decidir versión/build únicos. No
  asumir que 44 está libre ni cambiar solo el nombre de archivo del IPA.
- Elegir perfiles/certificados existentes válidos y firma de distribución. Revisar
  entitlements efectivos frente a funciones actuales; no habilitar capabilities por
  probar. En fuente no se encontró archivo propio de entitlements ni Team ID fijado.
- Preparar Archive Release firmado. Comprobar Bundle ID, versiones, mínimo17,
  arm64, embedded provisioning y recursos de los siete idiomas en ese archivo.
- Revisar privacidad agregada y SDKs/manifiestos/firmas; comparar etiquetas con Ads,
  UMP, StoreKit y geocodificación. “Análisis local” no equivale a “app sin red”.
- Completar privacidad, exportación, edad, países, soporte, derechos y metadatos;
  revisar disponibilidad accidental en iPad, Mac Apple silicon y visionOS.
- Solo tras autorización explícita: validar/enviar el archivo elegido a ASC y
  habilitar TestFlight. Validación que envíe datos a Apple también debe estar
  comprendida en esa autorización. No usar `-allowProvisioningUpdates` como atajo.

Las exigencias actuales de SDK/Xcode se reconsultan en
[Apple](https://developer.apple.com/news/upcoming-requirements/): el umbral consultado
es Xcode26/SDK26 o posteriores. SDK27.1 de la base no sustituye el nuevo build.
La [guía TestFlight](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/)
separa testers internos y externos; la prueba externa puede requerir Beta App
Review. Completar “What to Test” y contacto; no prometer disponibilidad externa
antes de que Apple la habilite.

## Biblioteca física de pruebas

Usar equipo/cuenta de pruebas con biblioteca sintética e iCloud propio de QA.
En el teléfono personal solo demo y operaciones no destructivas. No confirmar
Eliminar ni vaciar Eliminado recientemente personal. No desinstalar la app para
resolver un problema: preservación de decisiones/migración es parte de la prueba.

Conjuntos reproducibles: pequeño (1.000), medio (10.000), grande (50.000) con un
manifiesto local de generación: número/tipo/dimensiones/duración/bytes, sin nombres
personales. Mezclar fotos, vídeos, Live Photos, favoritas, ocultas, editadas y assets
solo nube. Empezar con un subconjunto pequeño para cualquier prueba destructiva.
Las cifras son tamaños **planificados**, no bibliotecas que se hayan importado aquí.

| Cohorte física recomendada | Prioridad y objetivo |
| --- | --- |
| SE 2/3 o compacto disponible | Memoria limitada, teclado/hojas/controles y permisos; separar mínimo17 del OS real instalado |
| XR/XS si se promete cubrir esa cohorte | iOS17/18 reales, seguridad de plataforma y fluidez; no inferir resultado desde SE |
| Estándar con notch/Island | Vídeo, iCloud, suspensión, permisos externos y uso habitual |
| Pro Max reciente | Alta resolución/HDR, vídeos largos, geometría y contraste/lectura |
| Duo | Exterior/interior, poses, cámara activa, márgenes asimétricos, Split View y continuidad |

Registrar modelos/OS **efectivamente usados**, sin llamar probado a toda su familia.
Mac/iPad/visionOS requieren decisión de disponibilidad y QA propio.

## Ejecución y aceptación

1. Guardar versión/SHA/build, modelo, OS, estado térmico/batería, espacio libre,
   conexión y permisos. No exportar identificadores de fotos reales a informes públicos.
2. Full/limited/denied/revoked, ambos sentidos de cambio, limited0/1/N, revisión/
   inspector/álbum abiertos y reanudación. Verificar biblioteca actual y decisiones.
3. Descartar uno/varios, recuperar, undo30 y relanzar. Borrado sintético con cancelar,
   error, favorita externa, elemento ausente y callbacks fuera de orden. Ningún
   error o pendiente debe sumar eliminados; Recuperar se bloquea mientras Fotos decide.
4. Original local/nube, red lenta/intermitente/avión. Foto/vídeo grande, retry/cancel,
   póster/inline/fallback, pausa/sonido/tiempo al anclar. No interpretar preview como
   descarga completa ni salida de Fotos como espacio físicamente devuelto.
5. Terminar/suspender/relanzar tras decisiones y confirmaciones, con disco/cuota/
   presión de memoria. Verificar decisiones ya reconocidas,
   coherencia del diario y exactitud de undo; el fallback silencioso cuando falla
   el almacenamiento no garantiza durabilidad. No reintroducir avisos R-64.
6. Instruments: arranque/primera carta, Allocations/VM/Leaks, CPU/Energy, scroll de
   revisión e indexación durante tandas 15 min. Guardar dispositivo y condiciones;
   comparar contra baseline, sin extrapolar los tiempos Node de esta fase.
7. VoiceOver, Switch Control, teclado, tamaños máximos, Reduce Motion, contraste y
   RTL/7 idiomas. Verificar acceso a Recuperar/Eliminar y que cada control se anuncie.
8. Sandbox: año/vitalicio/café existentes, pending/cancel, restore, reembolso,
   caducidad y dos equipos; ATT/UMP permitido/denegado/restringido, cambio regional y
   offline. Ninguna compra real es parte de la automatización.

## Recibo por caso

### R-67: arranque intermitente — NOT TESTED en hardware

Observado en fa318ba/42634699746: bridge listo y documento principal cargado,
pero jerarquía de WKWebView vacía durante 120s. No se inició ningún borrado.
No se reproduce en 2794e4b; su causa sigue abierta. No ocultarlo con retries.

1. Instalar la IPA de desarrollo 0.9.9.2/build44 conservando la identidad/firma y
   datos existentes. Si la firma impide actualizar, detenerse y usar la identidad
   anterior o un equipo de pruebas limpio; no desinstalar para resolverlo.
2. Registrar modelo/OS, SHA/canal, permiso, red, espacio libre y hora con zona.
   La biblioteca personal solo se usa para arranque y navegación de lectura.
   Álbumes/favoritas/decisiones de prueba requieren la biblioteca sintética de QA.
3. Hacer 20 cierres/arranques desde el selector de apps, con la app en reposo entre
   ellos. Cronometrar interfaz utilizable. Ante la primera pantalla vacía, parar
   la serie, conservarla abierta y registrar si persiste hasta 120s. No repetir
   hasta obtener un verde ni borrar cachés, preferencias o datos.
4. En Mac con el dispositivo ya emparejado, abrir Consola, seleccionar el teléfono
   y grabar antes del arranque: proceso CocoWash/App y WebKit. Registrar PID/hora,
   bridge, carga de recursos, errores JS y almacenamiento. Conservar logs privados
   fuera de Git; capturas y material compartido deben contener solo fixtures.
5. Para inspeccionar JavaScript, reproducir con una compilación Debug del mismo
   SHA y fixtures en Mac/simulador. Capacitor8.6.0 habilita isInspectable por defecto
   en Debug; abrir Safari › Desarrollo › simulador/dispositivo › CocoWash. La IPA
   Release entregada no garantiza ese inspector. Comprobar módulo JS pendiente,
   initializeJournal/IndexedDB, terminación de WebContent o bloqueo del cargador.
   Distinguir hipótesis con evidencia antes de cambiar persistencia o arranque.
6. Registrar PASS/FAIL del procedimiento y enlazar el diagnóstico local en la
   plantilla. 20 arranques satisfactorios son evidencia acotada; no explican por
   sí solos el fallo anterior ni constituyen aprobación de publicación.

```text
Fecha / operador:
SHA / diff / canal / versión-build:
Modelo real o simulador + runtime + SDK:
Conjunto sintético / permisos / red / espacio:
Pasos / resultado esperado / resultado observado:
Estado: VERIFICADO | PENDIENTE | NO VERIFICABLE EN ESTE ENTORNO
Log/xcresult/captura sin datos personales:
Problema P0-P3 / siguiente acción:
```

Criterio de avance: P0 y P1 aplicables cerrados con evidencia nativa; límites de
compatibilidad y privacidad exactos; P2 aceptados explícitamente donde afecten
publicación; configuración comercial/administrativa completada. Una compilación,
un IPA o la instalación TestFlight no sustituyen esos resultados.
