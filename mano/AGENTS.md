# Mobile Prototype Agent Guide

## Current instruction scope — 30 October 2026

- Common rules/coordination: root `AGENTS.md` and `../docs/ai-collaboration/PROTOCOL.md`; consult shared state/relevant peer log before conflicting work.
- This guide includes historical product feedback and protected preview-runtime contracts. Product name is CocoWash. Current audit may question visual choices, including historically approved palette/mascot/layout, and propose alternatives; implementation needs user review. Decision status/evidence: `../docs/ai-handoff/UI_BASELINE.md`.
- First Claude mission is read-only audit/planning. No app edits, commits, branches, worktrees or installs. Creative freedom does not authorize changes to Photos operations, state, contracts or gestures.

## Mano product constraints

- Historical feedback (MemSwipe, before CocoWash): floating-photo welcome; one random session with automatic similar bundles; upright centered photo and stacked polaroids; center tap/next cycles, arrival cue and prominent finish. This records interaction history, not mandatory styling. All QA on native personal library must be non-destructive: no deletion confirmations; use demo for discard/recovery flows.

- Historically selected visual: second mock, teal archive / ivory paper / ink seals. Retain as baseline evidence; current instruction permits redesign proposals.
- All photos, videos and Live Photos are native PhotoKit assets. Never upload originals. Preview uses generated demonstration photos and separate local state.
- Swipe decisions must remain undoable; deletion is a separate session review and Photos confirmation.
- This app's photo fan owns explicit two-axis swipe, long press and card-selection gestures requested by the user. It is not a horizontal scrolling rail; preserve those gestures. Review grid uses Carousel with dragging disabled so vertical scrolling and hold-to-recover remain available.
- Build and domain checks: `npm test`, `npm run build`, `npm run build:native`, `npm run check:runtime`. Native build sources use a separate entry and do not modify the protected preview runtime.

## Prototype Instructions

In ChatGPT Work Mode, run `sites-preview start "$PWD"`, open `http://terminal.local:4173/` in the cloud browser, and verify the rendered app and its primary interactions. Keep that preview open and tell the user to inspect it in the cloud browser; do not present the local URL as a user-facing chat link. In Codex Desktop, run the local server yourself, open the preview in the in-app browser, and provide the clickable local URL. Do not deploy to Sites unless the user explicitly asks to share, publish, or deploy. Do not give the user server-start instructions when you can run it.

Before planning or implementing any mobile-app change, read this `AGENTS.md` in full. It is the source of truth for the template's runtime and component guidance.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Editing Boundary

- Shared app UI: `src/ManoApp.tsx`, `Filters.tsx`, `Inspector.tsx`, `InlineVideo.tsx` and `prototype.css`. `Prototype.tsx` is the preview wrapper. Follow `../docs/ai-handoff/UI_ARCHITECTURE.md` for protected sections of mixed files.
- Treat `src/App.tsx`, `src/main.tsx`, `src/styles.css`, `src/mobile/`, `public/assets/iphone/`, `public/assets/android/`, `public/assets/status/`, `vite.config.ts`, `worker/index.js`, and `scripts/prepare-sites-build.mjs` as protected runtime files. Do not edit, replace, remove, or recreate them unless the user explicitly asks to change the mobile runtime itself. For an explicit runtime change, update the affected lock hashes only after verifying the new runtime behavior.
- Run `npm run check:runtime` before preview or application handoff. If it fails, inspect the cause and preserve pre-existing work; do not auto-restore/reset or weaken/bypass the check. Documentation-only handoff does not require a new preview.
- `npm run build` preserves the mobile runtime and prepares the static Cloudflare Worker output required by Sites. Before a Sites handoff, confirm `dist/client/index.html`, `dist/server/index.js`, `dist/.openai/hosting.json`, and source `.openai/hosting.json` exist, then run `npm run test:sites`. Do not replace this project with a Vinext starter.

## Runtime Contract

