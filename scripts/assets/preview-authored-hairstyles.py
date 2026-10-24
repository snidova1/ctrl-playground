"""Render donor geometry/UVs in CPU only; not a fitted-avatar browser preview."""
import importlib.util
from pathlib import Path
from PIL import Image, ImageDraw
s = importlib.util.spec_from_file_location('inspect_cc0', Path(__file__).with_name('inspect-cc0-costumes.py'))
assert s is not None and s.loader is not None
m = importlib.util.module_from_spec(s)
s.loader.exec_module(m)
out = Path(__file__).resolve().parents[2] / 'public/plaza/characters/hairstyles'
sheet = Image.new('RGB', (960, 640), 'white')
for i, style in enumerate(['cc0-shino-long', 'cc0-shibu-bob']):
    picture = m.preview(out / (style + '.vrm'))
    sheet.paste(picture, (i * 480, 0))
    ImageDraw.Draw(sheet).text((i * 480 + 12, 12), style + ' | authored source geometry', fill='black')
sheet.save(out / 'authored-geometry-contact.jpg')
print(out / 'authored-geometry-contact.jpg')
