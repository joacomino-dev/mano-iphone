"""Recolour the user's new CocoWash icon to the brand palette and the Coqui/Memo
model art, and make it a full-bleed opaque 1024 square (iOS applies its mask)."""
import sys
import numpy as np
from PIL import Image
from collections import deque

src, out = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float64)
H, W, _ = im.shape
hexc = lambda h: np.array([int(h[i:i+2], 16) for i in (1, 3, 5)], float)

# 1. Outer white margin (rounded corners baked in): edge-connected near-white.
white = (im.min(axis=2) > 236)
outside = np.zeros((H, W), bool)
q = deque((y, x) for y in range(H) for x in (0, W - 1) if white[y, x])
q.extend((y, x) for x in range(W) for y in (0, H - 1) if white[y, x])
for y, x in q: outside[y, x] = True
while q:
    y, x = q.popleft()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ny, nx = y + dy, x + dx
        if 0 <= ny < H and 0 <= nx < W and white[ny, nx] and not outside[ny, nx]:
            outside[ny, nx] = True; q.append((ny, nx))

# 2. Soft palette transfer: each pixel moves by a blend of (target - source)
#    deltas weighted by its closeness to each source colour, so anti-aliased
#    edges between two regions blend both corrections.
pairs = [
    ('#01B4B5', '#1E7470'),  # background cyan -> brand turquoise
    ('#111520', '#2A1C14'),  # blue-black ink -> model/UI ink
    ('#020305', '#21150F'),  # deepest black (lenses, shadows) -> warm ink
    ('#BF692A', '#A56028'),  # coconut -> model coconut
    ('#8E4A1F', '#7C4520'),  # coconut shade
    ('#FD8A8B', '#FE9A8A'),  # brain -> model brain
    ('#FDD347', '#FFE27E'),  # sponge -> model's paler yellow
    ('#E0902A', '#D9A24A'),  # sponge pores
    ('#621126', '#6A1A22'),  # mouth
    ('#FFFFFF', '#FFFFFF'),  # whites stay
    ('#F6E9DC', '#F6E9DC'),  # foam shadow stays
]
S = np.stack([hexc(s) for s, _ in pairs]); T = np.stack([hexc(t) for _, t in pairs])
flat = im.reshape(-1, 3)
d2 = ((flat[:, None, :] - S[None, :, :]) ** 2).sum(-1)
w = np.exp(-d2 / (2 * 38.0 ** 2)); w_sum = w.sum(1, keepdims=True)
gate = np.clip(w_sum, 0, 1)            # far from every key colour: leave it
w = w / np.maximum(w_sum, 1e-9)
shift = (w @ (T - S)) * gate
new = np.clip(flat + shift, 0, 255).reshape(H, W, 3)
# Background as a matte, not a tint: pixels on the cyan->ink and cyan->white
# segments (the only neighbours of the background in the drawing) become the
# exact mix of the new colours, so no cyan fringe survives and the fill is flat.
def segment(c0, c1, tol):
    c0, c1 = hexc(c0), hexc(c1); v = c1 - c0
    t = np.clip(((flat - c0) @ v) / (v @ v), 0, 1)
    dist = np.linalg.norm(flat - (c0 + t[:, None] * v), axis=1)
    return t, dist < tol
bg_new = hexc('#1E7470')
for far, far_new in (('#111520', '#2A1C14'), ('#FFFFFF', '#FFFFFF')):
    t, on = segment('#01B4B5', far, 34)
    on &= t < .93                      # pure ink / white keep the transfer above
    mixed = (1 - t[:, None]) * bg_new + t[:, None] * hexc(far_new)
    nf = new.reshape(-1, 3); nf[on] = mixed[on]
new[outside] = hexc('#1E7470')
# The baked rounded edge leaves an antialiased rim (white + cyan). Nothing is
# drawn there, so the whole band just inside the margin becomes background.
from PIL import ImageFilter
inside = Image.fromarray((~outside * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(25))
rim = (~outside) & (np.asarray(inside) == 0)
new[rim] = hexc('#1E7470')

# 3. Full bleed: crop to the drawn square (where the margin ends) and fill.
rows = np.where(~outside.all(axis=1))[0]; cols = np.where(~outside.all(axis=0))[0]
y0, y1, x0, x1 = rows[0], rows[-1], cols[0], cols[-1]
inset = int(0.012 * (x1 - x0))        # stay inside the antialiased rim
crop = new[y0 + inset:y1 - inset, x0 + inset:x1 - inset]
img = Image.fromarray(crop.astype(np.uint8)).resize((1024, 1024), Image.LANCZOS)
# Any remaining light rim pixels at the corners: paint them brand turquoise.
a = np.asarray(img).astype(np.int32)
corner = np.zeros(a.shape[:2], bool); r = 140
yy, xx = np.mgrid[0:1024, 0:1024]
for cy, cx in ((0, 0), (0, 1023), (1023, 0), (1023, 1023)):
    corner |= (np.abs(yy - cy) < r) & (np.abs(xx - cx) < r)
light = corner & (a.min(axis=2) > 150)
a[light] = hexc('#1E7470').astype(np.int32)
# The characters have no teal: any teal-hued pixel brighter than the new
# background is leftover fringe from the old cyan, so it becomes background.
bg = hexc('#1E7470').astype(np.int32)
teal = (a[..., 1] - a[..., 0] > 40) & (a[..., 2] - a[..., 0] > 40)
brighter = a.sum(axis=2) > bg.sum()
a[teal & brighter] = bg
Image.fromarray(a.astype(np.uint8), 'RGB').save(out, optimize=True)
print('crop', (x0, y0, x1, y1), 'saved', out)
