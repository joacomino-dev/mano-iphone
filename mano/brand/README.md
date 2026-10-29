# CocoWash brand sources

The character keeps the supplied reference's central action: a sly, relaxed
coconut washes its happy pink brain. The sponge touches the brain's upper lobe;
foam is confined to the rim. No raster tracing, embedded images, filters or
remote resources are used in the SVG masters.

## Assets

- `public/assets/cocowash.svg`: complete character, semantic path groups, 512².
- `public/assets/cocowash-compact.svg`: optical simplification, 256². No legs,
  shell hatching or brain hands; faces and sponge receive more visual weight.
- `public/assets/cocowash-icon.svg`: compact character on the full square brand
  background, 1024², without an extra rounded mask.
- `public/assets/cocowash-mono.svg`: one dark ink on ivory knockout variant.
  Use on ivory; do not recolor it as a flat silhouette.
- `public/assets/cocowash-wordmark.svg`: separate editable text wordmark, local
  Arial/sans-serif fallback. It is intentionally absent from the small icon.
- `public/assets/app-icon.png`: opaque 1024² RGB native icon. The same PNG is
  copied to the existing iOS asset-catalog filename.
- `brand/palette.json`: exact principal brand tokens and limited complements.

## Rebuilding

`generate-assets.mjs` is the editable construction source. It only writes the
listed brand assets, the iOS icon PNG, palette and brand proof exports. It does
not alter app UI, bundle identifiers or user data. Set `COCO_OUTPUT_DIR` to the
desired proof-export folder, and `COCO_SHARP_MODULE` to a locally available
`sharp` module if the package is not installed in the project.

Use a full illustration at larger welcome sizes; use the compact variant in
the header. At 32 px the two faces and cleaning gesture remain recognizable,
but small sponge pores and shell marks are intentionally not a fidelity goal.
The supplied proof sheet includes real 32/48/64 px renders, a 32 px enlarged
view, grayscale and both principal backgrounds. Physical iPhone inspection is
still needed to judge actual home-screen perception.

The illustration is a logo, not a functional control. Controls still need
separate accessible names and contrast checks. Do not apply the brand palette
or any logo rendering filter to the user's photographs.
