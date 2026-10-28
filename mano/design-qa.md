# Mano visual QA

final result: passed

Scope: implemented browser preview of the selected design. This result does not certify native PhotoKit execution or physical-device behavior.

## Evidence and state

- Source visual truth: `docs/design-reference.png` (latest ideation, second displayed result).
- Source pixels: 853 × 1844. Normalized to 393 × 852 for comparison.
- Implementation: `docs/qa/main.png`, 393 × 852 pixels, deviceScaleFactor 1.
- Browser viewport: 1200 × 1100. The measured device-screen element is exactly 393 × 852 CSS px at scale 1.
- State: Similares, five cards, two selected; front card conserved twice, red level-II seal. This state was reached through the actual controls rather than injected application state.
- Full-view comparison: `docs/qa/comparison.png`, source and implementation in a single combined input.
- Focused controls comparison: `docs/qa/controls.png`, same normalized density, both action rows and footer visible together.
- The protected runtime's status bar, Dynamic Island, rounded screen crop and home indicator are expected differences. They are not part of the app visual target, and the installed build uses a separate native entry without simulated hardware.

## Comparison history

1. Initial comparison (`docs/qa/comparison-before.png`, `docs/qa/main-before.png`): P2 — front card too wide/short; rear cards extended into the selection caption. P2 — selected checks on rear cards were behind the front card.
2. Fix: narrowed the fan's front print, restored photo height, moved rear-card origins upward and selection controls to exposed top-right corners. Captured again at the same viewport and state.
3. Final combined comparison: no actionable P0/P1/P2 findings. All persistent controls fit, the photo remains the hero, and both selected-card checks and rank seal are legible. A frame-focus scrolling issue discovered during filter testing was corrected in the app preview wrapper; no protected runtime files were modified.

## Required fidelity surfaces

- Typography: bundled IBM Plex Sans for readable controls, IBM Plex Mono for archival labels/ranks. No network font dependency. Small decorative captions remain close to the selected mock; action text is readable at full CSS scale.
- Spacing/layout: header, three-part review mode, slim progress, photographic fan, selection caption, twin decision buttons and symmetric footer match the selected hierarchy. Vertical photo space adapts around real safe areas.
- Colors/tokens: deep petrol, warm ivory paper, vermilion discard/ink and muted mint selected states. Texture is an actual generated paper raster, kept subtle.
- Image/assets: independently generated natural alpine-lake photograph, actual paper texture, transparent ink-stamp asset and opaque app icon. Rank is variable UI over the stamp. Phosphor supplies consistent icons; no improvised SVG/icon stand-ins. The seal never changes the source photo.
- Copy/content: Spanish control labels match the selected screen. A visible DEMO label replaces the fictional count in browser mode. Real totals are used only on-device.

## Interaction verification

- Multi-select two cards; center/Enter cycles front card to back.
- Conserving hides the asset until due; including waiting assets makes it inspectable again; conserving again advances to red level II.
- Discarding adds to review rather than deleting. The review queue survived a browser reload. Recovering removed one discard while preserving another.
- Media filtering selected a video and exposed its playback control. Order/seal options and manual waiting override are present.
- Domain checks: eight passing tests for queue safety, full undo, schedule, rank cap/JSON persistence, priority, explicit seal filter, grouping and deterministic random order.
- TypeScript and protected-runtime check passed.
- Native video/Live Photo playback, iCloud fetch, favorite/album changes, hold gestures on touch hardware, native system deletion dialogs and Vision accuracy still require physical iPhone verification.

## Follow-up polish (P3)

- The generated sample image is intentionally similar rather than a pixel-identical copy of the concept photograph; actual use displays the user's own assets.
- Rear-card selection targets are larger than the mock for touch access. Texture and bevels are lighter for performance and clarity.

## Implementation checklist

- [x] Compare exact selected design and implemented screen together.
- [x] Fix photo proportions, card/check overlap and preview-frame scrolling.
- [x] Preserve mobile runtime and independent native build entry.
- [x] Separate real photo operations from browser demonstration.
- [ ] Compile Swift on macOS and verify a signed personal installation on the physical iPhone.
