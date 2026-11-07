# Material de revisión — ES / EN

Texto preparado para pegar tras superar gates. No enviado. Contacto técnico:
Joaquin Miño, cocowash@joaquinmino.work. El titular debe introducir teléfono real
de contacto en ASC y seleccionar build/productos verificados; no hay login ni
credenciales demo que proporcionar. No adjuntar datos de bibliotecas personales.

## Español

CocoWash organiza fotos y vídeos del iPhone. No hay registro ni servidor propio
de análisis. El procesamiento de la fototeca ocurre en el dispositivo. Los SDK
publicitarios de Google sí pueden tratar identificadores y datos técnicos según
consentimiento y ATT; la política detalla esa separación.

El permiso de Fotos se solicita en la última tarjeta de onboarding. Con acceso
limitado solo se muestran los elementos autorizados; se puede ampliar la selección.
Con permiso denegado se ofrece abrir Ajustes. No se exige aceptar rastreo para ordenar.

Para revisar el flujo utilice una biblioteca de prueba: conserve una foto, márquela
como favorita, pruebe Más tarde y Deshacer. Descartar solo encola; Terminar abre
Una última mirada. Recuperar retira un descarte de la cola. Eliminar N llama a
PhotoKit y requiere la confirmación de Fotos. Cancelar mantiene la cola. Las
favoritas se reconsultan antes de borrar. Tras confirmar, la recuperación depende
de Eliminado recientemente de Fotos, no de Deshacer en CocoWash. Nunca vaciamos
Eliminado recientemente.

Los originales solo en iCloud necesitan red. La organización de archivos locales
puede usarse sin conexión. Parecido y calidad son ayudas locales; la estética
requiere iOS18+. No hay Personas, Breakup Mode ni identificación facial.

Hay anuncios nativos identificados como publicidad en cartas de la pila y en
resúmenes/revisión. UMP gestiona consentimiento regional y ATT precede al rastreo.
Si UMP no permite solicitar anuncios no se solicitan. Con ATT no autorizado se
piden anuncios no personalizados. Si no hay anuncio disponible, ordenar continúa.

Filtros → Apoyo contiene los productos disponibles de StoreKit y Restaurar compras:
un año sin anuncios (no autorrenovable), sin anuncios para siempre (no consumible)
y café de apoyo (consumible, no elimina anuncios). Precios locales de StoreKit;
no hay suscripción autorrenovable. Filtros → Ajustes → Ayuda enlaza soporte y política.

## English

CocoWash organizes iPhone photos and videos. No account or analysis backend is
required. Library analysis happens on device. Google advertising SDKs may process
identifiers and technical data according to consent and ATT, as explained in the policy.

Photos access is requested on the last onboarding card. Limited access only shows
selected assets and offers a way to choose more. Denied access offers Open Settings.
Tracking permission is not required to organize photos.

Please use test media: keep a photo, mark a favorite, try Later and Undo. Discard
only queues an item. Finish opens One last look. Recover removes an item from the
queue. Delete N uses PhotoKit and requires Apple Photos confirmation. Cancellation
keeps the queue; favorites are checked again before deletion. After confirmation,
recovery depends on Recently Deleted in Photos, rather than Undo in CocoWash.
CocoWash never empties Recently Deleted.

iCloud-only originals need a connection. Local media can be sorted offline.
Similarity and quality are local suggestions; aesthetics requires iOS18 or later.
People grouping, Breakup Mode and facial identification are not offered.

Native Google ads are labelled on letter-style cards and in review/summary.
UMP handles regional consent and ATT precedes tracking. No ad is requested when
UMP does not permit it. Ads requested without ATT authorization are non-personalized.
Sorting remains available if no ad is returned.

Filters → Support shows available StoreKit products and Restore purchases: a
non-renewing one-year ad-free pass, lifetime ad removal (non-consumable) and a coffee
tip (consumable, does not remove ads). Prices come from StoreKit. No auto-renewing
subscription is offered. Filters → Settings → Help links support and privacy.

## Explicación de permisos

Los textos exactos localizados de lectura/álbumes/ATT están en los recursos
`mano/ios/App/App/{es,en}.lproj/InfoPlist.strings`. Son la fuente para revisión;
no sustituirlos por un permiso de cámara/localización que la app no solicita.
Soporte ES/EN y política: campos HTTPS reales en [metadata.json](metadata.json).
