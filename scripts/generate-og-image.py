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

# The card is laid out in 1200x630 design units and rendered at SCALE times
# that. Link previews are displayed on high-DPI screens at roughly twice their
# CSS size, so a 1x asset gets resampled and text goes soft; 2x lands sharp.
# Every measurement below stays in design units and is multiplied on the way out.
SCALE = 2
W, H = 1200 * SCALE, 630 * SCALE
BLUE, NAVY, TEAL = "#4A90C4", "#1A2B4A", "#1E8A7B"
BODY, WHITE = "#5A6170", "#FFFFFF"

F = "/System/Library/Fonts/Supplemental/"
font_bold   = lambda s: ImageFont.truetype(F + "Arial Bold.ttf", s * SCALE)
font_italic = lambda s: ImageFont.truetype(F + "Arial Italic.ttf", s * SCALE)
font_reg    = lambda s: ImageFont.truetype(F + "Arial.ttf", s * SCALE)

def u(v):
    """design units -> output pixels"""
    return v * SCALE

root = os.path.join(os.path.dirname(__file__), "..")
img = Image.new("RGB", (W, H), WHITE)
d = ImageDraw.Draw(img)

# Left accent bar
d.rectangle([0, 0, u(14) - 1, H], fill=BLUE)

LEFT, TOP = u(90), u(64)

# Logo, scaled to 240px wide
logo = Image.open(os.path.join(root, "src/assets/sallysupport-logo.png")).convert("RGBA")
lw = u(240)
lh = round(logo.height * lw / logo.width)
img.paste(logo.resize((lw, lh), Image.LANCZOS), (LEFT, TOP), logo.resize((lw, lh), Image.LANCZOS))
y = TOP + lh + u(56)

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
tracked(d, (LEFT, y), "LIVE INDUSTRY BENCHMARK", f, BLUE, u(3))
y += u(24 + 18)

# Title
f = font_bold(64)
for line in wrap("The Admin Roadmap Report", f, u(760)):
    d.text((LEFT, y), line, font=f, fill=NAVY)
    y += u(67)
y += u(22)

# Byline
f = font_italic(26)
d.text((LEFT, y), "A report for home care agencies by SallySupport", font=f, fill=TEAL)
y += u(31 + 14)

# Body line
f = font_reg(21)
for line in wrap("How home care agencies hire, staff, and grow their office teams.", f, u(600)):
    d.text((LEFT, y), line, font=f, fill=BODY)
    y += u(32)

# Bar motif, bottom-right
bars = [(44, BLUE), (66, BLUE), (52, BLUE), (104, NAVY), (74, BLUE)]
bw, gap = u(30), u(10)
x = W - u(80) - (len(bars) * bw + (len(bars) - 1) * gap)
base = H - u(64)
for h, col in bars:
    d.rectangle([x, base - u(h), x + bw, base], fill=col)
    x += bw + gap

out = os.path.join(root, "public/og-image.png")
img.save(out)
print(f"Saved public/og-image.png ({img.width}x{img.height})")
