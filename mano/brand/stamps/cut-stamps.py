import sys
from collections import deque
import numpy as np
from PIL import Image
src, name, outdir = sys.argv[1], sys.argv[2], sys.argv[3]
im = Image.open(src).convert('RGB'); im = im.resize((im.width // 2, im.height // 2), Image.LANCZOS)
a = np.array(im).astype(np.float64); H, W = a.shape[:2]
mn = a.min(axis=2)
# columns with ink (anything clearly not background)
ink = (mn < 200).sum(axis=0) > 0
gap = None; run = 0
for x in range(W // 3, W):
    run = run + 1 if not ink[x] else 0
    if run == 3: gap = x - 2; break
end = gap
while end < W and not ink[end]: end += 1
print(name, 'split', gap, end)
# outside = whitish pixels connected to the border
white = mn >= 238
out = np.zeros((H, W), bool); q = deque()
for x in range(W):
    for y in (0, H - 1):
        if white[y, x] and not out[y, x]: out[y, x] = True; q.append((y, x))
for y in range(H):
    for x in (0, W - 1):
        if white[y, x] and not out[y, x]: out[y, x] = True; q.append((y, x))
while q:
    y, x = q.popleft()
    for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
        ny, nx = y + dy, x + dx
        if 0 <= ny < H and 0 <= nx < W and white[ny, nx] and not out[ny, nx]: out[ny, nx] = True; q.append((ny, nx))
for _ in range(2):  # reach the anti-aliased edge
    n = out.copy(); n[1:] |= out[:-1]; n[:-1] |= out[1:]; n[:, 1:] |= out[:, :-1]; n[:, :-1] |= out[:, 1:]; out = n
apply = out.copy(); apply[:, end:] = True   # the lettering: every white goes (counters too)
alpha = np.full((H, W), 255.0)
al = (255 - mn) / 255.0
al_c = np.clip(al, 0, 1)
rgb = a.copy()
m = apply
alpha[m] = al_c[m] * 255
with np.errstate(divide='ignore', invalid='ignore'):
    for c in range(3):
        ch = a[:, :, c]; v = (ch - 255 * (1 - al_c)) / np.where(al_c > 0, al_c, 1)
        rgb[:, :, c] = np.where(m & (al_c > 0), np.clip(v, 0, 255), ch)
rgba = np.dstack([rgb, alpha]).round().astype(np.uint8)
img = Image.fromarray(rgba, 'RGBA')
def crop(x0, x1, path, height):
    part = img.crop((x0, 0, x1, H)); bb = part.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    part = part.crop((max(0, bb[0] - 3), max(0, bb[1] - 3), min(part.width, bb[2] + 3), min(part.height, bb[3] + 3)))
    if part.height > height: part = part.resize((round(part.width * height / part.height), height), Image.LANCZOS)
    part.save(path, 'WEBP', quality=90, method=6); print(path, part.size)
# The icon: the one opaque piece around its centre (letters and waves are separate pieces).
solid = rgba[:, :, 3] > 20; seen = np.zeros((H, W), bool); sy, sx = H // 2, int(W * .22)
assert solid[sy, sx]; seen[sy, sx] = True; q = deque([(sy, sx)])
while q:
    y, x = q.popleft()
    for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
        ny, nx = y + dy, x + dx
        if 0 <= ny < H and 0 <= nx < W and solid[ny, nx] and not seen[ny, nx]: seen[ny, nx] = True; q.append((ny, nx))
grown = seen.copy()
for _ in range(2):
    n = grown.copy(); n[1:] |= grown[:-1]; n[:-1] |= grown[1:]; n[:, 1:] |= grown[:, :-1]; n[:, :-1] |= grown[:, 1:]; grown = n
icon = rgba.copy(); icon[~grown, 3] = 0
img_full = img; img = Image.fromarray(icon, 'RGBA')
crop(0, W, f'{outdir}/{name}.webp', 300)
img = img_full
crop(0, W, f'{outdir}/{name}-word.webp', 320)
