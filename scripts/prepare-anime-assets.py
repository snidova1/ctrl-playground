"""Prepare licensed anime VRMs, preserving authored geometry, textures, rig and expressions.
Only the phone images are downsampled. No meshes or avatar shapes are generated.
"""
import hashlib
import json
import struct
from io import BytesIO
from pathlib import Path
from urllib.request import urlopen
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/plaza/characters/anime'
SOURCES = [
    ('female', Path('/tmp/ctrl-anime-candidates/constraint.vrm'), 'https://raw.githubusercontent.com/pixiv/three-vrm/dev/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm'),
    ('male', Path('/tmp/ctrl-anime-candidates/hair-male.vrm'), 'https://raw.githubusercontent.com/madjin/vrm-samples/master/vroid/beta/HairSample_Male.vrm'),
    ('female-studio', Path('/tmp/ctrl-avatar-customization/HairSample_Female.vrm'), 'https://raw.githubusercontent.com/madjin/vrm-samples/master/vroid/beta/HairSample_Female.vrm'),
    ('male-studio', Path('/tmp/ctrl-avatar-customization/Sakurada_Fumiriya.vrm'), 'https://raw.githubusercontent.com/madjin/vrm-samples/master/vroid/beta/Sakurada_Fumiriya.vrm'),
]

def parse(data):
    assert data[:4] == b'glTF' and struct.unpack_from('<I', data, 4)[0] == 2
    size = struct.unpack_from('<I', data, 12)[0]
    document = json.loads(data[20:20 + size])
    assert len(document['buffers']) == 1
    return document, data[28 + size:]

def mobile(data):
    document, binary = parse(data)
    replacements = {}
    for image in document.get('images', []):
        if 'bufferView' not in image:
            raise ValueError('Self-contained embedded images required')
        index = image['bufferView']
        view = document['bufferViews'][index]
        offset = view.get('byteOffset', 0)
        original = binary[offset:offset + view['byteLength']]
        picture = Image.open(BytesIO(original))
        if max(picture.size) > 1024:
            picture.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
            output = BytesIO()
            picture.save(output, format='PNG', optimize=True)
            replacements[index] = output.getvalue()
            image['mimeType'] = 'image/png'
    rebuilt = bytearray()
    for index, view in enumerate(document['bufferViews']):
        while len(rebuilt) % 4:
            rebuilt.append(0)
        old_offset = view.get('byteOffset', 0)
        chunk = replacements.get(index, binary[old_offset:old_offset + view['byteLength']])
        view['byteOffset'], view['byteLength'], view['buffer'] = len(rebuilt), len(chunk), 0
        rebuilt.extend(chunk)
    while len(rebuilt) % 4:
        rebuilt.append(0)
    document['buffers'][0]['byteLength'] = len(rebuilt)
    encoded = json.dumps(document, separators=(',', ':'), ensure_ascii=False).encode()
    encoded += b' ' * (-len(encoded) % 4)
    return struct.pack('<4sII', b'glTF', 2, 28 + len(encoded) + len(rebuilt)) + struct.pack('<I4s', len(encoded), b'JSON') + encoded + struct.pack('<I4s', len(rebuilt), b'BIN\0') + rebuilt

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    records = []
    for gender, source, url in SOURCES:
        if not source.exists():
            source.parent.mkdir(parents=True, exist_ok=True)
            with urlopen(url, timeout=90) as response:
                source.write_bytes(response.read())
        data = source.read_bytes()
        document, _ = parse(data)
        extension = document['extensions'].get('VRMC_vrm', document['extensions'].get('VRM'))
        meta = extension['meta']
        if gender == 'female':
            assert meta['avatarPermission'] == 'everyone'
            assert meta['commercialUsage'] == 'corporation' and meta['allowRedistribution']
            assert meta['modification'] == 'allowModificationRedistribution'
        else:
            assert meta['licenseName'] == 'CC0' and meta['allowedUserName'] == 'Everyone'
        assert document.get('skins') and len(document.get('textures', [])) >= 3
        files = {}
        for quality, prepared in [('high', data), ('low', mobile(data))]:
            filename = f'{gender}.vrm' if quality == 'high' else f'{gender}-mobile.vrm'
            (OUT / filename).write_bytes(prepared)
            check, _ = parse(prepared)
            assert check['meshes'] == document['meshes'] and check['skins'] == document['skins']
            files[quality] = {'file': filename, 'bytes': len(prepared), 'sha256': hashlib.sha256(prepared).hexdigest()}
        records.append({'gender': gender, 'source': url, 'sourceSha256': hashlib.sha256(data).hexdigest(), 'embeddedLicense': meta, 'files': files, 'meshes': len(document['meshes']), 'materials': [m.get('name', '') for m in document['materials']], 'images': len(document['images']), 'skins': len(document['skins'])})
        print(gender, json.dumps(files), 'skin/geometry preserved')
    (OUT / 'provenance.json').write_text(json.dumps({'models': records, 'preparation': 'Desktop original VRM; phone identical geometry/rig/expressions with maximum 1024px embedded textures. Original licensing preserved.'}, indent=2))

if __name__ == '__main__':
    main()
