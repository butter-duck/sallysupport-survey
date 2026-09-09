#!/usr/bin/env python3
"""Generate public/og-image.png (1200x630).

The companion generate-og-image.js is the canonical description of this card
and renders it through a real browser. It needs Node and Playwright, neither of
which exists on the machine this repo is maintained from, so this script draws
the same layout with Pillow instead. It is what produced the committed PNG.

Keep the two in step: if the design changes, change both.
"""
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1200, 630
BLUE, NAVY, TEAL = "#4A90C4", "#1A2B4A", "#1E8A7B"
BODY, WHITE = "#5A6170", "#FFFFFF"

F = "/System/Library/Fonts/Supplemental/"
font_bold   = lambda s: ImageFont.truetype(F + "Arial Bold.ttf", s)
font_italic = lambda s: ImageFont.truetype(F + "Arial Italic.ttf", s)
font_reg    = lambda s: ImageFont.truetype(F + "Arial.ttf", s)

root = os.path.join(os.path.dirname(__file__), "..")
img = Image.new("RGB", (W, H), WHITE)
d = ImageDraw.Draw(img)

# Left accent bar
d.rectangle([0, 0, 13, H], fill=BLUE)

LEFT, TOP = 90, 64

# Logo, scaled to 240px wide
logo = Image.open(os.path.join(root, "src/assets/sallysupport-logo.png")).convert("RGBA")
lw = 240
lh = round(logo.height * lw / logo.width)
img.paste(logo.resize((lw, lh), Image.LANCZOS), (LEFT, TOP), logo.resize((lw, lh), Image.LANCZOS))
y = TOP + lh + 56

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

# Eyebrow
f = font_bold(20)
tracked(d, (LEFT, y), "LIVE INDUSTRY BENCHMARK", f, BLUE, 3)
y += 24 + 18

# Title
f = font_bold(64)
for line in wrap("The Admin Roadmap Report", f, 760):
    d.text((LEFT, y), line, font=f, fill=NAVY)
    y += 67
y += 22

# Byline
f = font_italic(26)
d.text((LEFT, y), "A report for home care agencies by SallySupport", font=f, fill=TEAL)
y += 31 + 14

# Body line
f = font_reg(21)
for line in wrap("How home care agencies hire, staff, and grow their office teams.", f, 600):
    d.text((LEFT, y), line, font=f, fill=BODY)
    y += 32

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
print(f"Saved public/og-image.png ({img.width}x{img.height})")
