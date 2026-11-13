"""Prepare local workbench cut-outs with Pillow (already available on this machine).

Run from website/: python3 scripts/prepare-bench.py
Source photographs are cached outside the repository. No package installation required.
"""
from pathlib import Path
from urllib.request import Request, urlopen
from collections import deque
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path('/tmp/opencode/bench-assets')
OUT = ROOT / 'public/img/bench'
CACHE.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)


def source(name, url):
    path = CACHE / (name + '.source')
    if not path.exists():
        request = Request(url, headers={'User-Agent': 'KartikPortfolio/1.0 (local asset preparation)'})
        path.write_bytes(urlopen(request, timeout=45).read())
    return Image.open(path).convert('RGBA')


def polygon_cutout(image, points, name, width):
    mask = Image.new('L', image.size)
    ImageDraw.Draw(mask).polygon(points, fill=255)
    image.putalpha(mask.filter(ImageFilter.GaussianBlur(0.55)))
    image = image.crop(image.getbbox())
    image.thumbnail((width, width))
    image.save(OUT / (name + '.webp'), quality=92)


# Existing project photograph. Preserve the camera rig and the antenna.
car = Image.open(ROOT / 'public/img/mcqueen-car.png').convert('RGBA')
polygon_cutout(car, [
    (60, 225), (64, 204), (72, 182), (98, 155), (126, 137), (157, 128),
    (178, 116), (178, 91), (191, 85), (233, 89), (254, 98), (274, 95),
    (278, 82), (288, 74), (300, 78), (308, 92), (337, 94), (353, 94),
    (356, 4), (361, 4), (365, 99), (409, 103), (441, 105), (444, 111),
    (415, 119), (425, 131), (427, 152), (425, 170), (420, 193),
    (407, 218), (389, 234), (370, 241), (337, 245), (309, 257),
    (278, 274), (251, 285), (207, 285), (164, 279), (123, 269), (87, 254),
], 'mcqueen', 760)

# Wikimedia Commons File:Tool-pliers.jpg — public domain; white studio background.
pliers = source('pliers', 'https://upload.wikimedia.org/wikipedia/commons/5/51/Tool-pliers.jpg')
pliers.thumbnail((1000, 1000))
pixels = pliers.load()
seen = set()
queue = deque([(0, 0), (pliers.width - 1, 0), (0, pliers.height - 1), (pliers.width - 1, pliers.height - 1)])
while queue:
    x, y = queue.popleft()
    if (x, y) in seen or x < 0 or y < 0 or x >= pliers.width or y >= pliers.height:
        continue
    seen.add((x, y))
    r, g, b, a = pixels[x, y]
    if min(r, g, b) < 230 or max(r, g, b) - min(r, g, b) > 18:
        continue
    pixels[x, y] = (r, g, b, 0)
    queue.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])
pliers.crop(pliers.getbbox()).save(OUT / 'pliers.webp', quality=90)

# SRA board repository image; its MIT license is retained alongside the asset.
board = source('sra-board', 'https://raw.githubusercontent.com/SRA-VJTI/sra-board-hardware-design/master/documentation/images/board_images/front.png')
polygon_cutout(board, [
    (26, 108), (123, 108), (123, 8), (220, 8), (221, 76), (416, 76),
    (416, 24), (593, 24), (593, 73), (691, 73), (691, 79), (782, 79),
    (827, 88), (829, 823), (778, 823), (778, 853), (478, 853), (478, 831),
    (374, 831), (374, 852), (283, 852), (283, 831), (90, 831), (77, 819),
    (77, 654), (26, 654),
], 'sra-board', 600)
for path in OUT.glob('*.webp'):
    print(path.relative_to(ROOT), path.stat().st_size, 'bytes')
