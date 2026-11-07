# Fuentes y trazabilidad

RC consultada7noviembre2026: [SDK mínimo26](https://developer.apple.com/news/upcoming-requirements/?id=04282026a),
[Guidelines](https://developer.apple.com/app-store/review/guidelines/),
[TN3182](https://developer.apple.com/documentation/technotes/tn3182-adding-privacy-tracking-keys-to-your-privacy-manifest),
[manifest](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files),
[Google13.12.0](https://developers.google.com/admob/ios/privacy/data-disclosure),
[SDK Apple](https://developer.apple.com/support/third-party-SDK-requirements/),
[DSA](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/),
[campos](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/),
[capturas](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/),
[runners](https://github.com/actions/runner-images), [costes CI](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
y [Xcode Cloud](https://developer.apple.com/xcode-cloud/get-started/).
Binarios fijados: [checksums/manifiestos](evidence/rc-sdk-summary.json).
URLs propias: [GET público actual](evidence/rc-public-web.json). Consulta no implica
aceptación Apple ni ejecución de esta RC. [Conclusiones](RELEASE_CANDIDATE.md).

Consultadas el 2026-11-07. Fuentes primarias; sus requisitos pueden cambiar:
reconsultar al producir el archivo de envío. Los enlaces a fuentes no prueban que
una herramienta esté instalada ni que una cuenta esté configurada.

| Fuente | Uso en esta auditoría |
| --- | --- |
| [Capacitor 8 / iOS](https://capacitorjs.com/docs/ios) | Mínimo de plataforma iOS 15; Xcode 26+; WKWebView |
| [Xcode / SDK y requisitos](https://developer.apple.com/xcode/system-requirements) | Toolchains y separación SDK/deployment; no inventario de esta máquina |
| [Requisitos de envío vigentes](https://developer.apple.com/news/upcoming-requirements/) | Umbral de SDK/Xcode actual |
| [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) | Integridad, metadatos, API pública, compras y privacidad |
| [App Privacy](https://developer.apple.com/app-store/app-privacy-details/) | Responsabilidad sobre datos y SDKs externos |
| [Required-reason APIs](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api) | Referencia para informe de archivo; la página dinámica no se usó para acreditar cobertura del binario |
| [Preparación Duo](https://developer.apple.com/iphone-duo/) | Punto de entrada oficial y herramientas |
| [Prepare your app for iPhone Duo](https://developer.apple.com/videos/play/tech-talks/111461/) | SDK 27.1, Device Hub, App Resizability, safe areas y tamaños |
| [Strike a pose](https://developer.apple.com/videos/play/tech-talks/111463/) | Regiones reservadas y adaptación a poses |
| [Especificaciones Duo](https://www.apple.com/iphone-duo/specs/) | Modelo/displays confirmados; resolución física no usada como tamaño de ventana medido |
| [Especificaciones 18 Pro/Max](https://www.apple.com/iphone-18-pro/specs/) | Cohorte reciente oficialmente identificada |
| [Compatibilidad iOS 26](https://support.apple.com/en-ie/guide/iphone/-iphe3fa5df43/ios) | Lista de modelos del sistema |
| [Compatibilidad iOS 27](https://www.apple.com/os/ios/) | Lista de modelos actuales |
| [Apps iOS en Mac / ASC](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/manage-availability-of-iphone-and-ipad-apps-on-macs-with-apple-silicon/) | Disponibilidad separada del target Catalyst |
| [Google Mobile Ads 13.12 Package.swift](https://raw.githubusercontent.com/googleads/swift-package-manager-google-mobile-ads/13.12.0/Package.swift) | Plataforma mínima 13 y rango transitivo UMP |
| [Google UMP 3.1 Package.swift](https://raw.githubusercontent.com/googleads/swift-package-manager-google-user-messaging-platform/3.1.0/Package.swift) | Plataforma mínima 12 |
| [Google / divulgación de datos](https://developers.google.com/admob/ios/privacy/data-disclosure) | Contrastar diagnósticos/identificadores/tráfico y manifests |

## Fuentes propias verificadas

Manifiestos npm/lock/instalación, `capacitor.config.ts`, `Info.plist`,
`PrivacyInfo.xcprivacy`, localizaciones nativas, `project.pbxproj`, Package.swift,
scripts de sync y CI; `ManoApp`, `domain`, `session`, `sequence`, `media`, `requests`,
`review`, `video-plan`, indexador y Swift PhotoLibrary/Monetization/DevelopmentSafety.
Las decisiones de producto se contrastaron con AGENTS y bitácoras recientes;
PROJECT_MAP/UI_ARCHITECTURE conservan información histórica y no sustituyen código.

[CI desarrollo](https://github.com/joacomino-dev/mano-iphone/actions/runs/42385089470)
y [CI release](https://github.com/joacomino-dev/mano-iphone/actions/runs/42385092530)
se consultaron por API y se leyeron sus logs; resumen sanitizado en
[evidencia](evidence/ci-base.json). No se inició ni se sondeó un nuevo run.

Las páginas de [privacidad en inglés](https://joaquinmino.work/cocowash/privacy.html),
[español](https://joaquinmino.work/cocowash/privacidad.html) y
[soporte](https://joaquinmino.work/cocowash/) devolvieron HEAD HTTPS 200.
El recibo de disponibilidad no certifica exactitud de los textos o cumplimiento jurídico.

## Fase 2

Se reconsultaron los requisitos de envío, Guidelines, Capacitor8, preparación Duo
y lista iOS27; se añadió [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/)
para el procedimiento. No se consultó una cuenta ASC ni se crearon certificados.
La validez de firma, builds disponibles y permisos administrativos no se infiere
de documentación pública. Fuentes/ejecuciones en [PHASE2](PHASE2.md).
