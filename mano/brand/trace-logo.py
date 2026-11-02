"""Trace a flat-colour logo PNG into an SVG, one <path> per colour (potrace).

Used for brand/cocowash-logo.svg (from cocowash-logo-source.png) and
brand/zangano-isotipo.svg (from zangano-isotipo-source.png), 2 Nov 2026.
Measured against the source: IoU 0.989 / 0.983 (CocoWash brown / pink) and
0.998 (Zángano); outside the 1 px anti-aliasing band the shapes match exactly.
Needs `potracer` (pure-Python potrace, pip) — a build tool, not an app dependency.

    python3 brand/trace-logo.py cocowash brand/cocowash-logo.svg
    python3 brand/trace-logo.py zangano  brand/zangano-isotipo.svg
"""
import sys
import numpy as np
import potrace
from PIL import Image

def classify(rgb, palette):
    d = np.stack([((rgb - np.array(c, float)) ** 2).sum(-1) for c in palette], -1)
    return d.argmin(-1)

def layer_paths(mask, scale):
    bm = potrace.Bitmap(~mask)  # potracer fills pixels below its black level
    plist = bm.trace(turdsize=6, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY, alphamax=1.0, opticurve=True, opttolerance=0.2)
    f = lambda p: f'{p.x / scale:.2f} {p.y / scale:.2f}'
    out = []
    for curve in plist:
        d = [f'M{f(curve.start_point)}']
        for seg in curve:
            d.append(f'L{f(seg.c)} {f(seg.end_point)}' if seg.is_corner else f'C{f(seg.c1)} {f(seg.c2)} {f(seg.end_point)}')
        d.append('Z')
        out.append(''.join(d))
    return ''.join(out)

def median_colour(rgb, labels, k):
    sel = rgb[labels == k]
    return tuple(int(v) for v in np.median(sel, 0))

def run(src, palette, names, out, scale=2, pad=0.03):
    im = Image.open(src).convert('RGB')
    big = im.resize((im.width * scale, im.height * scale), Image.LANCZOS)
    rgb = np.asarray(big, float)
    labels = classify(rgb, palette)
    # exact fills: median of the confidently classified pixels at native size
    small = classify(np.asarray(im, float), palette)
    fills = [median_colour(np.asarray(im, float), small, k) for k in range(len(palette))]
    layers = []
    ys, xs = np.nonzero(labels != 0)
    x0, x1, y0, y1 = xs.min() / scale, xs.max() / scale, ys.min() / scale, ys.max() / scale
    m = max(x1 - x0, y1 - y0) * pad
    for k in range(1, len(palette)):
        layers.append((names[k - 1], fills[k], layer_paths(labels == k, scale)))
    vb = f'{x0 - m:.1f} {y0 - m:.1f} {x1 - x0 + 2 * m:.1f} {y1 - y0 + 2 * m:.1f}'
    body = ''.join(f'<path class="{n}" fill="#{c[0]:02X}{c[1]:02X}{c[2]:02X}" fill-rule="evenodd" d="{d}"/>' for n, c, d in layers)
    open(out, 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}">{body}</svg>\n')
    print(out, 'viewBox', vb, 'fills', ['#%02X%02X%02X' % c for c in fills], 'bytes', len(open(out).read()))

import os
here = os.path.dirname(os.path.abspath(__file__))
if sys.argv[1] == 'cocowash':
    run(os.path.join(here, 'cocowash-logo-source.png'), [(249, 247, 242), (142, 72, 30), (241, 116, 116)], ['coco', 'wash'], sys.argv[2])
else:
    run(os.path.join(here, 'zangano-isotipo-source.png'), [(250, 250, 250), (26, 26, 26)], ['isotipo'], sys.argv[2])
