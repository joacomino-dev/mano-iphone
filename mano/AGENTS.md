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
- Welcome requests Photos on first appearance,15 random miniature sample/5–6 falling at once; reduced motion static. Create native album from selection.
