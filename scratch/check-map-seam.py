from pathlib import Path
from PIL import Image
import json
for width in (1440,390):
    deltas={}
    for phase in ('before','after'):
        report=json.loads(Path(f'scratch/outlet-review/map-seam-{phase}.json').read_text())
        seam=round(next(item['bottom'] for item in report if item['width']==width))
        picture=Image.open(f'scratch/outlet-review/map-seam-{phase}-{width}.png').convert('RGB')
        differences=[abs(a-b) for x in range(round(width*.15),round(width*.8)) for a,b in zip(picture.getpixel((x,seam-2)),picture.getpixel((x,seam+2)))]
        deltas[phase]=sum(differences)/len(differences)
    assert deltas['after']<2, deltas
    assert deltas['after']<deltas['before'], deltas
    print(f'{width}px: mean seam color jump {deltas["before"]:.2f} -> {deltas["after"]:.2f} / 255')
