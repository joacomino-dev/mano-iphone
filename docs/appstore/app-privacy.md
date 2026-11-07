# Etiquetas de privacidad (App Privacy) · respuestas para App Store Connect

Deben coincidir con tres cosas que ya existen: la política publicada
(https://joaquinmino.work/cocowash/privacy.html), el manifiesto
`mano/ios/App/App/PrivacyInfo.xcprivacy` y lo que hace el código (0.9.9.1).

Regla de Apple: «recoger» es enviar datos fuera del dispositivo de forma que tú o un
tercero podáis acceder a ellos. CocoWash no tiene servidor: todo lo que se declara lo
recoge el SDK de Google AdMob, integrado en la app.

## ¿Recoges datos de esta app? → **Sí** (por el SDK de anuncios)

| Categoría › tipo | Uso | Vinculado a la identidad | Rastreo |
|---|---|---|---|
| Identificadores › ID del dispositivo (IDFA) | Publicidad de terceros; analítica | No | **Sí** (solo si la persona lo permite en el aviso de Apple) |
| Ubicación › Ubicación aproximada (de la IP) | Publicidad de terceros; analítica | No | No |
| Uso › Interacción con el producto (anuncios vistos y tocados) | Publicidad de terceros; analítica | No | No |
| Uso › Datos publicitarios | Publicidad de terceros; analítica | No | **Sí** |
| Diagnóstico › Datos de fallos | Analítica | No | No |
| Diagnóstico › Datos de rendimiento | Analítica | No | No |
| Diagnóstico › Otros datos de diagnóstico | Analítica | No | No |

## Lo que **no** se declara, y por qué

- **Fotos y vídeos**: se analizan en el iPhone; nunca salen del dispositivo.
- **Ubicación precisa**: las coordenadas de una foto, redondeadas a ~1 km, solo van al
  servicio de geocodificación del propio sistema (Apple), que no da acceso al
  desarrollador. Se apaga con Ajustes › «Ubicación».
- **Compras**: las procesa Apple; la app solo lee en el iPhone la transacción firmada.
- **Datos de contacto**: no hay cuentas ni formularios; el correo de soporte se escribe
  fuera de la app.
- **Analítica propia**: no hay.

## Comprobación final (obligatoria)

Al archivar la 1.0 en Xcode: Organizer › la build › **Generate Privacy Report**. El
informe combina el manifiesto de la app con el del SDK de Google. Si aparece algún tipo
que no está en la tabla, añádelo aquí y en App Store Connect antes de enviar; las
etiquetas deben cubrir al menos lo que declara ese informe.

## Clasificación por edad (cuestionario)

Todas las categorías de contenido: **Ninguno**. Acceso web sin restricciones: **No** (los
enlaces de ayuda y privacidad abren Safari). Contenido generado por usuarios, chat,
apuestas, concursos: **No**. Los anuncios están limitados a clasificación G en el código
y en AdMob. Resultado esperado: la clasificación más baja.

## Otros campos de la ficha

- Categoría principal: **Fotografía** · secundaria: **Utilidades**.
- URL de soporte y de marketing: https://joaquinmino.work/cocowash/
- URL de la política de privacidad: https://joaquinmino.work/cocowash/privacidad.html
  (en inglés: https://joaquinmino.work/cocowash/privacy.html)
- Copyright: 2026 Joaquin Miño
- Cifrado (`ITSAppUsesNonExemptEncryption`): ya declarado **No** en Info.plist.
