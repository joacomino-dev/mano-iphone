# CocoWash 9.7.2.1 — corrección / build 21, desarrollo

Desde 0f0b8ac (última entrega9.7.2), rama `cocowash/9.7.2.1`. No main ni Release.
Usuario reporta fallo al iniciar Personas/cerrar app. **9.7.2 no aceptada físicamente**.
No se recibió .ips/jetsam del teléfono; no se atribuye una causa exacta del cierre.
La compilación anterior y los mocks no demostraban estabilidad física: esa frontera
se mantiene explícita. Backup de refs/24 archivos CRLF previos pre-9721 verificado.

## Defectos demostrables y corrección

- `usePeople.ts`: un rechazo de scan deshabilitaba el motor, pero dejaba running
  true y el indicador activo. Un error al abrir índice ocultaba la sección completa.
  Ahora queda estado pausado/error visible con recuperación. Una cancelación vieja
  no puede sobrescribir la reanudación; se invalidan respuestas por generación.
- La recuperación aguardaba busy sin límite. Ahora una espera excedida ofrece error,
  sin habilitar trabajo concurrente encima de una operación que aún no termina.
- Borrar un índice ilegible fallaba: antes se intentaba abrirlo, también desde la
  pausa previa. Reset ya no depende de abrir ese índice; respeta el drenaje de trabajo.
- `People.swift`: open/status cargaban el modelo persistido y refresh accedía al SDK
  al arrancar. Ahora arranque/estado usan metadata; modelos y limpieza SDK son lazy,
  solo dentro del trabajo de análisis. No se refresca durante una tanda activa.
- La suspensión dependía del JS. `PeopleActivityGate`, actualizado sincrónicamente
  desde UIKit/UIScene/protección de datos, cancela todas las peticiones PhotoKit,
  invalida generaciones y solicita detener la tarea nativa. No se admiten nuevas
  operaciones SDK/render tras detectar suspensión. Contextos se sueltan al drenar.
  Epoch se comprueba después de awaits para derivados/miniaturas.
- Marcador privado analysis-inflight antes de cada tanda: una terminación abrupta
  pausa el siguiente arranque, no vuelve a cargar automáticamente el mismo análisis.
  No elimina progreso; usuario puede reanudar. Error nativo pausa también intención.
- Previews canceladas al salir se reintentan al volver, manteniendo cubierta. Las
  imágenes ya resueltas no se regeneran por cada retorno.

Estos defectos explican bloqueos/riesgos del flujo. Sin log físico no demuestran
si el cierre observado fue memoria, SDK, protección de datos o GPU. Apple exige
[restringir trabajo Metal al salir](https://developer.apple.com/documentation/metal/preparing-your-metal-app-to-run-in-the-background).
No se promete cancelación instantánea dentro del SDK ni ejecución facial de fondo.

## Reinicio de datos autorizado por usuario

Solo IPA con `CocoWashDevelopmentReset=true`, añadido explícitamente al empaquetar.
Cada **nueva combinación versión/build**, una sola vez, borra índice/correcciones,
miniaturas/firmas/cachés propias, preferencias y datos WKWebView (decisiones, sellos,
sesión, ajustes, onboarding). Mismo build reabierto conserva su progreso.
Fotos/álbumes/favoritos de PhotoKit, Documents y credenciales externas no se tocan.
Sin llamadas de borrado a Fotos. Reinicio no equivale a eliminar fotos descartadas.

`SceneDelegate` espera limpieza de archivos en utility y finalización del borrado
WebKit **antes de crear ManoBridgeController**. Se eliminan entradas de storyboard
automáticas para impedir un segundo bridge previo al reset. Marcador de build solo
tras completar limpieza; error no abre estado parcial y permite reintentar al relanzar.
La opción no existe en paquetes sin ese flag; no es una política de producción.

Nombre de entrega9.7.2.1; CFBundleShortVersionString sigue9.7.2 por formato iOS de
hasta tres componentes, CFBundleVersion21 distingue la corrección e inicia reset.
No desinstalar para actualizar; este build reinicia los datos autorizados igualmente.

## Paquete de prueba

Fuente `7487cbe46d9226f112405e50c6fd070a75016e73`; [CI41956222043](https://github.com/joacomino-dev/mano-iphone/actions/runs/41956222043), **success**.
IPA: `C:/Users/Joaco/Downloads/CocoWash-9.7.2.1-correccion-7487cbe4.ipa`.
5,797,140 bytes; SHA256 `d8a42b427438fba18a1cd66d9c4b90fbe371ae3f7b46277f7ce3fded05d8a3d6`.
Digest ZIP de GitHub, CRC, bundle/build, flag de reset, ausencia de autoload de
storyboard, arm64/mínimo17, enlace débil Media Intelligence, textura y marcadores
verificados. Recibo JSON junto al IPA. Sin firma ni instalación física.

## Validación

- 113 Node, TypeScript/runtime28, builds web/native-web y Sites4: PASS.
- Edge: errores de arranque/scan, reset tras error de apertura, carrera de suspensión
  y respuesta cancelada tardía: PASS. Hook/grupos/modos/undo30/recarga/privacidad
  normal y Reduce Motion: PASS. Fixtures explícitas; no reconocen rostros reales.
- Swift (incluida seguridad/reset), SDK público y Release iPhone: PASS, CI final7487cbe.
- Test nuevo de Foundation: fence/epoch, cancelación antes/después de registro,
  reset por build/idempotencia/producción excluida y conservación fuera de alcance.
- Smoke nuevo en simulador desechable: índice sintético previo, arranque con reset,
  archivo Documents conservado, marcador persistido y segundo arranque sin reset;
  capturas y proceso vivo: PASS. La captura muestra el permiso de Fotos del sistema;
  no se pulsó ni concedió. No demuestra reconocimiento ni suspensión físicos.

## Checklist física

- [ ] Instalar build21: onboarding nuevo, sellos/decisiones/sesión/index anteriores
  reiniciados; biblioteca Fotos intacta. Fallo: arrastra filtro/persona antiguos.
- [ ] Activar Personas y continuar organizando: responde, indicador sin grupos
  provisionales; fallo: spinner aun con error sin opción de reanudar.
- [ ] En pleno análisis ir a Inicio, bloquear/desbloquear y volver varias veces:
  app abre y permite reanudar, sin cierre ni pantalla muerta; progreso se conserva.
- [ ] Forzar cierre analizando y reabrir: arranque usable, análisis interrumpido
  pausado si quedó tanda en vuelo; no repite un ciclo de cierres automáticos.
- [ ] Resolver una decisión/cambiar ajuste y reabrir **el mismo build**: se conserva.
  Fallo: se borran datos cada apertura (reset debe ocurrir solo al estrenar build).
- [ ] Activar censura y salir durante carga: al volver continúa cubierta hasta tener
  derivado válido, sin rostro original; previsualizaciones incompletas se recuperan.

Pendiente: reproducir con biblioteca/iPhone del usuario, precisión facial y memoria/
calor. Si continúa cierre, conservar .ips o JetsamEvent con fecha/build para atribuir
causa; estos archivos no deben subirse al repositorio con datos personales.
