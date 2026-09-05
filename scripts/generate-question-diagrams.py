"""Render three original technical diagrams from geometry, not course images.

Requires Pillow. Run from any directory. Optional MCQ_DIAGRAM_FONT_DIR may point
to Arial.ttf / Arial Bold.ttf; otherwise use system Arial or DejaVu Sans.
No source teaching material is read by this script.
"""
from itertools import product
from pathlib import Path
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1] / "public/question-assets"
NAVY, BLUE, ORANGE, GRAY = "#10213b", "#245fea", "#c56508", "#64748b"


def font(size, bold=False):
    directory = os.environ.get("MCQ_DIAGRAM_FONT_DIR")
    names = [
        str(Path(directory) / ("Arial Bold.ttf" if bold else "Arial.ttf")) if directory else "",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf",
    ]
    for name in names:
        if not name:
            continue
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    raise RuntimeError("Install Arial or DejaVu Sans, or set MCQ_DIAGRAM_FONT_DIR")


def canvas(title, subtitle):
    im = Image.new("RGB", (1600, 900), "white")
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((30, 30, 1570, 870), 24, fill="#f8fafc", outline="#cbd5e1", width=2)
    d.text((75, 70), title, font=font(46, True), fill=NAVY)
    d.text((78, 140), subtitle, font=font(25), fill=GRAY)
    return im, d


def arrow(d, start, end):
    d.line((start, end), fill=NAVY, width=4)
    x, y = end
    if start[1] == y:
        d.polygon([(x, y), (x-15, y-8), (x-15, y+8)], fill=NAVY)
    else:
        d.polygon([(x, y), (x-8, y+15), (x+8, y+15)], fill=NAVY)


def save(im, relative):
    target = ROOT / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    im.save(target, optimize=True)


def fcc():
    im, d = canvas("Face-centred cubic unit cell", "Oblique projection: identify the shared sites before counting atoms")
    def p(i, j, k):
        return (260+450*i+170*j, 740-130*j-360*k)
    sites = list(product((0, 1), repeat=3))
    for site in sites:
        for axis in range(3):
            if site[axis] == 0:
                other = list(site)
                other[axis] = 1
                d.line((p(*site), p(*other)), fill="#94a3b8", width=5)
    corners = [p(*s) for s in sites]
    faces = [p(0, .5, .5), p(1, .5, .5), p(.5, 0, .5),
             p(.5, 1, .5), p(.5, .5, 0), p(.5, .5, 1)]
    # Distinct visible centres, including the back sites: no accidental occlusion.
    centres = corners + faces
    assert len(set(centres)) == 14
    assert min((x-u)**2+(y-v)**2 for i, (x, y) in enumerate(centres)
               for u, v in centres[i+1:]) > 52**2
    for points, color in ((corners, BLUE), (faces, ORANGE)):
        for x, y in points:
            d.ellipse((x-23, y-23, x+23, y+23), fill=color, outline="white", width=3)
    for y, color, label in ((345, BLUE, "Corner site"), (425, ORANGE, "Face-centre site")):
        d.ellipse((1070, y, 1110, y+40), fill=color)
        d.text((1140, y+2), label, fill=NAVY, font=font(27))
    d.text((1065, 545), "Sites are shared with", fill=GRAY, font=font(26))
    d.text((1065, 582), "neighbouring cells.", fill=GRAY, font=font(26))
    save(im, "ee3431c/ee3431c-crystal-structures/fcc-unit-cell.png")


def convolution():
    im, d = canvas("Discrete-time convolution: input sequences", "Compute the output from these inputs. Both sequences are zero elsewhere.")
    for x0, values, label, color in ((120, [1, 2, 1], "x[n]", BLUE), (910, [1, -1], "h[n]", ORANGE)):
        d.rounded_rectangle((x0, 240, x0+540, 765), 18, fill="white", outline="#cbd5e1", width=2)
        d.text((x0+35, 267), label, fill=NAVY, font=font(35, True))
        base = 560
        arrow(d, (x0+40, base), (x0+495, base))
        d.text((x0+497, base+15), "n", font=font(23), fill=NAVY)
        for i, value in enumerate(values):
            x, y = x0+110+i*150, base-value*90
            d.line((x, base, x, y), fill=color, width=6)
            d.ellipse((x-11, y-11, x+11, y+11), fill=color)
            d.text((x-8, base+25), str(i), font=font(24), fill=GRAY)
            d.text((x-12, y-42 if value >= 0 else y+18), str(value), font=font(28, True), fill=NAVY)
    d.text((755, 465), "*", font=font(64, True), fill=NAVY)
    save(im, "ee3731c/ee3731c-lti-convolution/discrete-convolution.png")


def tiling():
    im, d = canvas("Time-frequency resolution", "Schematic tiles: fixed STFT resolution versus wavelet multiresolution")
    for left, title, wavelet in ((150, "STFT: one window scale", False), (920, "Wavelet: multiple scales", True)):
        top, bottom, width = 325, 710, 490
        d.text((left-15, 235), title, font=font(30, True), fill=NAVY)
        bands = [(0.5, 8), (0.25, 4), (0.125, 2), (0.125, 2)] if wavelet else [(0.25, 4)]*4
        assert all(abs(height/columns-1/16) < 1e-12 for height, columns in bands)
        y = top
        for height, columns in bands:
            end_y = y+(bottom-top)*height
            for col in range(columns):
                d.rectangle((left+width*col/columns, y, left+width*(col+1)/columns, end_y),
                            fill="#ffedd5" if wavelet else "#dbeafe",
                            outline=ORANGE if wavelet else BLUE, width=3)
            y = end_y
        arrow(d, (left-15, bottom+15), (left+width+30, bottom+15))
        arrow(d, (left-15, bottom+15), (left-15, top-35))
        d.text((left+width-35, bottom+35), "Time", font=font(24), fill=NAVY)
        d.text((left+5, top-40), "Frequency", font=font(24), fill=NAVY)
        if wavelet:
            d.text((left+15, 780), "High f: short time / broad frequency", font=font(24), fill=GRAY)
            d.text((left+15, 815), "Low f: long time / narrow frequency", font=font(24), fill=GRAY)
    save(im, "ee3731c/ee3731c-filters-and-wavelets/time-frequency-tiling.png")


if __name__ == "__main__":
    fcc()
    convolution()
    tiling()
    print("Generated three original question diagrams.")
