# Publicar CocoWash 1.0 (iPhone 0.9.9 build 48)

Decisión del usuario (2026-11-17): publicar el código de iPhone 0.9.9 (48) como versión **1.0**.
La versión se fija al compilar; el código fuente no cambia.

## Lo que hace la CI (Claude la lanza cuando tú termines tus pasos)

| Flujo | Qué hace |
|---|---|
| [Capturas 6,9"](../../.github/workflows/apple-store-screens.yml) | 4 pantallas × 7 idiomas en un iPhone Pro Max simulado, con fotos de prueba |
| [TestFlight](../../.github/workflows/appstore-testflight.yml) | Compila 1.0 (48), la firma en la nube, comprueba la IPA y la sube |
| [Ficha y envío](../../.github/workflows/appstore-listing.yml) | Con [`scripts/asc_publish.py`](../../scripts/asc_publish.py): textos en 7 idiomas, capturas, categorías, copyright, derechos de contenido, edad, contacto y notas de revisión, gratis, disponibilidad (todo menos China), 3 compras con textos, precio, disponibilidad y captura; envío a revisión solo si se marca |

## Lo que haces tú, en orden

1. **Acuerdo de apps de pago** (obligatorio por las compras):
   <https://appstoreconnect.apple.com/business> → *Paid Apps* → aceptar, cuenta bancaria y
   formularios fiscales.
2. **Estado de comerciante (DSA)**, en la misma página de Business. Con anuncios y compras lo
   habitual es declararte comerciante; tu dirección, teléfono y correo se mostrarán en la UE.
3. **Clave de la API**: <https://appstoreconnect.apple.com/access/integrations/api> → *Team Keys*
   (la primera vez, *Request Access*) → *Generate API Key* → nombre `CocoWash CI`, acceso
   **Admin** → descarga `AuthKey_XXXXXXXXXX.p8` (solo una vez). Anota *Key ID* e *Issuer ID*.
4. **Team ID**: <https://developer.apple.com/account> → *Membership details* → *Team ID*.
5. **Secretos en GitHub**: <https://github.com/joacomino-dev/mano-iphone/settings/environments/new>
   → nombre `app-store` → *Configure environment* → *Add environment secret*, uno por uno:

   | Nombre | Valor |
   |---|---|
   | `ASC_KEY_ID` | Key ID (10 caracteres) |
   | `ASC_ISSUER_ID` | Issuer ID |
   | `APPLE_TEAM_ID` | Team ID (10 caracteres) |
   | `ASC_KEY_P8` | Abre el `.p8` con el Bloc de notas, copia **todo** (con las líneas BEGIN/END) y pégalo |
   | `ASC_REVIEW_PHONE` | Opcional: tu teléfono para el equipo de revisión, p. ej. `+593 99 999 9999` |

   Después guarda el `.p8` en tu gestor de contraseñas y bórralo de Descargas.
6. **Precios** de las tres compras, en dólares (Apple ajusta el resto de países): un año sin
   anuncios, sin anuncios para siempre e invítame un café. Díselos a Claude.
7. **Privacidad de la app** (la API de Apple no permite rellenarla):
   <https://appstoreconnect.apple.com/apps> → CocoWash → *App Privacy* → *Get Started*.
   ¿Recoges datos? **Sí**. Marca estos tipos y, en cada uno, los usos indicados:

   | Tipo (en Apple) | Usos | ¿Vinculado al usuario? | ¿Rastreo? |
   |---|---|---|---|
   | Identifiers › Device ID | Third-Party Advertising, Developer's Advertising or Marketing, Analytics | Sí | Sí |
   | Location › Coarse Location | Third-Party Advertising, Developer's Advertising or Marketing, Analytics, App Functionality | Sí | No |
   | Usage Data › Product Interaction | Third-Party Advertising, Developer's Advertising or Marketing, Analytics, App Functionality | Sí | No |
   | Usage Data › Advertising Data | Third-Party Advertising, Developer's Advertising or Marketing, Analytics | Sí | Sí |
   | Diagnostics › Crash Data | Analytics, Third-Party Advertising | No | No |
   | Diagnostics › Performance Data | Third-Party Advertising, Developer's Advertising or Marketing, Analytics, App Functionality | No | No |
   | Diagnostics › Other Diagnostic Data | Third-Party Advertising, Developer's Advertising or Marketing, Analytics | No | No |

   Fuente y razones: [app-privacy.md](app-privacy.md). Pulsa *Publish* arriba a la derecha.
8. Avisa a Claude con «listo». Claude sube la build, rellena la ficha y te enseña el resultado.
9. Revisa la ficha en App Store Connect y, si te gusta, dile a Claude «envíala». Si falta el
   teléfono de contacto, añádelo en la página de la versión (*App Review Information*).

Con `AFTER_APPROVAL`, la app sale sola en cuanto Apple la apruebe (normalmente 1–3 días).
