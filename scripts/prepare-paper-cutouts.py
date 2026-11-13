"""Mount existing artwork on irregular paper, following its actual alpha edge."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps

CACHE = Path('/tmp/opencode/paper-cutouts')
OUT = Path('public/img/bench/paper')
OUT.mkdir(parents=True, exist_ok=True)

for path in sorted(CACHE.glob('*.png')):
    art = Image.open(path).convert('RGBA')
    if path.stem == 'jetson-render':
        # Remove only the connected near-white backdrop, not light port details.
        pixels = np.asarray(art)
        white = np.all(pixels[:, :, :3] > 238, axis=2)
        background = Image.fromarray(np.where(white, 255, 0).astype('uint8')).copy()
        ImageDraw.floodfill(background, (0, 0), 128)
        alpha = np.asarray(art.getchannel('A')).copy()
        alpha[np.asarray(background) == 128] = 0
        art.putalpha(Image.fromarray(alpha))
    art = art.crop(art.getbbox())
    margin_scale = max(1, max(art.size) / 450)
    art = ImageOps.expand(art, border=64, fill=(0, 0, 0, 0))
    silhouette = art.getchannel('A').point(lambda value: 255 if value > 24 else 0)
    # Fill enclosed holes: the paper is cut around the outside of each object.
    outside = ImageOps.invert(silhouette)
    ImageDraw.floodfill(outside, (0, 0), 128)
    silhouette = outside.point(lambda value: 0 if value == 128 else 255)
    def dilate(size):
        return np.asarray(silhouette.filter(ImageFilter.MaxFilter(round(size * margin_scale) // 2 * 2 + 1)))
    narrow, medium, broad = (dilate(size) for size in (17, 25, 33))
    y, x = np.indices(narrow.shape)
    variation = np.sin((x * .15 + y * .09) / margin_scale) + np.sin((y * .19 - x * .06) / margin_scale)
    variation += .55 * np.sin((x * .71 + y * .63) / margin_scale)
    edge = np.where(variation < -.55, narrow, np.where(variation > .55, broad, medium))
    mask = Image.fromarray(edge.astype('uint8')).filter(ImageFilter.GaussianBlur(.2))
    paper = Image.open('public/img/paper-grain.png').convert('RGB').resize(art.size)
    # Keep the existing grain, tinted to uncoated paper rather than a white glow.
    grain = np.asarray(paper, dtype=np.float32).mean(axis=2)
    grain = np.clip((grain - grain.mean()) * .25, -7, 7)
    color = np.array([249, 245, 231], dtype=np.float32)
    paper = Image.fromarray(np.clip(color + grain[:, :, None], 0, 255).astype('uint8')).convert('RGBA')
    paper.putalpha(mask)
    # Deterministic print grain on the art itself, not just the backing paper.
    # The source image and its alpha remain untouched on disk.
    pixels = np.asarray(art).copy()
    rng = np.random.default_rng(sum(path.stem.encode('utf-8')))
    noise = rng.normal(0, 3.2, pixels.shape[:2]) + grain * .8
    pixels[:, :, :3] = np.clip(pixels[:, :, :3].astype(np.float32) * .985 + color * .015 + noise[:, :, None], 0, 255).astype('uint8')
    art = Image.fromarray(pixels)
    paper.alpha_composite(art)
    paper = paper.crop(paper.getbbox())
    output = OUT / (path.stem + '.webp')
    paper.save(output, quality=94)
    print(output, paper.size)