- Preserve the mobile device runtime unless the user's task explicitly asks otherwise. Do not replace it with a standalone page. Visual fidelity applies to app-owned content inside the device screen, not to template-owned device chrome.
- Preserve preview `App -> MobileRuntime` and its internal `PhoneFrame -> KeyboardProvider`, with StatusBar/content/HomeIndicator/KeyboardDock inside the frame. Closed Android keyboard reserves navigation space; open keyboard includes IME strip and hides the separate navigation bar. iOS content owns safe-area padding behind the overlaid home indicator. Installed native entry mounts ManoApp directly, not MobileRuntime.
- Preserve the `iPhone` / `Pixel 10` device picker and both calibrated device presets. The Pixel screen is `427 x 952`; its `32 x 32` camera circle and `public/assets/android/navigation-bar.svg` bottom navigation bar are protected device chrome, not app content.
- Preserve preview device picker's top-right lightweight styling: borderless transparent wrapper, content-sized trigger, compact 3px inset and existing hairline/shadows. External preview shell remains white; this does not prescribe CocoWash content background.
- Preserve `StatusBar` as live device chrome, including its platform-specific typography, source status-icon assets, and spacing. Pixel 10 uses Roboto, Android indicators, and 32px top, left, and right padding. iPhone uses its iOS indicators, system typography, and calibrated spacing. Do not hardcode screenshot times like `9:41` into the status bar, replace its real-time clock, or move status bar content into app markup unless the user explicitly asks for a fixed/mock device time.
- `PhoneFrame` owns the calibrated device frame, screen portal, device picker, camera cutout, and custom cursor. Keep device assets in `public/assets/iphone/` and `public/assets/android/`; if an asset fails to load, repair the asset path or restore the asset instead of removing the frame, keyboard, or image render.
- Use `MobileScroll` directly for simple single-screen prototypes. Use `FlowStack` for conventional multi-screen flows whose routes can own their fixed header and footer; when using it, define each route as a `FlowScreen`: `{ id, header?, headerHeight?, footer?, footerHeight?, render }`, and use `flow.push(screen)`, `flow.pop()`, and `flow.replace(screen)` from `FlowStack` render callbacks or `useFlow()` instead of introducing another router.
- Use `Carousel` for a carousel, horizontal rail, swipeable cards, image or media strip, horizontally scrollable cards, chip rail, or other horizontal collection.
- For a layered app shell—such as a persistent composer, independently presented sheet, pushed/peek sidebar, or app-wide transition—compose directly in `Prototype.tsx` rather than forcing it through `FlowStack`. Keep app-owned fixed chrome as sibling layers outside `MobileScroll`.
- When using `FlowScreen`, put route-owned fixed headers or footers in `FlowScreen.header` or `FlowScreen.footer`. Set `headerHeight` to the visible app-toolbar height; `FlowStack` adds the device's top safe-area/status-bar inset automatically. Do not include `StatusBar` or its height in the header. Set `footerHeight` to the full app-footer height. `FlowScreen.footer` is an overlay, not reserved layout space; screens using it must add their own bottom content padding such as `padding-bottom: calc(var(--flow-footer-height) + var(--mobile-safe-area-height) + 24px)` so final content can scroll above the footer while still painting behind it.
- Render only scrollable content inside `MobileScroll`; it is for content that should move with scroll and rubber-band overscroll. Keep app-owned headers, nav bars, tabs, composers, and overlays outside it. This keeps scroll physics, safe areas, keyboard insets, scrollbars, and drag click suppression active without letting content paint under fixed chrome.
- Buttons, links, cards, and images inside `MobileScroll` should still allow drag scrolling when the pointer moves beyond tap slop. Use `data-scroll-drag="ignore"` only for rare controls that must own the drag gesture themselves.
- Do not add `var(--keyboard-height)` to ordinary screen/content padding inside `MobileScroll`; the scroll viewport already shrinks above the simulated keyboard. For custom fixed composers, search bars, or toast chrome, use `useKeyboardInsets().bottomInset`. It is relative to the app viewport: Android returns `0` while the closed-keyboard viewport already reserves navigation, then returns the keyboard height while open; iOS continues to clear the home indicator while closed and ride directly above the keyboard while open. Do not pin custom bottom chrome to `bottom: 0` or only `keyboardHeight`.
- Use `KeyboardInput`, `KeyboardTextarea`, or `MobileTextField` for every text-entry control. A raw `input` or `textarea` disconnects focus, keyboard animation, safe-area insets, and attached surfaces.
- Use `BottomSheet` for phone-scoped sheets. Its props are `open`, `onOpenChange`, `title`, optional `description`, optional `snap`, and `children`; it renders through the phone screen portal and dismisses the keyboard before opening.

