#!/usr/bin/env python3
"""Generate public/og-image.png (1200x630).

Sizing, the short version: LinkedIn renders a feed card about 552px wide, so
everything in a 1200px canvas lands on screen at roughly 0.46x. Type below
~30px in the canvas arrives under 14px on screen and turns to mush.

Two things were tried and rejected:

  * A 2400x1260 canvas. It does NOT make text bigger on screen — the on-screen
    size is a function of the design proportions, not the pixel count — and
    LinkedIn downsamples anything over its 1200x627 target with a cheap filter.
    The card came back visibly worse than the 1x version. Stay at 1200x630.
  * Leaving the original type scale. The title survived at ~29px on screen, but
    the eyebrow and body line arrived at ~9px and were illegible.

So: canvas fixed at the documented size, supporting type sized up until it
clears ~14px on screen. The companion generate-og-image.js mirrors this and
renders it through a real browser; keep the two in step.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

W, H = 1200, 630
BLUE, NAVY, TEAL = "#4A90C4", "#1A2B4A", "#1E8A7B"
BODY, WHITE = "#5A6170", "#FFFFFF"
CARD_ON_SCREEN = 552  # LinkedIn feed card width, for the report below

F = "/System/Library/Fonts/Supplemental/"
font_bold   = lambda s: ImageFont.truetype(F + "Arial Bold.ttf", s)
font_italic = lambda s: ImageFont.truetype(F + "Arial Italic.ttf", s)
font_reg    = lambda s: ImageFont.truetype(F + "Arial.ttf", s)

root = os.path.join(os.path.dirname(__file__), "..")
img = Image.new("RGB", (W, H), WHITE)
d = ImageDraw.Draw(img)

d.rectangle([0, 0, 13, H], fill=BLUE)  # left accent bar
LEFT, TOP = 90, 64

# Logo. At 240px wide from 352px source art this is a downscale, which stays
# crisp on its own; the unsharp pass only runs if the art is ever smaller than
# the slot, which would mean upscaling.
logo = Image.open(os.path.join(root, "src/assets/sallysupport-logo.png")).convert("RGBA")
lw = 240
lh = round(logo.height * lw / logo.width)
scaled = logo.resize((lw, lh), Image.LANCZOS)
flat = Image.new("RGB", (lw, lh), WHITE)
flat.paste(scaled, (0, 0), scaled)
if lw > logo.width:
    flat = flat.filter(ImageFilter.UnsharpMask(radius=1.4, percent=110, threshold=2))
img.paste(flat, (LEFT, TOP))
y = TOP + lh + 52

def tracked(draw, xy, text, font, fill, tracking):
    """Pillow has no letter-spacing, so step glyph by glyph."""
    x, yy = xy
    for ch in text:
        draw.text((x, yy), ch, font=font, fill=fill)
        x += draw.textlength(ch, font=font) + tracking
    return x

def wrap(text, font, max_w):
    words, lines, cur = text.split(), [], ""
    for wd in words:
        trial = (cur + " " + wd).strip()
        if d.textlength(trial, font=font) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur); cur = wd
    if cur: lines.append(cur)
    return lines

sizes = {"eyebrow": 30, "title": 64, "byline": 32, "body": 30}

f = font_bold(sizes["eyebrow"])
tracked(d, (LEFT, y), "LIVE INDUSTRY BENCHMARK", f, BLUE, 4)
y += 36 + 16

f = font_bold(sizes["title"])
for line in wrap("The Admin Roadmap Report", f, 760):
    d.text((LEFT, y), line, font=f, fill=NAVY)
    y += 68
y += 18

f = font_italic(sizes["byline"])
d.text((LEFT, y), "A report for home care agencies by SallySupport", font=f, fill=TEAL)
y += 40 + 12

f = font_reg(sizes["body"])
for line in wrap("How home care agencies hire, staff, and grow their office teams.", f, 700):
    d.text((LEFT, y), line, font=f, fill=BODY)
    y += 42

# Bar motif, bottom-right
bars = [(44, BLUE), (66, BLUE), (52, BLUE), (104, NAVY), (74, BLUE)]
bw, gap = 30, 10
x = W - 80 - (len(bars) * bw + (len(bars) - 1) * gap)
base = H - 64
for h, col in bars:
    d.rectangle([x, base - h, x + bw, base], fill=col)
    x += bw + gap

out = os.path.join(root, "public/og-image.png")
img.save(out)
k = CARD_ON_SCREEN / W
print(f"Saved public/og-image.png ({img.width}x{img.height})")
print(f"lowest text baseline: y={y}px of {H}")
print(f"on-screen sizes at a {CARD_ON_SCREEN}px card:")
for name, size in sizes.items():
    print(f"  {name:<8}{size:>4}px -> {size * k:>5.1f}px")
