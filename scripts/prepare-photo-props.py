"""Reproduce photo cut-outs without generative imagery or a new dependency.

Sources are cached outside git. Manufacturer images are LOCAL PREVIEW ONLY until
reuse permission is resolved; see public/img/bench/PHOTO-SOURCES.md.
"""
from pathlib import Path
from urllib.request import Request, urlopen
from PIL import Image, ImageOps, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path('/tmp/opencode/photo-props')
OUT = ROOT / 'public/img/bench/photos'
SOURCES = {
    'dumbbells': 'https://cdn.shopify.com/s/files/1/0574/1215/7598/products/Shopify-DB-3000-35-Thumbnail.jpg?v=1635876042',
    'volleyball': 'https://mikasasports.com/wp-content/uploads/2019/12/V200W-Front.webp',
    'shuttle': 'https://www.yonex.com/media/catalog/product/m/a/mavis350-y_1_1.png',
    'uno': 'https://cdn.shopify.com/s/files/1/0438/4735/2471/files/ABX00162_00.default.jpg?v=1759218128',
    'jetson': 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Nvidia_Jetson_Nano_2_Development_Kit.jpeg',
    'football': 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Soccer_ball.jpg',
    'knight': 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Chess_Piece%2C_Knight_MET_DP303335.jpg',
    'paddle': 'https://upload.wikimedia.org/wikipedia/commons/f/f3/Table_tennis_racket_%2851465161213%29.jpg',
    'notebook': 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Blank_Pages_In_An_Open_Notebook_%284812269151%29.jpg',
    'football-classic': 'https://upload.wikimedia.org/wikipedia/commons/1/1d/Football_Pallo_valmiina-cropped.jpg',
    'knight-staunton': 'https://upload.wikimedia.org/wikipedia/commons/3/31/Chess_piece_-_White_knight.JPG',
    'wires': 'https://upload.wikimedia.org/wikipedia/commons/e/e2/Jumper_Wires_with_Crocodile_Clips.jpg',
}


def source(name):
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / (name + '.source')
    if not path.exists():
        req = Request(SOURCES[name], headers={'User-Agent': 'KartikPortfolio/1.0 (local design preview)'})
        path.write_bytes(urlopen(req, timeout=45).read())
    return ImageOps.exif_transpose(Image.open(path)).convert('RGBA')


def contact_sheet():
    sheet = Image.new('RGB', (1500, 1600), '#dfe3dc')
    draw = ImageDraw.Draw(sheet)
    for i, name in enumerate(SOURCES):
        try:
            image = source(name)
            print(name, image.size)
            preview = image.copy()
            preview.thumbnail((470, 350))
            x, y = (i % 3) * 500 + 15, (i // 3) * 400 + 15
            sheet.paste(preview, (x, y), preview)
            draw.text((x, y + 360), name + ' ' + str(image.size), fill='#1d2d23')
        except Exception as error:
            print(name, error)
    sheet.save(CACHE / 'sources.jpg')


if __name__ == '__main__':
    contact_sheet()
