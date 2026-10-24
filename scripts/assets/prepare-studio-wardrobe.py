"""Prepare ONE reviewed CC0 outfit against the shipped female-studio rest skeleton.
Run python3 scripts/assets/prepare-studio-wardrobe.py (numpy, Pillow). No network.
Only garment primitives, weighted joints/ancestors and used artwork are published.
"""
import copy, hashlib, importlib.util, json
from io import BytesIO
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('cc0', Path(__file__).with_name('prepare-cc0-costumes.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
SOURCE = ROOT/'scripts/assets/cc0-costumes/Darkness_Shibu/costume.glb'
TARGET = ROOT/'public/plaza/characters/anime/female-studio.vrm'
OUT = ROOT/'public/plaza/characters/wardrobe'


def prepare():
    sd, sb, sr = m.parse(SOURCE)
    td, tb, tr = m.parse(TARGET)
    provenance = json.loads(SOURCE.with_name('provenance.json').read_text())
    assert provenance['embeddedLicense']['licenseName'] == 'CC0'
    assert hashlib.sha256(sr).hexdigest() == provenance['variants']['costume']['sanitizedGLB']['sha256']
    sn = next(n for n in sd['nodes'] if 'mesh' in n)
    ss = sd['skins'][sn['skin']]
    ts = td['skins'][1]
    source_binds = m.accessor(sd, sb, ss['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
    target_binds = m.accessor(td, tb, ts['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
    target_by_name = {td['nodes'][n]['name']: i for i, n in enumerate(ts['joints'])}
    primitives = sd['meshes'][sn['mesh']]['primitives']
    used = sorted(set(int(j) for p in primitives for j, w in zip(m.accessor(sd, sb, p['attributes']['JOINTS_0']).flat, m.accessor(sd, sb, p['attributes']['WEIGHTS_0']).flat) if w > 0))
    names = [sd['nodes'][ss['joints'][i]]['name'] for i in used]
    assert all(n in target_by_name for n in names)
    ti = [target_by_name[n] for n in names]
    # Bind-space linear-blend rest warp, not a rigid parent or guessed scale.
    warp = np.array([np.linalg.inv(target_binds[t]) @ source_binds[s] for s, t in zip(used, ti)])
    remap = {old: new for new, old in enumerate(used)}
    d = {'asset': {'version': '2.0', 'generator': 'CTRL reviewed CC0 studio wardrobe'}, 'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'name': 'DarknessStudioGarment', 'mesh': 0, 'skin': 0}], 'meshes': [{'name': 'DarknessStudioGarment', 'primitives': []}], 'skins': [], 'accessors': [], 'bufferViews': [], 'buffers': [], 'materials': [], 'textures': [], 'images': [], 'samplers': [], 'extensionsUsed': ['KHR_materials_unlit']}
    blob = bytearray()

    def view(raw, target=None):
        blob.extend(b'\0'*(-len(blob)%4))
        v = {'buffer': 0, 'byteOffset': len(blob), 'byteLength': len(raw)}
        if target: v['target'] = target
        blob.extend(raw)
        d['bufferViews'].append(v)
        return len(d['bufferViews'])-1

    def acc(x, typ, component=5126, target=None):
        x = np.ascontiguousarray(x, dtype=np.dtype(m.DT[component]))
        a = {'bufferView': view(x.tobytes(), target), 'componentType': component, 'count': len(x), 'type': typ}
        if typ == 'VEC3': a.update(min=x.min(0).tolist(), max=x.max(0).tolist())
        d['accessors'].append(a)
        return len(d['accessors'])-1

    parent = {c: i for i, n in enumerate(td['nodes']) for c in n.get('children', [])}
    required = set(ts['joints'][i] for i in ti)
    for n in list(required):
        while n in parent:
            n = parent[n]
            required.add(n)
    node_map = {n: i+1 for i, n in enumerate(sorted(required))}
    for n in sorted(required):
        node = {k: copy.deepcopy(v) for k, v in td['nodes'][n].items() if k in ('name', 'translation', 'rotation', 'scale', 'matrix')}
        children = [node_map[c] for c in td['nodes'][n].get('children', []) if c in required]
        if children: node['children'] = children
        d['nodes'].append(node)
    d['scenes'][0]['nodes'] += [node_map[n] for n in sorted(required) if n not in parent]
    binds = target_binds[ti]
    d['skins'] = [{'joints': [node_map[ts['joints'][i]] for i in ti], 'inverseBindMatrices': acc(binds.transpose(0, 2, 1).reshape(-1, 16), 'MAT4')}]
    max_warp = 0
    texture_audit = []
    for p in primitives:
        attrs = p['attributes']
        pos = m.accessor(sd, sb, attrs['POSITION'])
        normal = m.accessor(sd, sb, attrs['NORMAL'])
        joints = m.accessor(sd, sb, attrs['JOINTS_0'])
        weights = m.accessor(sd, sb, attrs['WEIGHTS_0'])
        mapped = np.array([[remap[int(j)] if w > 0 else 0 for j, w in zip(js, ws)] for js, ws in zip(joints, weights)], dtype='<u2')
        matrices = warp[mapped]
        newpos = np.einsum('vk,vkij,vj->vi', weights, matrices, np.c_[pos, np.ones(len(pos))])[:, :3]
        newnormal = np.einsum('vk,vkij,vj->vi', weights, matrices[:, :, :3, :3], normal)
        newnormal /= np.maximum(np.linalg.norm(newnormal, axis=1, keepdims=True), 1e-12)
        max_warp = max(max_warp, float(np.linalg.norm(newpos-pos, axis=1).max()))
        newattrs = {'POSITION': acc(newpos, 'VEC3', target=34962), 'NORMAL': acc(newnormal, 'VEC3', target=34962), 'TEXCOORD_0': acc(m.accessor(sd, sb, attrs['TEXCOORD_0']), 'VEC2', target=34962), 'JOINTS_0': acc(mapped, 'VEC4', 5123, 34962), 'WEIGHTS_0': acc(weights, 'VEC4', target=34962)}
        mat = copy.deepcopy(sd['materials'][p['material']])
        # Explicit lightweight unlit artwork path; original MToon retained in provenance,
        # not pretending to reproduce its runtime shader/outline.
        mat.pop('normalTexture', None)
        mat.pop('emissiveTexture', None)
        tex = mat['pbrMetallicRoughness']['baseColorTexture']['index']
        raw = m.image_bytes(sd, sb, tex)
        image = Image.open(BytesIO(raw)).convert('RGBA')
        old_size = image.size
        image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
        output = BytesIO()
        image.save(output, format='PNG', optimize=True)
        idx = len(d['textures'])
        d['images'].append({'bufferView': view(output.getvalue()), 'mimeType': 'image/png'})
        d['samplers'].append(copy.deepcopy(sd['samplers'][sd['textures'][tex].get('sampler', 0)]))
        d['textures'].append({'source': idx, 'sampler': idx})
        mat['pbrMetallicRoughness']['baseColorTexture']['index'] = idx
        mat['alphaCutoff'] = .5
        d['materials'].append(mat)
        texture_audit.append({'sourceTexture': tex, 'sourceSize': old_size, 'outputSize': image.size, 'sourceSha256': hashlib.sha256(raw).hexdigest()})
        d['meshes'][0]['primitives'].append({'attributes': newattrs, 'indices': acc(m.accessor(sd, sb, p['indices']), 'SCALAR', 5123, 34963), 'material': idx, 'mode': 4})
    d['extras'] = {'ctrlWardrobe': {'id': 'darkness-studio', 'supportedCharacterId': 'ctrl-anime-female-studio', 'targetRestBound': True, 'weightedBones': names, 'license': 'CC0-1.0'}}
    d['buffers'] = [{'byteLength': len(blob)}]
    OUT.mkdir(parents=True, exist_ok=True)
    artifact = m.encode(d, bytes(blob))
    (OUT/'darkness-studio.glb').write_bytes(artifact)
    report = {'id': 'darkness-studio', 'supportedCharacterIds': ['ctrl-anime-female-studio'], 'source': provenance['downloadSource'], 'officialLicenseSource': provenance['officialLicenseSource'], 'license': 'CC0-1.0', 'sourceOriginalSha256': provenance['sourceSha256'], 'sourceSanitizedSha256': hashlib.sha256(sr).hexdigest(), 'targetSha256': hashlib.sha256(tr).hexdigest(), 'artifactSha256': hashlib.sha256(artifact).hexdigest(), 'bytes': len(artifact), 'triangles': sum(d['accessors'][p['indices']]['count']//3 for p in d['meshes'][0]['primitives']), 'weightedBones': names, 'restWarpMaxMeters': max_warp, 'binding': 'sum(weight * inverse(targetInverseBind) * sourceInverseBind * position); new target inverse binds; runtime skeleton references actual target raw bones', 'textures': texture_audit, 'geometryPolicy': 'All source garment triangles/UVs/normalized weights retained; positions/normals rest-warped only. No body, hair, faces or unused binary.', 'materialPolicy': 'Original source KHR_materials_unlit color artwork + alpha mask. Unused normal/emission maps removed; no MToon shader parity claim.', 'originalMToon': [sd['extensions']['VRM']['materialProperties'][p['material']] for p in primitives], 'fitStatus': 'CPU regression required; browser acceptance pending parent wiring'}
    (OUT/'provenance.json').write_text(json.dumps(report, indent=2)+'\n')
    (OUT/'LICENSE.txt').write_text('Darkness Shibu costume artwork and geometry: pixiv Inc., official VRoid beta sample.\nCC0 1.0 Universal: https://creativecommons.org/publicdomain/zero/1.0/\nOfficial model license: '+provenance['officialLicenseSource']+'\nTo the extent possible under law, pixiv Inc. waived copyright and related rights.\nModified by CTRL: garment extraction, normalized weights, female-studio rest-binding, used-data pruning, 1024px PNG artwork.\nOnly this reviewed garment is included; this license does not cover unrelated VRoid presets.\n')
    print(json.dumps({k: report[k] for k in ('bytes', 'triangles', 'restWarpMaxMeters', 'artifactSha256')}, indent=2))

if __name__ == '__main__':
    prepare()
