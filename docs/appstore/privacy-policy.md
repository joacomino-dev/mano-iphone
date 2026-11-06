# Política de privacidad de CocoWash

La versión vigente (6 de noviembre de 2026) es la web, en `web/cocowash/`:

- Español: https://joaquinmino.work/cocowash/privacidad.html
- English: https://joaquinmino.work/cocowash/privacy.html

Responsable: Joaquin Miño, Quito (Ecuador) · cocowash@joaquinmino.work.

Cubre lo que hace la app 0.9.9.1 (37) según su código:

- Fotos, vídeos y análisis (parecido, calidad, texto) en el iPhone con Vision; nada se
  envía al responsable ni a Google.
- Nombres de lugar con la geocodificación de Apple: solo coordenadas redondeadas a ~1 km,
  y solo con «Ubicación» activada en Ajustes.
- AdMob: primero el formulario de consentimiento de Google (UMP), después el aviso de
  rastreo de Apple (ATT); sin permiso, anuncios no personalizados (`npa=1`); anuncios
  limitados a clasificación G en el código.
- Compras: transacciones firmadas de StoreKit comprobadas en el iPhone; sin servidor.
- Bases legales (RGPD, Reino Unido, LOPDP de Ecuador), transferencias, conservación,
  derechos y aviso para residentes de EE. UU. (CCPA/CPRA y otros estados).

Si cambia lo que hace la app (otros formatos de anuncio, analítica, servidor), hay que
actualizar la web, `PrivacyInfo.xcprivacy` y las etiquetas de App Privacy a la vez.
