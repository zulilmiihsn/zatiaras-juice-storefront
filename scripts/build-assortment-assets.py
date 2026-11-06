"""Create transparent, web-sized copies; preserve supplied PNG artwork unchanged.
Run: py scripts/build-assortment-assets.py (requires Pillow).
"""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1] / 'static'
out = root / 'images' / 'assortment'
out.mkdir(parents=True, exist_ok=True)
products = {
    'avocado': 'Avocado Zatiaras Juice Showcase.png',
    'avocado-chocolate': 'Avocado Chocolate Smoothie Advertisement.png',
    'mango': 'Mango Zatiaras Juice Product Composition.png',
}
def visible_crop(image):
    # Ignore near-invisible cutout residue when finding the frame, while keeping
    # the original pixels/alpha and a small safety margin around the artwork.
    left, top, right, bottom = image.getchannel('A').point(lambda alpha: 255 if alpha > 32 else 0).getbbox()
    return image.crop((max(0, left - 4), max(0, top - 4), min(image.width, right + 4), min(image.height, bottom + 4)))


for name, source in products.items():
    image = visible_crop(Image.open(root / source).convert('RGBA'))
    for width in (480, 960):
        resized = image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
        resized.save(out / f'{name}-{width}.webp', quality=88, method=4)

for name, source, width in (
    ('pistachio-blob', 'Pale Pistachio Organic Blob.png', 720),
    ('peach-blob', 'Soft Peach Gradient Blob.png', 720),
    ('pink-blob', 'Soft Peach Abstract Blob.png', 720),
    ('marble', 'Polished Marble Platform Cutout.png', 1920),
):
    image = visible_crop(Image.open(root / source).convert('RGBA'))
    image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS).save(
        out / f'{name}.webp', quality=88, method=4
    )

for file in sorted(out.glob('*.webp')):
    print(file.name, Image.open(file).size, f'{file.stat().st_size / 1024:.0f} KB')
