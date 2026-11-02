"""Cotton Fiber — CocoWash's paper material (0.9.3).

Generates public/assets/paper-cotton.webp: one seamless 512 pt tile at 2x
(1024 px) holding only the *pattern*: short, thin, slightly curved cotton
fibres, some lighter and some darker than whatever lies beneath, plus a very
fine grain. The tile has no colour of its own (white and black at low alpha),
so the material is composed in CSS from separate parts:

  colour base  --cw-paper-base       (Coco Cream: the frame colour #F3ECE1)
  pattern      --cw-paper-texture    (this tile)
  intensity    --cw-paper-intensity  (opacity of the pattern layer)
  tone         neutral fibres take the hue of the base they sit on

A dark mode keeps the same tile and changes base and intensity only.
Deliberately absent (the reference option B, not A or C): no blotches or
clouds, no low-frequency mottling, no stone or wall look, no wear.

Deterministic: same seed, same file. Run from mano/:
    python3 brand/cotton-fiber.py            # writes public/assets/paper-cotton.webp
    python3 brand/cotton-fiber.py --preview  # also writes a composite preview PNG
"""
import math
import random
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SIZE = 1024            # tile, px (512 pt at 2x)
SS = 3                 # supersampling for anti-aliased hairlines
SEED = 20261102
FIBRES = 2600          # per tile
LENGTH = (10, 34)      # px at 2x (5–17 pt): short cotton strands
WIDTH = (0.7, 1.35)    # px at 2x
DARK_SHARE = .42       # cotton paper reads mostly as lighter strands
ALPHA_DARK = (.04, .11)
ALPHA_LIGHT = (.14, .36)
SOFTEN = .75           # px blur at 2x: wispy strands, not scratches
SPECKS = 9000          # tiny 1–2 px flecks of pulp: matte tooth, compresses well
SPECK_ALPHA = (.04, .12)
TARGET = (0xF3, 0xEC, 0xE1)  # Coco Cream frame colour the material must average to
INTENSITY = .75        # default --cw-paper-intensity


def fibre_path(rng):
    """A short, gently curving strand: a few segments with a drifting angle."""
    x, y = rng.uniform(0, SIZE), rng.uniform(0, SIZE)
    angle = rng.uniform(0, math.tau)
    length = rng.uniform(*LENGTH)
    steps = max(3, int(length / 5))
    bend = rng.gauss(0, .16)
    points = [(x, y)]
    for _ in range(steps):
        angle += bend + rng.gauss(0, .08)
        x += math.cos(angle) * length / steps
        y += math.sin(angle) * length / steps
        points.append((x, y))
    return points


def draw_layer(rng, count, alpha_range):
    """Alpha map of `count` fibres, drawn supersampled and wrapped at the edges."""
    big = Image.new('L', (SIZE * SS, SIZE * SS), 0)
    pen = ImageDraw.Draw(big)
    for _ in range(count):
        points = fibre_path(rng)
        width = max(1, round(rng.uniform(*WIDTH) * SS))
        value = round(rng.uniform(*alpha_range) * 255)
        for dx in (-SIZE, 0, SIZE):          # seamless: draw the wrapped copies too
            for dy in (-SIZE, 0, SIZE):
                shifted = [((px + dx) * SS, (py + dy) * SS) for px, py in points]
                xs = [p[0] for p in shifted]; ys = [p[1] for p in shifted]
                if max(xs) < 0 or min(xs) > SIZE * SS or max(ys) < 0 or min(ys) > SIZE * SS:
                    continue
                pen.line(shifted, fill=value, width=width, joint='curve')
    small = big.resize((SIZE, SIZE), Image.LANCZOS)
    # Blur with wrap-around so the softened tile still has no seam.
    padded = Image.new('L', (SIZE * 3, SIZE * 3))
    for i in range(3):
        for j in range(3): padded.paste(small, (i * SIZE, j * SIZE))
    soft = padded.filter(ImageFilter.GaussianBlur(SOFTEN)).crop((SIZE, SIZE, SIZE * 2, SIZE * 2))
    # Blurring spreads alpha thinner: restore the peak strength.
    return np.clip(np.asarray(soft, dtype=np.float32) / 255 * 1.6, 0, 1)


def main():
    rng = random.Random(SEED)
    dark = draw_layer(rng, int(FIBRES * DARK_SHARE), ALPHA_DARK)
    light = draw_layer(rng, FIBRES - int(FIBRES * DARK_SHARE), ALPHA_LIGHT)
    # Sparse flecks of pulp instead of per-pixel grain: same matte tooth, and the
    # tile stays small (per-pixel noise does not compress: 1.3 MB vs ~0.1 MB).
    flecks = np.random.default_rng(SEED)
    for layer, share in ((dark, .6), (light, .4)):
        n = int(SPECKS * share)
        ys, xs = flecks.integers(0, SIZE, n), flecks.integers(0, SIZE, n)
        layer[ys, xs] = np.maximum(layer[ys, xs], flecks.uniform(*SPECK_ALPHA, n).astype(np.float32))
    # One RGBA layer: white where light fibres are, black where dark ones are.
    alpha = 1 - (1 - dark) * (1 - light)
    white = np.where(alpha > 0, light / np.maximum(alpha, 1e-6), 0)
    rgb = np.clip(white * 255, 0, 255)
    tile = np.dstack([rgb, rgb, rgb, alpha * 255]).round().astype(np.uint8)
    out = Image.fromarray(tile, 'RGBA')
    out.save('public/assets/paper-cotton.webp', 'WEBP', quality=75, alpha_quality=55, method=6)
    # The neutral fibres pull each channel by a slightly different amount; the
    # base under them is nudged so the material averages to TARGET exactly.
    saved = np.asarray(Image.open('public/assets/paper-cotton.webp').convert('RGBA'), dtype=np.float64) / 255
    a = saved[..., 3] * INTENSITY
    lift = (saved[..., :3] * a[..., None]).reshape(-1, 3).mean(0)
    keep = 1 - a.mean()
    base = [round(min(255, max(0, (t / 255 - l) / keep * 255))) for t, l in zip(TARGET, lift)]
    print('--cw-paper-base: #%02X%02X%02X;  /* averages to #%02X%02X%02X at intensity %s */' % (*base, *TARGET, INTENSITY))
    if '--preview' in sys.argv:
        under = Image.new('RGBA', out.size, '#%02X%02X%02X' % tuple(base))
        layer = out.copy(); layer.putalpha(Image.fromarray((np.asarray(out)[..., 3] * INTENSITY).astype(np.uint8)))
        Image.alpha_composite(under, layer).convert('RGB').save('paper-cotton-preview.png')


if __name__ == '__main__':
    main()
