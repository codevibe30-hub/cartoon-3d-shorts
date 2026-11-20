"""Compose the two storyboard sheets from out/storyboard/scene-*.png: each cell is the scene
still (with its real bottom one-line subtitle) plus a label bar: scene number + content +
the narration excerpt. Output: storyboard-1.png (scenes 1-5), storyboard-2.png (scenes 6-10).

Scene labels + sheet titles live in scripts/storyboard_labels.json:
  {"sheet_titles": ["...", "..."], "labels": [["scene content", "narration excerpt"], ...]}
Override the file with STORYBOARD_LABELS=/path/to.json. Ships with the example episode's labels.
"""
import glob, json, os, textwrap
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SB = os.path.join(ROOT, "out", "storyboard")

_cfg = json.load(open(os.environ.get(
    "STORYBOARD_LABELS",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "storyboard_labels.json"))))
LABELS = [tuple(x) for x in _cfg["labels"]]
SHEET_TITLES = _cfg.get("sheet_titles", ["STORYBOARD 1/2", "STORYBOARD 2/2"])

CELL_W = 540
IMG_H = 960
LABEL_H = 196
TITLE_H = 92
BG = (24, 20, 30)
BAR = (38, 32, 48)
WHITE = (245, 242, 238)
GOLD = (255, 203, 71)
GREY = (196, 190, 205)


def font(sz, bold=True):
    for p in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]:
        if os.path.exists(p):
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()


def wrap_px(text, fnt, max_w):
    """Wrap by measured pixel width so no line ever overflows its cell
    (the old char-count wrap overflowed ~600px into the 516px cell and the
    neighbour still painted over the tail of every long line)."""
    lines, cur = [], ""
    for word in text.split():
        trial = (cur + " " + word).strip()
        if fnt.getlength(trial) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def sheet(idxs, title, out_name):
    cols, rows = 2, 3
    W = cols * CELL_W + 24
    H = TITLE_H + rows * (IMG_H + LABEL_H) + 16
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.text((18, 28), title, font=font(30), fill=GOLD)
    files = sorted(glob.glob(os.path.join(SB, "scene-*.png")))
    for k, i in enumerate(idxs):
        r, c = divmod(k, cols)
        x = 8 + c * (CELL_W + 8)
        y = TITLE_H + r * (IMG_H + LABEL_H)
        still = Image.open(files[i]).resize((CELL_W, IMG_H))
        img.paste(still, (x, y))
        d.rectangle([x, y + IMG_H, x + CELL_W, y + IMG_H + LABEL_H], fill=BAR)
        isi, nar = LABELS[i]
        d.text((x + 12, y + IMG_H + 8), f"ADEGAN {i + 1}", font=font(30), fill=GOLD)
        ty = y + IMG_H + 46
        for ln in textwrap.wrap(isi, width=40)[:2]:
            d.text((x + 12, ty), ln, font=font(23, bold=False), fill=WHITE)
            ty += 30
        for ln in textwrap.wrap("Narasi: " + nar, width=44)[:2]:
            d.text((x + 12, ty), ln, font=font(21, bold=False), fill=GREY)
            ty += 26
    out = os.path.join(ROOT, out_name)
    img.save(out)
    print(out, img.size)


sheet(range(0, 5), SHEET_TITLES[0], "storyboard-1.png")
sheet(range(5, 10), SHEET_TITLES[1], "storyboard-2.png")
