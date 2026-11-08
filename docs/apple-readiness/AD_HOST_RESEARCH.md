# R-02 / R-56 — hosts de anuncios de prueba

Estado inicial del laboratorio: **NOT TESTED**. Gate de privacidad submission
continúa **FAIL** por tracking=true/domains vacío. No se editan manifiesto ni
etiquetas por conjeturas. El propietario debe aprobar una propuesta fundamentada.

`ad-traffic-lab.yml` usa dos simuladores efímeros en runners públicos estándar,
ATT permitido/denegado por su diálogo real. Mantiene el appID iOS configurado para
UMP y añade **solo en la copia CI** CocoWashTestAds=true, que selecciona el ad unit
público de prueba existente. No se solicitan anuncios comerciales ni se pulsan.

El test exige onboarding/permiso Fotos real y sesión. Espera ATT tras el flujo
UMP existente, pulsa la opción exacta y espera la llamada real del SDK. Si UMP no
permite anuncios, ATT no aparece o no se llama a loader.load, el resultado no es
PASS. Logs condicionales solo en testAds indican estado ATT/npa y callback recibido;
no incluyen identificadores de anuncios, IDFA ni tokens. No es aceptación RC.

El proxy CONNECT local registra únicamente host, puerto, tiempo, transporte y
fase. No intercepta TLS ni escribe URLs, paths, consultas, cabeceras o cuerpos.
Usa API pública SystemConfiguration en el runner efímero; guarda un snapshot
privado(no artefacto) y restaura toda la configuración anterior en finally.
Solo procesa HTTP(S) y escucha en loopback. Calibración nativa URLSession contra
apple.com,15s de baseline y fase de app se guardan por separado. Sin calibración
observada no se acepta captura. Cuatro pruebas de parser PASS, no evidencia de red.

Límites: proxy del runner completo, no atribución exclusiva por proceso; tráfico
de fondo puede coincidir con la fase app. QUIC, conexiones previas o clientes que
ignoren el proxy quedan fuera. Un host observado no es automáticamente tracking,
y un host ausente no prueba que no se use. Correlacionar estado/callsite/callback,
baseline y documentación del proveedor. No sustituye Privacy Report de Xcode ni
pruebas en hardware/red real.

Revisar artefactos de ambos estados y dependencias realmente empaquetadas; preparar
lista con propósito/fuente/certeza e impacto de bloqueo sin ATT. Solicitar aprobación
antes de modificar NSPrivacyTrackingDomains. No atribuir a Google una lista que no
haya publicado o confirmado.

Fuentes oficiales:
[GMA disclosure](https://developers.google.com/admob/ios/privacy/data-disclosure),
[privacidad iOS/ATT](https://developers.google.com/admob/ios/privacy/strategies),
[manifiesto y dominios](https://developer.apple.com/documentation/technotes/tn3182-adding-privacy-tracking-keys-to-your-privacy-manifest).