## Horizontal Carousels

- Use `Carousel` for horizontally draggable cards, images, media, chips, or other horizontal collections. Do not recreate these with `overflow-x`, custom pointer handlers, or a generic div.
- `Carousel` can be nested directly inside `MobileScroll`. It owns horizontal gestures and automatically yields vertical gestures to the parent.
- Never put `data-scroll-drag="ignore"` on or around a `Carousel`; doing so prevents vertical parent scrolling when a gesture begins inside it.
- Do not add CSS scroll snapping to `Carousel`; its runtime owns momentum and release motion.
- Use `data-scroll-drag="ignore"` only when a control must prevent parent scrolling in every drag direction.

See `src/mobile/COMPONENTS.md` for the full component and gesture contract.

## Keyboard Rule

The simulated keyboard is a separate top-layer component. Before presenting anything that behaves like iOS navigation or modal UI, dismiss it first.

Call `keyboard.hide()` before:

- pushing, popping, or replacing FlowStack routes
- opening bottom sheets, action sheets, dialogs, menus, or navigation sheets
- starting transitions where the destination should not inherit text-input focus

`FlowStack` already hides the keyboard for `push`, `pop`, and `replace`. `BottomSheet` already hides it before opening. If you add new modal/sheet/navigation primitives, follow the same rule.

When a composer, search surface, or other keyboard-attached component closes, call `keyboard.hide()` in the same event before changing that component's open state. Position attached surfaces from `useKeyboardInsets()` rather than a separate timer or visibility flag so both dismiss together.

When any text-entry control loses focus, dismiss the simulated keyboard. If the control is custom or does not use the runtime's keyboard-aware fields, handle its blur event and call `keyboard.hide()` explicitly. Keep the keyboard open only when focus is moving directly to another text-entry control that should share the same keyboard session.

## Interaction Rules

- Do not trigger buttons or inputs after a pointer has become a drag. Preserve the drag suppression behavior in `MobileScroll`.
- Do not allow native browser image/file dragging inside the phone frame. Preserve the phone-level `dragstart` suppression and non-draggable image styles so scroll drags that begin on images still scroll the prototype.
- Use `KeyboardInput`, `KeyboardTextarea`, or `MobileTextField` for text entry so the simulated keyboard and safe-area insets stay connected.
- Fixed phone chrome should not animate with pushed screens. Screen content can animate; the status bar, camera cutout, and preview chrome should stay put.
- Keep the keyboard below the home indicator/safe area layer in z-index, and above ordinary app UI while visible.
- Keep the home indicator as the topmost safe-area layer in the z-index above everything else in the prototype.

- Latest physical feedback (29 October): Photos access and manual deletion confirmed working by user. Phone disconnected for continuing development. Prepare first10 actual upcoming assets before review; maintain rolling window, visible progress/cancel and bounded2 transfers. Video posters must display and videos should play inline inside their centered card with explicit fullscreen fallback. All downloaded originals stay in bounded app cache, never overwrite Photos. Native video/cache and cancellation must be tested in simulator with generated media.

## CocoWash historical approval — 29 October 2026

