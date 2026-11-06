"""Turns a painting into a one-color halftone layer for a DTG back print.

Light parts of the painting become ink, so on a dark tee the ink color reads as light, like a
screen-printed photo. The result is a transparent PNG at print resolution (300 DPI), with the edges
fading into the shirt instead of a hard rectangle.

Usage (from the repo root):
  python3 scripts/printful/halftone.py SRC OUT --crop L,T,R,B --width 3400 [--ink ECE8DF]
      [--lpi 34] [--gamma 0.85] [--contrast 1.35] [--fade 0.18]
"""
import argparse
import numpy as np
from PIL import Image, ImageFilter, ImageOps


def main():
    p = argparse.ArgumentParser()
    p.add_argument("src"); p.add_argument("out")
    p.add_argument("--crop", required=True, help="L,T,R,B in source pixels")
    p.add_argument("--width", type=int, default=3400, help="output width in px (300 DPI)")
    p.add_argument("--ink", default="ECE8DF")
    p.add_argument("--lpi", type=float, default=34)
    p.add_argument("--angle", type=float, default=45)
    p.add_argument("--gamma", type=float, default=0.85)
    p.add_argument("--contrast", type=float, default=1.35)
    p.add_argument("--fade", type=float, default=0.18, help="edge fade as a share of each side")
    p.add_argument("--drop-sky", action="store_true", help="knock out pale blue sky so the figure stands on the shirt color")
    p.add_argument("--protect", action="append", default=[], help="cx,cy,rx,ry in source pixels: an ellipse (a face) the sky knock-out must not touch")
    a = p.parse_args()

    box = tuple(int(v) for v in a.crop.split(","))
    rgb = Image.open(a.src).convert("RGB").crop(box)
    h = round(a.width * rgb.height / rgb.width)
    rgb = rgb.resize((a.width, h), Image.LANCZOS).filter(ImageFilter.GaussianBlur(2))
    c = np.asarray(rgb, dtype=np.float32) / 255.0
    g = np.asarray(ImageOps.grayscale(rgb), dtype=np.float32) / 255.0
    sky = None
    if a.drop_sky:
        # Sky: bluer than it is red, and fairly light. Softened so the edge is not a hard cut-out.
        s = np.clip(((c[..., 2] - c[..., 0]) + 0.06) / 0.10, 0, 1) * np.clip((g - 0.55) / 0.12, 0, 1)
        # Pale haze and halo glow: very light and nearly colorless. Skin and robes carry color, so they stay.
        mx, mn = c.max(axis=2), c.min(axis=2)
        sat = (mx - mn) / np.maximum(mx, 1e-3)
        haze = np.clip((0.16 - sat) / 0.06, 0, 1) * np.clip((g - 0.70) / 0.08, 0, 1)
        s = np.maximum(s, haze)
        if a.protect:
            k = a.width / (box[2] - box[0])
            yy0, xx0 = np.mgrid[0:h, 0:a.width].astype(np.float32)
            for e in a.protect:
                cx, cy, rx, ry = (float(v) for v in e.split(","))
                d = ((xx0 - (cx - box[0]) * k) / (rx * k)) ** 2 + ((yy0 - (cy - box[1]) * k) / (ry * k)) ** 2
                s *= np.clip(d - 0.6, 0, 1)  # zero inside, ramping back to full at the ellipse edge
        sky = np.asarray(Image.fromarray((s * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(10)), np.float32) / 255

    # Tone: stretch to the full range, add contrast around the middle, then gamma.
    lo, hi = np.percentile(g, 2), np.percentile(g, 98)
    g = np.clip((g - lo) / max(hi - lo, 1e-3), 0, 1)
    g = np.clip((g - 0.5) * a.contrast + 0.5, 0, 1) ** a.gamma
    if sky is not None:
        g *= 1 - sky

    # Fade every edge to nothing, so the picture melts into the shirt.
    yy, xx = np.mgrid[0:h, 0:a.width].astype(np.float32)
    fx = np.minimum(xx, a.width - 1 - xx) / (a.width * a.fade)
    fy = np.minimum(yy, h - 1 - yy) / (h * a.fade)
    g *= np.clip(np.minimum(fx, fy), 0, 1) ** 1.5

    # Rotated AM halftone: one round dot per cell, its area equal to the tone at the cell center.
    cell = 300.0 / a.lpi
    t = np.deg2rad(a.angle)
    u = (xx * np.cos(t) + yy * np.sin(t)) / cell
    v = (-xx * np.sin(t) + yy * np.cos(t)) / cell
    cu, cv = np.floor(u) + 0.5, np.floor(v) + 0.5
    cx = (cu * np.cos(t) - cv * np.sin(t)) * cell
    cy = (cu * np.sin(t) + cv * np.cos(t)) * cell
    tone = g[np.clip(cy, 0, h - 1).astype(int), np.clip(cx, 0, a.width - 1).astype(int)]
    dist = np.hypot(u - cu, v - cv)
    radius = np.sqrt(tone / np.pi)  # dot area = tone (in cell units)
    # Dots under ~0.08 of a cell would print as dust that DTG drops; leave them out.
    ink = ((dist < radius) & (tone > 0.02)).astype(np.uint8) * 255

    r, gg, b = (int(a.ink[i:i + 2], 16) for i in (0, 2, 4))
    rgba = np.zeros((h, a.width, 4), np.uint8)
    rgba[..., 0], rgba[..., 1], rgba[..., 2], rgba[..., 3] = r, gg, b, ink
    Image.fromarray(rgba, "RGBA").save(a.out)
    print(a.out, a.width, "x", h, f"({a.width / 300:.1f} x {h / 300:.1f} in)")


if __name__ == "__main__":
    main()
