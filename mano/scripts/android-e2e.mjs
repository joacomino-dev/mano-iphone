// CI only: end-to-end check of the Android plugins on the disposable emulator,
// through the debug WebView's DevTools socket. The library is synthetic (emulator
// screenshots and a 3 s screen recording made by android-emulator.sh): no personal
// photo exists there. System dialogs (favourite, trash) are answered with adb.
// Writes build/android-startup/e2e.json and exits 1 with annotations on failure.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';

const run = promisify(execFile);
const OUT = 'build/android-startup';
const PKG = 'work.joaquin.mano';
const adb = (...args) => run('adb', args, { timeout: 30_000 }).then(r => r.stdout.trim());
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = {};
const failures = [];
const check = (name, ok, detail) => { results[name] = { ok: !!ok, detail }; if (!ok) failures.push(`${name}: ${JSON.stringify(detail)}`); };

async function devtools() {
  const pid = (await adb('shell', 'pidof', PKG)).split(/\s+/)[0];
  if (!pid) throw new Error('app not running');
  await adb('forward', 'tcp:9222', `localabstract:webview_devtools_remote_${pid}`);
  for (let i = 0; i < 20; i++) {
    try {
      const pages = await (await fetch('http://127.0.0.1:9222/json')).json();
      const page = pages.find(p => p.url?.startsWith('https://localhost'));
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* not ready */ }
    await sleep(1000);
  }
  throw new Error('no DevTools page');
}

let socket, next = 1;
const pending = new Map();
async function connect() {
  socket = new WebSocket(await devtools());
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    const waiter = pending.get(message.id);
    if (waiter) { pending.delete(message.id); waiter(message); }
  };
}
/** Evaluates an async JS expression in the app page; returns its JSON value. */
async function page(expression, timeout = 30_000) {
  const id = next++;
  const answer = new Promise((resolve, reject) => {
    pending.set(id, resolve);
    setTimeout(() => { if (pending.delete(id)) reject(new Error(`timeout: ${expression.slice(0, 60)}`)); }, timeout);
  });
  socket.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression: `(async () => { ${expression} })()`, awaitPromise: true, returnByValue: true } }));
  const message = await answer;
  if (message.result?.exceptionDetails) return { error: message.result.exceptionDetails.exception?.description ?? message.result.exceptionDetails.text };
  return message.result?.result?.value;
}
const call = (plugin, method, args = {}) => page(`try { return { value: await Capacitor.Plugins.${plugin}.${method}(${JSON.stringify(args)}) }; } catch (e) { return { code: e.code ?? null, message: e.message ?? String(e) }; }`, 60_000);

/** Saves what the screen shows (screenshot + UI hierarchy) for the evidence. */
async function capture(name) {
  try {
    await adb("shell", "screencap", "-p", "/sdcard/e2e.png");
    await run("adb", ["pull", "/sdcard/e2e.png", `${OUT}/${name}.png`], { timeout: 30_000 });
    await adb("shell", "uiautomator", "dump", "/sdcard/window.xml");
    fs.writeFileSync(`${OUT}/${name}.xml`, await adb("shell", "cat", "/sdcard/window.xml"));
  } catch { /* evidence only */ }
}
/** Taps the button of a system dialog whose text matches (via the UI hierarchy). */
async function tap(label, name) {
  for (let i = 0; i < 12; i++) {
    await sleep(1000);
    try {
      await adb("shell", "uiautomator", "dump", "/sdcard/window.xml");
      const xml = await adb("shell", "cat", "/sdcard/window.xml");
      const node = [...xml.matchAll(/<node [^>]*>/g)].map(m => m[0]).find(n => label.test(/text="([^"]*)"/.exec(n)?.[1] ?? "") && /clickable="true"/.test(n));
      const bounds = node && /bounds="[(d+),(d+)][(d+),(d+)]"/.exec(node);
      if (bounds) {
        if (name) await capture(name);
        const [x1, y1, x2, y2] = bounds.slice(1).map(Number);
        await adb("shell", "input", "tap", String((x1 + x2) >> 1), String((y1 + y2) >> 1));
        return true;
      }
    } catch { /* retry */ }
  }
  if (name) await capture(name + "-not-found");
  return false;
}
const back = async (delay = 3000) => { await sleep(delay); await adb("shell", "input", "keyevent", "4"); };
const ALLOW = /^(Allow|ALLOW|Permitir|PERMITIR)$/;
const DENY = /^(Deny|DENY|Cancel|CANCEL|Don.t allow|Denegar|Cancelar)$/;
/** One step: a failure or a timeout is recorded and the next step still runs. */
async function step(name, body) {
  try { await body(); } catch (error) { failures.push(`${name}: ${error.message}`); await capture(`${name.replace(/W+/g, "-")}-error`); }
}