This records prior approval/implemented direction, not permanent visual restrictions.
Current user instruction permits creative proposals and reserves implementation for
review. Functional contracts remain protected.

- User greenlit full CocoWash plan on29October: petroleum #1D4042 / cream #F2E7D5 / terracotta #B44238, coconut washing smiling brain mascot; philosophy Lo que importa, se queda. This supersedes MemSwipe name but preserves bundle ID and old storage.
- Header Filters left, animated status/isotipo center, Finalizar sesión right. Larger aspect-correct centered polaroids, no letterbox/crop, no duplicate hints/session banner.
- Persist active session including seed/context/history10 and record atomically; Regresar restores exact media/bundle. Review order approved 30 October: discard summary -> discarded photos (recovery controls) -> Eliminar N -> Deshacer todo -> Continuar / Finalizar y guardar. Keep deletion/iCloud notes next to Eliminar N. This supersedes the former actions-first visual order; same callbacks, one Apple confirmation only, never deletion from swipe. Instruction only until implementation is authorized.
- Date presets24h/7d/30d/custom inclusive local days, friendly draft filters, optional local Geek metadata. Hold to smoothly inspect, drag to pin, pinch/pan when pinned, outside/close to release. Buttons provide alternatives to gestures.
- Superseded 30 October (CW-CL-013, user instruction): no landing/welcome page and no falling photos. First launch only: 4-card onboarding (what it is, gestures, essentials, privacy), no skip, Photos requested on the last card; denied → «Abrir Ajustes»; limited access handled. Session starts automatically. Create native album from selection.
- User decisions 30 October: no expand icon on cards (double tap/pinch, accessible focus-only button); long press isolates in place with minimal scale and one bottom anchor dock (progressive feedback, haptic); header shows the name CocoWash; photos keep Polaroid with place/date caption, videos use a VHS tape frame and pixel OSD (time/date/place/duration, adaptive); display settings live in Ajustes, separate from selection filters; counter reflects the filtered set; loaders branded and non-technical, real errors explicit.

## CocoWash 0.5 decisions — 31 October 2026 (user-approved, CW-CL-017)

Approved by the user after the CW-CL-017 proposal; they supersede the earlier
"read-only first mission" wording for this work only. Functional protections are
unchanged (deletion only from the review with the Photos confirmation and the
favourites recheck, demo-only destructive QA, protected preview runtime/28 hashes,
same bundle/keys/permissions).

