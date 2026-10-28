# MemSwipe — recuerdos que se quedan

Una app de iPhone para revisar Fotos mediante una mano de cartas. Interfaz verde petróleo, papel y sellos de tinta; sin cuenta propia, anuncios, suscripciones ni API de reconocimiento de pago.

La bienvenida muestra fotos flotantes y «Iniciar sesión». Cada sesión mezcla al azar fotos, vídeos y Live Photos; cuando un elemento pertenece a un grupo visual analizado, aparece automáticamente un bundle de polaroids. La foto principal queda centrada y recta; tocarla o pulsar Siguiente la pasa al final. Puedes seleccionar varias girando la pila o elegir todas. Los filtros permiten cambiar el orden.

El nombre visible y el icono son MemSwipe; el identificador interno y las claves de datos se conservan para actualizar la instalación existente.

## Uso

- Derecha conserva; izquierda añade a una cola pendiente; arriba marca como favorita.
- Tocar el centro de la primera carta la pasa al fondo. Tocar su control de selección permite elegir varias y decidir juntas.
- Mantener pulsado inspecciona la foto sin sello. Soltar vuelve a la mano.
- Terminar abre la revisión. Mantener pulsado un descarte y arrastrarlo a la derecha lo recupera. También hay un botón accesible Recuperar.
- Finalizar sesión vuelve a la bienvenida y conserva los descartes pendientes; no los borra.
- El borrado real solo ocurre después de la revisión y la confirmación de Fotos. Favoritos y fotos ocultas se vuelven a proteger antes de borrar.
- Álbum añade las seleccionadas a un álbum real existente. No las saca de la biblioteca general.
- Vídeos y Live Photos tienen reproducción nativa. Las fotos RAW/HEIF y otros formatos admitidos por Fotos usan su vista previa sin convertir ni reemplazar el original.

## Sellos

Blanco, rojo, verde, negro, azul, morado, naranja y dorado. Conservar de nuevo incrementa el nivel; aparecer por sí solo no lo incrementa. Descanso por nivel: 7, 14, 30, 60, 120, 240 y 365 días; dorado solo se revisa manualmente. Las fotos sin sello tienen prioridad. El filtro por sello permite revisar un nivel aunque todavía esté descansando.

Los sellos son metadatos locales y capas visuales; jamás se imprimen sobre el original. Deshacer restaura el nivel y la fecha anteriores.

## Privacidad y límites

El análisis utiliza Apple Vision dentro del iPhone. Compara vistas previas de fotos, Live Photos y portadas de vídeo; no analiza el vídeo completo. Las agrupaciones son sugerencias de parecido visual, no detección infalible de duplicados. La primera indexación empieza tras autorizar Fotos y se puede repetir desde Sellos. Los resultados se guardan localmente.

El análisis inicial solo usa vistas previas disponibles localmente y comunica las que no puede analizar. Abrir una foto o reproducirla puede descargar contenido desde tu iCloud; no se envía a ningún servidor de Mano. Ocultas y favoritas no se incluyen. Con acceso limitado solo se revisan los elementos autorizados.

La cola, sellos e historial se guardan en el almacenamiento de la app y sobreviven a cierres normales. No desinstales la app para renovar la firma: al desinstalar puedes perder esos metadatos. La biblioteca original sigue perteneciendo a Fotos. El borrado con Fotos en iCloud se sincroniza con otros dispositivos.

## Desarrollo

Requisitos: Node 22+, npm. La vista previa conserva el runtime móvil de Product Design; la app instalada usa una entrada propia sin marco ni teclado ficticios.

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 4173
npm test
npm run check:runtime
npm run build
npm run sync:ios
```

`src/ManoApp.tsx` contiene la interfaz compartida; `src/domain.ts` la cola y los sellos; `ios/App/App/PhotoLibrary.swift` el puente PhotoKit/Vision. Las fotos incluidas en la demostración son generadas; el navegador nunca accede a tus originales ni realiza borrados reales.

El análisis se puede detener desde Sellos. Una huella visual rápida limita a 64 los candidatos comparados con Vision por imagen; los grupos siguen siendo sugerencias que debes revisar. Un análisis parcial de iCloud no se marca como terminado: Actualizar o volver a abrir permite intentarlo otra vez. La biblioteca y sus fechas de modificación invalidan la marca de análisis completado cuando cambian.

## Compilación gratuita e instalación

El workflow del repositorio usa únicamente runners estándar y se bloquea si el repositorio es privado. Compila el dispositivo iPhone sin firma y produce `Mano-AltStore/Mano-unsigned.ipa` como artefacto. No necesita certificados, contraseña de Apple, suscripción Developer ni secretos en GitHub. El job inicial puede expandir un `mano-source.zip` subido desde navegador y dejar el código normal en el repositorio; después ya no modifica fuentes.

1. Descargar el artefacto de una ejecución verde de Actions y extraer el `.ipa`.
2. Instalar AltServer/AltStore Classic siguiendo su guía oficial para Windows. Los pasos de Apple, confianza del dispositivo, Modo Desarrollador y cualquier autenticación se realizan personalmente.
3. Abrir el `.ipa` desde Mis apps en AltStore y conceder el acceso a Fotos que quieras revisar.
4. Renovar la firma antes de siete días; comprobar que AltStore puede contactar con AltServer. Mantener el identificador `work.joaquin.mano` al actualizar para conservar datos.

No se garantiza que servicios externos mantengan su plan gratuito indefinidamente. Nunca introducir datos de pago para habilitar este workflow: cualquier solicitud de verificación o facturación debe revisarse antes de continuar.

Guías oficiales: https://faq.altstore.io/altstore-classic/how-to-install-altstore-windows y https://faq.altstore.io/altstore-classic/your-altstore.

La compilación no demuestra funcionamiento en un iPhone real. Verificar allí permisos, iCloud, reproducción, gestos y primero un borrado de fotos desechables con recuperación en Fotos.
