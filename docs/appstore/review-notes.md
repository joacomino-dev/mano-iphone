# Notes for App Review (draft, English)

CocoWash helps people tidy their Photos library by swiping through their photos one by one.

- **No account, no sign-in, no server.** Everything is analyzed on device; no photo is
  uploaded.
- **Photos access** is requested on the last onboarding card. With limited access, the app
  works on the selected photos and offers «Choose more photos».
- **Deletion is never immediate.** Swiping left only marks a photo. Deletion happens from
  «One last look» → «Delete N», which calls `PHAssetChangeRequest.deleteAssets`, so iOS
  shows its own confirmation. Favorites can never be marked for deletion.
- **Ads:** Google AdMob native ads, labelled «Ad» on a letter-style card: one in the
  photo pile every 20–30 photos (dismissed by swiping, like any card), one fixed in
  «One last look» and one on the summary after deleting. Consent (UMP) and ATT are asked
  before the first ad request; the app works fully if tracking is denied.
- **In-app purchases** (Settings › Support): «A year without ads» (non-renewing
  subscription, one year from purchase), «No ads, forever» (non-consumable) and «Buy me a
  coffee» (consumable tip that unlocks nothing, as stated in the app). «Restore purchases»
  is on the same screen.
- **«Open Photos»** on the summary opens the Photos app so the person can empty Recently
  Deleted themselves; CocoWash cannot and does not empty it.

To see everything quickly: allow Photos access, swipe left on a few photos, tap «Finish»,
review them in «One last look», tap «Delete N» and confirm in the system prompt.