try {
  await connect();
  const status = await call('PhotoLibrary', 'permissionStatus');
  check('permission', status?.value?.status === 'authorized', status);

  const library = await call('PhotoLibrary', 'assets');
  const assets = library?.value?.assets ?? [];
  const photos = assets.filter(a => a.kind === 'photo');
  const video = assets.find(a => a.kind === 'video');
  check('library', photos.length >= 3 && !!video, { count: assets.length, photos: photos.length, video: !!video });
  check('screenshot flag', assets.some(a => a.screenshot), assets.map(a => a.screenshot));
  check('video duration', (video?.duration ?? 0) > 0, video?.duration);

  const [a, b, c] = photos.filter(p => !p.screenshot).concat(photos.filter(p => p.screenshot));
  const thumb = await page(`const t = await Capacitor.Plugins.PhotoLibrary.thumbnail({ id: ${JSON.stringify(a.id)}, size: 400, requestId: 'e2e-thumb' });
    const r = await fetch(Capacitor.convertFileSrc(t.path)); const blob = await r.blob(); return { status: r.status, type: blob.type, bytes: blob.size, cloud: t.cloud };`);
  check('thumbnail', thumb?.status === 200 && thumb.bytes > 1000 && /jpeg/.test(thumb.type), thumb);

  const sizes = await call('PhotoLibrary', 'sizes', { ids: [a.id, video.id] });
  check('sizes', sizes?.value?.sizes?.[a.id] > 0 && sizes.value.sizes[video.id] > 0, sizes);

  const meta = await call('PhotoLibrary', 'metadata', { id: a.id, includeExif: true });
  check('metadata', meta?.value?.kind === 'photo' && meta.value.width > 0 && ['available', 'absent'].includes(meta.value.exifStatus), meta);

  const stream = await page(`const v = await Capacitor.Plugins.PhotoLibrary.prepareVideo({ id: ${JSON.stringify(video.id)}, requestId: 'e2e-video' });
    const r = await fetch(v.url, { headers: { Range: 'bytes=0-99' } }); const body = await r.arrayBuffer();
    return { url: v.url, status: r.status, bytes: body.byteLength, range: r.headers.get('content-range'), mime: v.mimeType };`);
  check('video range', stream?.status === 206 && stream.bytes === 100 && /^bytes 0-99\//.test(stream.range ?? ''), stream);

  const place = await call('PhotoLibrary', 'place', { id: a.id });
  check('place (no location → empty)', place?.value && !place.value.locality, place);

  // Favourite: Android's own dialog when it shows one (some system images apply it directly).
  await step("favorite", async () => {
    const favorite = call("PhotoLibrary", "favorite", { ids: [a.id], value: true });
    const allowed = await tap(ALLOW, "favorite-dialog");
    const result = await favorite;
    const meta = await call("PhotoLibrary", "metadata", { id: a.id });
    check("favorite", !result?.code && meta?.value?.isFavorite === true, { dialog: allowed, result, isFavorite: meta?.value?.isFavorite });
  });

  // A favourite is never deleted (checked again at the last moment).
  await step("favourite protected", async () => {
    const result = await call("PhotoLibrary", "deleteAssets", { ids: [a.id] });
    check("favourite protected", /favoritos/.test(result?.message ?? ""), result);
  });

  // Trash: cancelled in Android's dialog → CANCELLED, item still there.
  await step("trash cancelled", async () => {
    const pending = call("PhotoLibrary", "deleteAssets", { ids: [b.id] });
    const denied = await tap(DENY, "trash-dialog-cancel");
    if (!denied) await back(0);
    const result = await pending;
    const still = (await call("PhotoLibrary", "assets"))?.value?.assets?.some(x => x.id === b.id);
    check("trash cancelled", result?.code === "CANCELLED" && still, { denied, result, still });
  });

  // Trash: confirmed → moved to Android's trash (synthetic emulator image).
  await step("trash confirmed", async () => {
    const pending = call("PhotoLibrary", "deleteAssets", { ids: [b.id] });
    const allowed = await tap(ALLOW, "trash-dialog-allow");
    const result = await pending;
    const gone = !(await call("PhotoLibrary", "assets"))?.value?.assets?.some(x => x.id === b.id);
    check("trash confirmed", allowed && result?.value?.deleted?.includes(b.id) && gone, { allowed, result, gone });
  });

  // Back closes what is open instead of leaving.
  await page(`window.__back = 0; await Capacitor.Plugins.PhotoLibrary.addListener('backButton', () => window.__back++); await Capacitor.Plugins.PhotoLibrary.backHandling({ active: true }); return true;`);
  await back(500);
  await sleep(1000);
  const backs = await page(`await Capacitor.Plugins.PhotoLibrary.backHandling({ active: false }); return window.__back;`);
  const alive = !!(await adb('shell', 'pidof', PKG));
  check('back button', backs === 1 && alive, { backs, alive });

  // Ads: consent, Google's test native ad, the paper letter on screen.
  const money = await call('CocoMonetization', 'status');
  check('purchases status', money?.value && money.value.adFree === false, money);
  const prepared = await call('CocoMonetization', 'prepare');
  results['ad prepare'] = { ok: true, detail: prepared };
  if (prepared?.value?.ready) {
    const shown = await call('CocoMonetization', 'show', { x: 16, y: 120, width: 360, height: 560, deck: true, style: 'deck', hidden: false, labels: {} });
    await sleep(2500);
    await adb('shell', 'screencap', '-p', '/sdcard/ad.png').catch(() => {});
    await run('adb', ['pull', '/sdcard/ad.png', `${OUT}/ad-letter.png`], { timeout: 30_000 }).catch(() => {});
    check('ad letter shown', shown?.value?.shown === true, shown);
    await call('CocoMonetization', 'hide');
  } else {
    // A hosted emulator may get no ad fill; not a failure of the app.
    console.log('::warning title=Android E2E::no test ad was served:', JSON.stringify(prepared));
  }
} catch (error) {
  failures.push(`e2e aborted: ${error.message}`);
}
fs.mkdirSync(OUT, { recursive: true });
try { fs.writeFileSync(`${OUT}/e2e-logcat.txt`, (await run("adb", ["logcat", "-d"], { timeout: 30_000, maxBuffer: 64 << 20 })).stdout); } catch { /* evidence only */ }
fs.writeFileSync(`${OUT}/e2e.json`, JSON.stringify({ results, failures }, null, 2));
for (const failure of failures) console.log(`::error title=Android E2E::${failure.slice(0, 900)}`);
console.log(failures.length ? `ANDROID_E2E_FAILED ${failures.length}` : `ANDROID_E2E_OK ${Object.keys(results).length} checks`);
socket?.close();
process.exit(failures.length ? 1 : 0);
