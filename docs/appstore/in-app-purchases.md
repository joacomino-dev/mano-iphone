# Compras dentro de la app · App Store Connect

**RC:** mantener monetización confirmado por el propietario. IDs/tipos siguientes existen en fuente; configuración/precios/catálogos ASC y sandbox BLOCKED. La app oculta productos ausentes y ofrece reintento; no hay compra real validada. No confundir nombres de diseño con productos aprobados.

Tres productos. Los IDs tienen que ser **exactamente** estos: la app los busca por nombre
(`CocoMonetization.swift`). Los nombres coinciden con los que se ven en Ajustes › Apoyo.
Límites de Apple: nombre visible ≤ 30 caracteres, descripción ≤ 45 (comprobados).

| Producto | ID | Tipo en App Store Connect | Nombre de referencia |
|---|---|---|---|
| Un año sin anuncios | `work.joaquin.mano.noads.year` | Suscripción **no renovable** | No ads · 1 year |
| Sin anuncios para siempre | `work.joaquin.mano.noads.lifetime` | **No consumible** | No ads · lifetime |
| Invítame un café | `work.joaquin.mano.coffee` | **Consumible** | Coffee tip |

Precio: a tu elección. Para cada uno, Apple pide una captura para la revisión (Ajustes ›
Apoyo con los tres sellos) y una nota; las dos van al final.

## Textos por idioma

### Un año sin anuncios (`noads.year`)

| Idioma | Nombre visible | Descripción |
|---|---|---|
| es | Un año sin anuncios | Un año sin anuncios. No se renueva solo. |
| en | A year without ads | One year with no ads. Doesn't auto-renew. |
| fr | Un an sans pub | Un an sans pub. Sans renouvellement auto. |
| de | Ein Jahr ohne Werbung | Ein Jahr werbefrei. Verlängert sich nicht. |
| it | Un anno senza pubblicità | Un anno senza pubblicità. Non si rinnova. |
| ar | سنة بلا إعلانات | سنة كاملة بلا إعلانات. لا تتجدد تلقائيًا. |
| ja | 1年間広告なし | 1年間広告なし。自動更新はありません。 |

### Sin anuncios para siempre (`noads.lifetime`)

| Idioma | Nombre visible | Descripción |
|---|---|---|
| es | Sin anuncios para siempre | Sin anuncios para siempre. Pago único. |
| en | No ads, forever | No ads, ever. One-time payment. |
| fr | Sans pub, pour toujours | Plus jamais de pub. Paiement unique. |
| de | Für immer ohne Werbung | Nie wieder Werbung. Einmalzahlung. |
| it | Senza pubblicità per sempre | Mai più pubblicità. Pagamento unico. |
| ar | بلا إعلانات إلى الأبد | بلا إعلانات إلى الأبد. دفعة واحدة. |
| ja | ずっと広告なし | 広告を永久になし。買い切りです。 |

### Invítame un café (`coffee`)

| Idioma | Nombre visible | Descripción |
|---|---|---|
| es | Invítame un café | Una propina. No quita los anuncios. |
| en | Buy me a coffee | A tip. It doesn't remove ads. |
| fr | Offre-moi un café | Un pourboire. Ne retire pas la pub. |
| de | Spendier mir einen Kaffee | Ein Trinkgeld. Entfernt keine Werbung. |
| it | Offrimi un caffè | Una mancia. Non toglie la pubblicità. |
| ar | ادعُني إلى قهوة | إكرامية. لا تزيل الإعلانات. |
| ja | コーヒーをおごる | チップです。広告は消えません。 |

## Nota para la revisión (inglés, igual para los tres)

> Settings › Support shows the three products. «A year without ads» is a non-renewing
> subscription: ads stop for one year from purchase and it never renews by itself; the
> app computes the end date from the signed StoreKit transaction. «No ads, forever» is a
> one-time non-consumable. «Buy me a coffee» is a consumable tip that unlocks nothing, as
> the app says next to it. «Restore purchases» is on the same screen.

## Comprobaciones antes de enviar

- Los tres productos en estado «Listo para enviar» y añadidos a la versión 1.0.
- En sandbox: comprar cada uno, restaurar en otro dispositivo, el café dos veces, y el año
  con una cuenta de sandbox (Apple acelera la duración en sandbox solo para las
  renovables; la no renovable se comprueba por la fecha que muestra Apoyo).
