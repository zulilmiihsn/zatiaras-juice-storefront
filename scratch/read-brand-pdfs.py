from pathlib import Path
import pymupdf

out = Path('scratch/brand-review')
out.mkdir(exist_ok=True)
for pattern, label, pages in [
    ('*Identity*pdf', 'identity', [3, 4, 5, 7]),
    ('*Master*pdf', 'master', [4]),
    ('*Application*pdf', 'application', [2, 3, 6]),
]:
    source = next(Path('.').glob(pattern))
    doc = pymupdf.open(source)
    (out / f'{label}.txt').write_text('\n'.join(f'PAGE {i + 1}\n{p.get_text()}' for i, p in enumerate(doc)), encoding='utf8')
    print(f'{label}: {source.name}, {len(doc)} pages')
    for index in pages:
        doc[index].get_pixmap(matrix=pymupdf.Matrix(1.4, 1.4)).save(out / f'{label}-{index + 1}.png')
    if label == 'identity':
        print(doc[4].get_text())
