"""Compact CC0 authored hairstyles; keep source rest rig, UVs, weights, inverse binds.
Run: python3 scripts/assets/prepare-authored-hairstyles.py
No full avatar is published. A face-only calibration surface is discarded at attachment.
"""
import copy, hashlib, importlib.util, json
from io import BytesIO
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('cc0', Path(__file__).with_name('prepare-cc0-costumes.py'))
cc0 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cc0)
OUT = ROOT / 'public/plaza/characters/hairstyles'
STYLES = [('Sendagaya_Shino', 'cc0-shino-long'), ('Sendagaya_Shibu', 'cc0-shibu-bob')]


def prepare(source, style, limit, suffix):
    provenance = json.loads((ROOT / 'scripts/assets/cc0-costumes' / source / 'provenance.json').read_text())
    path = Path(provenance['originalSourcePath'])
    d, b, raw = cc0.parse(path)
    assert hashlib.sha256(raw).hexdigest() == provenance['sourceSha256']
    meta = d['extensions']['VRM']['meta']
    assert meta['licenseName'] == 'CC0' and meta['allowedUserName'] == 'Everyone' and meta['commercialUssageName'] == 'Allow'
    out = copy.deepcopy(d)
    out['accessors'], out['bufferViews'], out['meshes'] = [], [], []
    binary = bytearray()
    def view(data):
        binary.extend(b'\0' * (-len(binary) % 4))
        n = len(out['bufferViews'])
        out['bufferViews'].append({'buffer': 0, 'byteOffset': len(binary), 'byteLength': len(data)})
        binary.extend(data)
        return n
    def acc(array, template):
        value = copy.deepcopy(template)
        value.pop('sparse', None)
        value['bufferView'] = view(array.tobytes())
        value['byteOffset'] = 0
        value['count'] = len(array)
        if 'min' in value: value['min'] = array.min(axis=0).tolist()
        if 'max' in value: value['max'] = array.max(axis=0).tolist()
        out['accessors'].append(value)
        return len(out['accessors']) - 1
    # Keep only authored hair triangles whose nonzero influences descend from
    # the source head. Legacy scalp/back surfaces include a neck seam; prune
    # those triangles rather than reweighting or weakening the runtime guard.
    head = next(h['node'] for h in d['extensions']['VRM']['humanoid']['humanBones'] if h['bone'] == 'head')
    descendants = set()
    def visit(i):
        descendants.add(i)
        for child in d['nodes'][i].get('children', []): visit(child)
    visit(head)
    pruned_triangles = 0
    mats, mesh_map, original_data = set(), {}, []
    for mi, mesh in enumerate(d['meshes']):
        ps = []
        for p in mesh['primitives']:
            name = d['materials'][p['material']]['name']
            if not ('HAIR' in name.upper() or 'Face_00_SKIN' in name): continue
            ix = cc0.accessor(d, b, p['indices']).ravel()
            if 'HAIR' in name.upper():
                node = next(n for n in d['nodes'] if n.get('mesh') == mi)
                joint_nodes = np.array(d['skins'][node['skin']]['joints'])
                joints = cc0.accessor(d, b, p['attributes']['JOINTS_0'])
                weights = cc0.accessor(d, b, p['attributes']['WEIGHTS_0'])
                safe = np.all((weights <= 0) | np.isin(joint_nodes[joints], list(descendants)), axis=1)
                triangles = ix.reshape(-1, 3)
                keep = np.all(safe[triangles], axis=1)
                pruned_triangles += int((~keep).sum())
                ix = triangles[keep].ravel()
                if not len(ix): continue
            used, remap = np.unique(ix, return_inverse=True)
            q = {'attributes': {}, 'material': p['material'], 'mode': p.get('mode', 4)}
            arrays = {key: cc0.accessor(d, b, ai)[used] for key, ai in p['attributes'].items()}
            # Canonicalize duplicate authored influences (old VRoid often emits
            # head twice at .5/.5). Same joint totals, no reweighting to target.
            joints, weights = arrays['JOINTS_0'], arrays['WEIGHTS_0']
            for row in range(len(joints)):
                combined = {}
                for joint, weight in zip(joints[row], weights[row]):
                    if weight > 0: combined[int(joint)] = combined.get(int(joint), 0.) + float(weight)
                total = sum(combined.values())
                assert abs(total - 1.) < .002
                pairs = list(combined.items())
                joints[row] = [j for j, _ in pairs] + [0] * (4 - len(pairs))
                weights[row] = [w / total for _, w in pairs] + [0.] * (4 - len(pairs))
            for key, ai in p['attributes'].items():
                array = arrays[key]
                q['attributes'][key] = acc(array, d['accessors'][ai])
                if key in ('POSITION', 'TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0'):
                    original_data.append(array.tobytes())
            q['indices'] = acc(remap.astype('<u4').reshape(-1, 1), {'componentType': 5125, 'type': 'SCALAR'})
            ps.append(q); mats.add(p['material'])
        if ps:
            mesh_map[mi] = len(out['meshes'])
            out['meshes'].append({'name': mesh.get('name', '') + '::' + style, 'primitives': ps})
    for node in out['nodes']:
        node['name'] = style + '::' + node.get('name', 'node')
        if 'mesh' in node:
            if node['mesh'] in mesh_map: node['mesh'] = mesh_map[node['mesh']]
            else: node.pop('mesh'); node.pop('skin', None)
        node.pop('weights', None)
    for skin in out['skins']:
        ai = skin['inverseBindMatrices']
        skin['inverseBindMatrices'] = acc(cc0.accessor(d, b, ai), d['accessors'][ai])
    mat_map = {m: i for i, m in enumerate(sorted(mats))}
    out['materials'] = [copy.deepcopy(d['materials'][m]) for m in sorted(mats)]
    for mesh in out['meshes']:
        for p in mesh['primitives']: p['material'] = mat_map[p['material']]
    vrm = out['extensions']['VRM']
    vrm['materialProperties'] = [copy.deepcopy(d['extensions']['VRM']['materialProperties'][m]) for m in sorted(mats)]
    vrm['blendShapeMaster'] = {'blendShapeGroups': []}
    vrm['firstPerson']['meshAnnotations'] = []
    vrm['meta'].pop('texture', None)
    # Recursively enumerate only texture references actually used by retained materials.
    tex_ids = set()
    def gather(x):
        if isinstance(x, dict):
            for k, v in x.items():
                if k.endswith('Texture') and isinstance(v, dict) and 'index' in v: tex_ids.add(v['index'])
                else: gather(v)
        elif isinstance(x, list):
            for v in x: gather(v)
    gather(out['materials'])
    for m in vrm['materialProperties']: tex_ids.update(v for v in m.get('textureProperties', {}).values() if v >= 0)
    tex_map = {old: i for i, old in enumerate(sorted(tex_ids))}
    def remap_textures(x):
        if isinstance(x, dict):
            for k, v in x.items():
                if k.endswith('Texture') and isinstance(v, dict) and 'index' in v: v['index'] = tex_map[v['index']]
                else: remap_textures(v)
        elif isinstance(x, list):
            for v in x: remap_textures(v)
    remap_textures(out['materials'])
    for m in vrm['materialProperties']:
        m['textureProperties'] = {k: tex_map[v] for k, v in m.get('textureProperties', {}).items() if v >= 0}
    out['images'], out['textures'] = [], []
    for ti in sorted(tex_ids):
        image = Image.open(BytesIO(cc0.image_bytes(d, b, ti))).convert('RGBA')
        image.thumbnail((limit, limit), Image.Resampling.LANCZOS)
        encoded = BytesIO(); image.save(encoded, format='PNG', optimize=True)
        out['images'].append({'bufferView': view(encoded.getvalue()), 'mimeType': 'image/png'})
        texture = copy.deepcopy(d['textures'][ti]); texture['source'] = len(out['images']) - 1
        out['textures'].append(texture)
    out.pop('animations', None)
    out['buffers'] = [{'byteLength': len(binary)}]
    out['extras'] = {'ctrlAuthoredHair': {'id': style, 'source': source, 'license': 'CC0', 'facePurpose': 'fit-only; attachAuthoredHair discards it', 'sourceRestBindingPreserved': True}}
    artifact = OUT / (style + suffix + '.vrm')
    artifact.write_bytes(cc0.encode(out, bytes(binary)))
    check, checked_binary, _ = cc0.parse(artifact)
    for original, compact in zip(d['nodes'], check['nodes']):
        for key in ('translation', 'rotation', 'scale', 'matrix', 'children'):
            assert original.get(key) == compact.get(key), ('Rest transform changed', key)
    assert check['extensions']['VRM']['humanoid'] == d['extensions']['VRM']['humanoid']
    for original, compact in zip(d['skins'], check['skins']):
        assert original['joints'] == compact['joints']
        assert np.array_equal(cc0.accessor(d, b, original['inverseBindMatrices']), cc0.accessor(check, checked_binary, compact['inverseBindMatrices']))
    return {'file': artifact.name, 'prunedNeckSeamTriangles': pruned_triangles, 'bytes': artifact.stat().st_size, 'sha256': hashlib.sha256(artifact.read_bytes()).hexdigest(), 'source': source, 'sourceSha256': provenance['sourceSha256'], 'officialLicenseSource': provenance['officialLicenseSource'], 'downloadSource': provenance['downloadSource'], 'embeddedLicense': meta, 'authoredAttributeSha256': hashlib.sha256(b''.join(original_data)).hexdigest(), 'textureMaxSize': limit, 'restTransformsPreserved': True, 'inverseBindsPreserved': True, 'uvsPreserved': True, 'weightsPolicy': 'Authored duplicate joint influences merged and float sums normalized; no target reweighting; source rest transforms and inverse binds unchanged', 'hairTriangles': sum(out['accessors'][p['indices']]['count']//3 for m in out['meshes'] for p in m['primitives'] if 'HAIR' in out['materials'][p['material']]['name'].upper())}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    records = [prepare(source, style, limit, suffix) for source, style in STYLES for limit, suffix in [(512, ''), (256, '-mobile')]]
    (OUT / 'provenance.json').write_text(json.dumps({'artifacts': records, 'scope': 'Hair donor only, never catalog as a complete avatar. Keep donor rest pose; no secondary animation update.'}, indent=2))
    for r in records: print(r['file'], r['bytes'], 'bytes;', r['hairTriangles'], 'authored hair triangles; CC0 verified')

if __name__ == '__main__': main()
