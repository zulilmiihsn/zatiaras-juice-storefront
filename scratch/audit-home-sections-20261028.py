import json
from pathlib import Path
from PIL import Image

base = Path('scratch/home-layout/audit-20261028-current')
rows = json.loads((base / 'geometry.json').read_text(encoding='utf-8'))
for name in ('390x844-reduce-js', '1440x900-reduce-js'):
    row = next(item for item in rows if item['name'] == name)
    img = Image.open(base / f'{name}-full.png')
    for index, section in enumerate(row['sections'], 1):
        top = section['top']
        bottom = min(top + section['height'], img.height)
        img.crop((0, top, img.width, bottom)).save(base / f'{name}-section-{index}.png')
        print(f"{name} section {index}: {section['title']} {section['height']}px")