- Colour semantics (one meaning per colour, WCAG AA measured): teal/turquoise =
  identity and Conservar (#1E7470 on paper); ivory = surfaces; coffee (coconut
  shell, #8A4B2D / #6E3B22) = structure, contrast and everything that used to be
  brand red; pink (brain, #EF9A98 on teal / #A3405A on paper) = accent and
  Favorita; graphite #4E5A68 = Descartar («a revisión», recoverable); red #B3261E
  only for «Eliminar N» in the review. No yellow (logo sponge is light turquoise
  #7CCBC2). Text and icons on teal are white.
- Decisions differ by colour, shape, icon and word: Conservar = round turquoise
  seal with check (kept photos show the level as a numeral I–VIII, one ink;
  Filters read «Sello I · vuelve en 7 días»); Descartar = dashed graphite ticket
  with a tray; Favorita = pink heart. Each decision stamps briefly over the stack
  without blocking the next gesture; Reduce Motion shows the same stamp without
  travel. No visible notice after decisions (VoiceOver announcement only).
- Spacing uses the 4-pt `--cw-space-*` scale through roles (`--cw-gutter`,
  `--cw-stack`, `--cw-section`, `--cw-icon-gap`, `--cw-card-side`, `--cw-caption`).
  Header: «Filtros» and «Terminar» same size (≥44 pt), name centred on screen.
  Polaroid caption: place always left, date always right; missing = empty slot.
- Tour: large paper card over the empty main screen; own postcard illustrations
  (no stock photo, no final character). «Continuar» waits one short gesture-demo
  cycle on first visit only; immediate with Reduce Motion. Names: «Anclar» /
  «Anclada» for the anchored view, «Ampliar» for zoom.
- Gestures: a tap advances in a group at once; double tap no longer opens the
  anchored view (pinch, hold-and-drag to the dock, or the focusable «Anclar»).
  No loupe, selection or callout menu outside text fields. Saving to an album
  keeps (undoable) and advances; failure keeps the card.
- Video: muted looping autoplay on the top card only; no timeline/controls while
  sorting (only in the anchored view, with sound and fullscreen); explicit chip
  if iOS refuses or with Reduce Motion. VHS overlay is letters only, fitted to
  the visible frame; the tape frame stays.
- «Terminar» ends the round: the summary leads to «Una última mirada (N)» when
  discards are pending; review closes back to it; pending discards carry over.
  Review: «Eliminar N» + one sentence + «Recuperar los N descartes».
- Preview quality profiles in Ajustes (Rápida / Equilibrada default / Alta
  calidad): card size from real width × screen scale, larger version on anchor
  swapped in place, bounded native preview cache. Previews only, never originals.
- Characters (user, 31 October 2026): Coqui (coconut, white sunglasses) and Memo
  (brain) must stay faithful to the model art in `brand/characters/`; use cut-outs
  from it (`public/assets/characters/*.webp`, `Characters.tsx`), never redrawn or
  recoloured versions. Placement: tour hero and privacy, access/preparing/error/
  end-of-round screens, empty pile, Coqui's face in every loader, app icon (hero
  on teal). Motion is gentle (bob, hop, sway) and stops with Reduce Motion. The
  old vector mascot is superseded.
- Colour comfort (user, 31 October 2026): every text pair passes WCAG AA; body
  and secondary text aim for AAA (7:1) and APCA Lc ≥ 75 (≥ 60 from 18 px bold).
  Text tiers on teal: white / #D6E3DD / #B3C9C2; on paper: #122D2E / #3B4E4B;
  pink text uses #F9C6C4 (brand pink #EF9A98 stays for icons and art). Surface
  balance per screen aims at the golden split ≈ 62 / 24 / 14 (dominant surface /
  secondary / accents): tour, sheets, review and end of round are paper-dominant
  cards on a teal frame; the session is a deliberate exception (the photo leads).

## App Store target — 31 October 2026 (user, durable)

CocoWash is built to ship on the App Store. Use public API only (guideline
2.5.1: no KVC on private properties, no private selectors), keep
`PrivacyInfo.xcprivacy` complete for every required-reason API (today:
UserDefaults CA92.1, file timestamps C617.1), `ITSAppUsesNonExemptEncryption`
false while only hashing is used, arm64 / iOS 17+. A feature that needs
non-public behaviour or is not reliable is removed or reduced to what public API
measures exactly, never estimated. The AltStore workflow is personal testing;
an App Store build needs the Apple Developer Program, signing and upload.

## CocoWash 0.6 decisions — 31 October 2026 (user request, CW-CL-020)

Requested by the user and implemented directly. Functional protections are
unchanged (deletion only from the review with the Photos confirmation and the
favourites recheck; demo-only destructive QA; protected preview runtime; same
bundle, keys and permissions; `cocowash-media://` and `native.html` CSP untouched).

- Order: chronological by default («Más antiguas»), also «Más recientes», «Más
  pesadas», «Más ligeras», «Al azar». Saved pre-0.6 filters with the old random
  default become chronological once (`Filter.v = 2` keeps a random picked later).
- Weight: size of the original file when it is on the iPhone, public API only
  (video: AVURLAsset file; photo: content editing input full-size file; nothing
  downloaded; cached in Caches/ManoSizes.json). iCloud-only originals have no
  weight; totals with unknowns read «al menos X». Shown in
  the VHS OSD under the duration (Ajustes › Vídeos › Peso, on by default), in
  «Eliminar N · X MB», in the end-of-round summary and in Modo Geek. Decimal units
  like iOS (1 GB = 10⁹ B), Spanish comma.
- iCloud: Ajustes › «Fotos en iCloud». Default «Ahorrar iCloud»: cards use what is
  already on the iPhone (a smaller local version gets the quiet chip «iCloud ·
  vista ligera»; none → «Descargar vista previa»); nothing downloads until the
  person anchors/zooms (a «Descargando de iCloud… N %» pill) or taps «Descargar y
  ver · X MB» on a video. «Descargar siempre» keeps the 0.5 behaviour.
- «Más tarde» (ask me later): fourth decision, swipe down or the footer button.
  Keeps marks, moves the item to the end of the pile (also out of its similar
  group), undoable, persisted in `RecordState.later`; its own clean-up shortcut.
  Stamp: coffee postmark with a clock (`--cw-stamp-later`, 6.6:1 on ivory).
- Clean-up shortcuts (Filtros › «Limpieza rápida», with live counts): Más tarde,
  Capturas (PhotoKit screenshot / screen-recording subtypes), Baja calidad and
  Texto y documentos (Vision on a 512 px local preview: text coverage/lines,
  faces, Laplacian sharpness, brightness, iOS 18 aesthetics score and utility;
  thresholds in `insights.ts`). Text with faces is kept last. Analysis runs in the
  background after weights, pauses during warm-up/similar search, never uploads.
- Filter sheet order: Limpieza rápida → Contenido → Fecha → Orden → Sellos.
- End of round: after «Eliminar N» the reward leads — «Liberaste X» with photos /
  videos sent to «Eliminado recientemente», the lifetime total, and the honest
  note that space returns fully when that album is emptied (30 days). Before
  deleting it says how much the pending discards would free.
- Version 0.6.0 (build 6).

## CocoWash 0.7 decisions — 31 October 2026 (user feedback after device test, CW-CL-021)

- One icon per decision, shared by button, stamp and tutorial (`DecisionIcon`):
  Conservar = round seal with check (turquoise); Eliminar = trash can on a dashed
  graphite ticket (was «Descartar / A DESCARTES»; it still only queues the item —
  deletion happens in the final review with Photos' confirmation, recoverable
  until then); Favorita = heart (pink); Más tarde = clock postmark with wavy lines
  and a white wavy band behind the word.
- Decision row, one line: Eliminar (←, word, trash) · pink heart-shaped Favorita
  button (the bold element; neighbours are cut in a curve around it) · Conservar
  (seal, word, →). The button on the side the card is dragged toward lights up.
  Bottom bar: Deshacer · Más tarde (centre, ivory with coffee clock) · Álbum, 52 pt.
- Video cards: sound and VHS-letters toggles (top right). VHS letters are smaller by
  default and sized in Ajustes (Pequeño / Mediano / Grande).
- Anchoring an iCloud «vista ligera» keeps the downloaded version on the card.
- «Descargar siempre»: cards already on the iPhone show first while iCloud ones
  download behind; a card shown that way stays until decided. While choosing
  filters, the first cards of the draft warm up.
- Similar groups: the clearly best shot (Vision rating) goes in front with «Mejor
  toma» (decided once per group); «Elegir las demás» selects the rest.
- Seals: explained in Ajustes › Sellos, can be hidden (switch, or tap a seal);
  smaller (62 pt) and stamped across the card's lower-right edge, off the caption.
- «Terminar» with items to delete opens «Una última mirada» directly; the
  celebration appears after «Eliminar» (or after closing the review).
- Version 0.7.0 (build 7).

## Decision bar and «Favoritas» — 1 November 2026 (user request, CW-CL-022)

- Decision bar = `DecisionBar.tsx`: Eliminar (graphite #4E5A68, trash) · heart
  (pink #EB4E69, protagonist, rises above and below) · Conservar (turquoise
  #1E7470, bookmark). Cartoon set like Coqui and Memo: solid colours, cream band
  #FCEFD9, ink contour #2A1C14, ink base the face sinks onto. No gradients,
  textures or blur. Side buttons are hollowed by the heart's exact offset
  silhouette (constant gap, never touching). Labels in Patua One (OFL, local
  woff2), only in this bar. Arrows only when the word keeps ≥ 16 px.
- Favourites still leave the general pile. Filtros › «Favoritas» shows only
  them: the heart is on (pressed) and takes the item out of Favorites (back to
  the pile, undoable); Eliminar is unavailable there; Conservar seals it.
  Native enumeration now lists favourites flagged; deletion still rechecks.

## CocoWash 0.8 — 1 November 2026 (user feedback after device test, CW-CL-023)

- Main screen speaks the decision bar's language (bar itself unchanged): every
  control is a sticker — cream border, ink ring and solid ink base (no blur),
  sinking onto the base when pressed. Neutral tools teal #26504F (Filtros,
  Terminar, Deshacer, Álbum, group segmented); «Más tarde» coffee (its
  postmark colour); Terminar's count is a graphite badge (Eliminar's colour).
- Wordmark «CocoWash»: Fredoka 600 (rounded, straight stems), white Coco /
  pink Wash, ink line, cream margin, ink contour and base (SVG, `Chrome.tsx`).
  Fredoka for main-screen chrome, Patua One only for decision verbs.
- Progress: sticker trough filling with sponge turquoise #7CCBC2, count on a tag.
- Cards centred at 50 % of a stage with equal air above (progress) and below
  (the heart).
- «Terminar» with items to delete opens «Una última mirada» over the session:
  closing it returns to the cards; the round ends with «Eliminar N»
  (supersedes the 0.7 rule «celebration after closing the review»).
- How seals work is explained in Filtros › Sellos; Ajustes keeps the switch.
- App icon: the user's art on the official turquoise #1E7470, model ink lines
  (brand/recolor-app-icon.py). The tour shows once after updating to 0.8.
- Version 0.8.0 (build 8).

## CocoWash 0.9 — Coco Cream refinement, 1 November 2026 (user request, CW-CL-024)

Supersedes the 0.8 rule «every main-screen control is a sticker».
- Palette Coco Cream (default): `--pal-*` primitives in prototype.css (bg
  #F6F4EC, surface #FFFDF7, text/contour #253A3A, turquoise #1E7470, graphite
  #4E5A68, heart #EF9A98, heart details #A3405A, coffee #8A4B2D as a small
  accent only). Coco Mint is prepared as `:root[data-palette="mint"]`; no
  public switch. Status bar text is dark (`.darkContent`).
- Hierarchy: level 1 decision bar keeps the sticker (contour, ivory band, base);
  level 2 Polaroid/VHS on one ivory paper with soft tinted shadows; level 3
  tools are quiet (ivory + one hairline, IBM Plex, no base, no text contour).
- Sorting header: Filtros · thin progress + count · Terminar (count shown as a
  graphite trash chip = items to delete). The wordmark is for brand moments
  (summary, tour), not the sorting screen. Selection mark only in groups.
- Version 0.9.0 (build 9).

## CocoWash 0.9.1 — header and Warm Paper, 1 November 2026 (user request, CW-CL-025)

Version line: 0.9.x until 1.0 (user). Supersedes the 0.9 single-row header.
- Style rule: characters and brand = most expressive; decision bar = refined
  cartoon (thick contour, band, base); header capsules = intermediate (one
  1.75 pt contour, slim 2 pt base, Fredoka); secondary tools = modern and flat;
  frame = warm, discreetly textured paper. Never all three treatments on one
  component; textures never on text, icons, photos, videos or quick-read controls.
- Header: Filtros · CocoWash wordmark (centred) · Terminar; second row: progress
  track + count capsule. Terminar's count is a badge over its top-right corner
  (does not change the button's width).
- Background Warm Paper #F4EFE6 + procedural grain/tone SVGs (~1–3 %).
  «Revisión guardada» / celebration may show the paper more.
- Version 0.9.1 (build 10).
- 0.9.2 (CW-CL-026, user): frame #F3ECE1 with a third, fine paper-fibre layer
  (paper-fibre.svg); more paper, still clean. Faint text #51625E. Version 0.9.2 (11).

## CocoWash 0.9.3 — speed, a stable pile, real iCloud progress, Cotton Fiber (2 November 2026, user request, CW-CL-027)

Requested by the user and implemented directly. Functional protections unchanged
(deletion only from the review with Photos' confirmation and the favourites
recheck; demo-only destructive QA; protected preview runtime; same bundle, keys,
permissions, `cocowash-media://` and CSP).
- The pile: one canonical sequence (`orderAssets` once per library/order/seed,
  `eligibleFrom` per decision, linear). The hand on screen is **locked**
  (`sequence.ts`): background work — similar groups, weights, a preview that
  finishes first, a library refresh — never swaps it; only a decision,
  «Siguiente», undo or a filter change replace it. Decisions record the hand in
  display order (+ its «Mejor toma»); undo restores exactly that. Undo of a
  postponed item puts it back in its exact place in `later`. No card is ever
  promoted ahead because its image is ready (0.7 «Descargar siempre» promotion
  removed: order never depends on download completion).
- Read-ahead: the hand + about six next cards. Cards read their own preload
  entry; the app does not re-render per preparation step. Local first: a card
  never waits on the network; downloads go through `cloudPreviews` (media.ts):
  one tracked job per item, at most two at a time, visible card / anchored view
  first, joined by «Anclar» (holding an iCloud photo starts the larger preview),
  cancelled when the item leaves the window or the session ends. Never originals.
- iCloud indicator: the existing chip, now with a ring of **real** PhotoKit
  progress (indeterminate until bytes arrive), retry once, «Reintentar» on error;
  the same indicator in the anchored view. No simulated percentages on device.
- Swipes write motion values (no app re-render per pointer move); saving the
  record/session is grouped (≤ 350 ms, flushed when hidden). Undoing a favourite
  no longer reloads the whole library. The similar-photo search is no longer
  cancelled and restarted at every warm-up.
- Temporary notices take the wordmark's place (same cell, header height and
  buttons fixed), two lines at most, by-length duration; routine results speak
  through the interface/VoiceOver only. Errors use their own persistent alert.
- Tour: one composition for every card (illustration + copy centred between
  progress and buttons). Card 2 demonstrates the four real swipes in list order
  (right Conservar, left Eliminar, up Favorita, down Más tarde), ~5 s round;
  «Continuar» waits for one round on first view only (aria-disabled, fills with
  the demo; Reduce Motion: same round without travel); not when replayed.
- Background material **Cotton Fiber** (user chose option B): fine light and
  dark cotton fibres, uniform, matte, σ ≈ 2.3 levels, mean = #F3ECE1. Parts:
  `--cw-paper-base`, `--cw-paper-texture` (neutral RGBA tile, no colour of its
  own, `public/assets/paper-cotton.webp` from `brand/cotton-fiber.py`),
  `--cw-paper-intensity`; tone comes from the base. Dark mode = new base and
  intensity, same tile. Frame only; Polaroid/tour/celebration surfaces keep
  their approved paper. Replaces paper-cream.webp.
- Native (CW-CL-028): Vision feature prints persist per item (identifier +
  edit date) in Caches/ManoPrints (signature + archived observation, no image
  data; pruned after a complete pass), so a stopped or rerun similar search only
  computes new/edited items. Preview JPEG encoding runs on a concurrent queue so
  the serial thumbnail queue keeps answering the card on screen. Thumbnail
  timeouts count inactivity (60 s without iCloud progress).
- Version 0.9.3 (build 12).
