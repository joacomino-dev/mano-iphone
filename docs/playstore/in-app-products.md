# Productos dentro de la app · Google Play Console

Tres **productos únicos** (Monetize › Products › One-time products) con exactamente estos
IDs, iguales que en la App Store: la app los busca por nombre
(`CocoMonetizationPlugin.kt`). Play no tiene suscripciones no renovables y su alquiler dura
como máximo 60 días, así que «Un año sin anuncios» es un producto único que la app mantiene
un año (decisión del usuario, 2026-11-07).

| Producto | ID | Opción de compra | Qué hace la app |
|---|---|---|---|
| Un año sin anuncios | `work.joaquin.mano.noads.year` | **Comprar** (no alquiler) | Lo reconoce (*acknowledge*); sin anuncios hasta `purchaseTime` + 1 año (fecha firmada por Play); al vencer lo **consume** para poder volver a comprarlo |
| Sin anuncios para siempre | `work.joaquin.mano.noads.lifetime` | **Comprar** | Lo reconoce; nunca se consume |
| Invítame un café | `work.joaquin.mano.coffee` | **Comprar** | Lo **consume** (se puede repetir); no quita anuncios |

Precio: a tu elección (Play convierte a cada país). Si un producto se reembolsa, Play lo
retira de las compras y la app vuelve a mostrar anuncios.

## Nombres y descripciones (Play: nombre ≤ 55, descripción ≤ 200)

Los mismos textos que la App Store (`docs/appstore/in-app-purchases.md`), ya dentro de los
límites de Play:

| Idioma | Año: nombre / descripción | Para siempre: nombre / descripción | Café: nombre / descripción |
|---|---|---|---|
| es | Un año sin anuncios / Un año sin anuncios. No se renueva solo. | Sin anuncios para siempre / Sin anuncios para siempre. Pago único. | Invítame un café / Una propina. No quita los anuncios. |
| en | A year without ads / One year with no ads. Doesn't auto-renew. | No ads, forever / No ads, ever. One-time payment. | Buy me a coffee / A tip. It doesn't remove ads. |
| fr | Un an sans pub / Un an sans pub. Sans renouvellement auto. | Sans pub, pour toujours / Plus jamais de pub. Paiement unique. | Offre-moi un café / Un pourboire. Ne retire pas la pub. |
| de | Ein Jahr ohne Werbung / Ein Jahr werbefrei. Verlängert sich nicht. | Für immer ohne Werbung / Nie wieder Werbung. Einmalzahlung. | Spendier mir einen Kaffee / Ein Trinkgeld. Entfernt keine Werbung. |
| it | Un anno senza pubblicità / Un anno senza pubblicità. Non si rinnova. | Senza pubblicità per sempre / Mai più pubblicità. Pagamento unico. | Offrimi un caffè / Una mancia. Non toglie la pubblicità. |
| ar | سنة بلا إعلانات / سنة كاملة بلا إعلانات. لا تتجدد تلقائيًا. | بلا إعلانات إلى الأبد / بلا إعلانات إلى الأبد. دفعة واحدة. | ادعُني إلى قهوة / إكرامية. لا تزيل الإعلانات. |
| ja | 1年間広告なし / 1年間広告なし。自動更新はありません。 | ずっと広告なし / 広告を永久になし。買い切りです。 | コーヒーをおごる / チップです。広告は消えません。 |

## Pruebas (sin cobrar)

1. Play Console › Configuración › **Pruebas de licencias**: añade las cuentas de Gmail de
   los testers (y la tuya). Sus compras se hacen con tarjetas de prueba y no se cobran.
2. Sube el AAB a la prueba cerrada; los productos solo aparecen en builds instaladas desde
   Play (no en el APK de desarrollo).
3. Comprueba: comprar cada uno, el café dos veces, «Restaurar compras» tras reinstalar, y el
   año: con una licencia de prueba la fecha de fin que muestra Apoyo debe ser la de compra +
   1 año.

## Pendiente antes de producción

- Verificación de firma de la compra en el teléfono con la clave pública de licencias de
  Play Console (Monetize › Monetization setup › «Licensing»). Hoy la app confía en lo que
  devuelve la Billing Library del propio Play Store; añadir la verificación cuando exista la
  clave (va en la rama `release`, no es secreta).
