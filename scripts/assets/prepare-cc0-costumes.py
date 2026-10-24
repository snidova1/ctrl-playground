"""Extract real, weighted VRoid CC0 garment/hair primitives; never generate geometry.
Run: python3 scripts/assets/prepare-cc0-costumes.py
Outputs are SOURCE-RIG candidates, NOT target-rig ready. Requires numpy and Pillow.
"""
import copy, hashlib, json, struct, shutil
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from io import BytesIO

ROOT = Path(__file__).resolve().parents[2]
CACHE = Path('/tmp/ctrl-costume-candidates')
OUT = Path(__file__).resolve().parent / 'cc0-costumes'
NAMES = ['Sendagaya_Shino', 'Sendagaya_Shibu', 'Darkness_Shibu', 'Vita', 'Vivi']
OFFICIAL = {'Sendagaya_Shino':'360013482714', 'Sendagaya_Shibu':'360012381793', 'Darkness_Shibu':'360012381793', 'Vita':'360014900113', 'Vivi':'360014900273'}
DT = {5120:'i1',5121:'u1',5122:'<i2',5123:'<u2',5125:'<u4',5126:'<f4'}
NC = {'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}

def parse(path):
    raw=path.read_bytes(); assert raw[:4]==b'glTF'
    n=struct.unpack_from('<I',raw,12)[0]
    return json.loads(raw[20:20+n]),raw[28+n:],raw

def accessor(d,b,i):
    a=d['accessors'][i]; v=d['bufferViews'][a['bufferView']]
    dtype=np.dtype(DT[a['componentType']]); cols=NC[a['type']]
    return np.ndarray((a['count'],cols),dtype=dtype,buffer=b,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',dtype.itemsize*cols),dtype.itemsize)).copy()

def encode(d,b):
    j=json.dumps(d,separators=(',',':'),ensure_ascii=False).encode(); j+=b' '*(-len(j)%4)
    b+=b'\0'*(-len(b)%4)
    return struct.pack('<4sII',b'glTF',2,28+len(j)+len(b))+struct.pack('<I4s',len(j),b'JSON')+j+struct.pack('<I4s',len(b),b'BIN\0')+b

def image_bytes(d,b,texture):
    im=d['images'][d['textures'][texture]['source']]; v=d['bufferViews'][im['bufferView']]
    return b[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]

def extract(d,b,kind):
    result=copy.deepcopy(d); active=[]; stats=[]; geom=hashlib.sha256()
    for mi,mesh in enumerate(d['meshes']):
        selected=[]
        for pi,p in enumerate(mesh['primitives']):
            mat=d['materials'][p['material']]['name']
            if ('_CLOTH' in mat if kind=='costume' else '_HAIR' in mat):
                selected.append(copy.deepcopy(p))
                ix=accessor(d,b,p['indices']).ravel().astype(int)
                pos=accessor(d,b,p['attributes']['POSITION']); weights=accessor(d,b,p['attributes']['WEIGHTS_0']); joints=accessor(d,b,p['attributes']['JOINTS_0'])
                used=np.unique(ix); assert ix.max()<len(pos)
                assert np.isfinite(pos[used]).all() and np.isfinite(weights[used]).all()
                assert np.max(np.abs(weights[used].sum(axis=1)-1))<0.002
                geom.update(pos[used].tobytes()); geom.update(ix.astype('<u4').tobytes())
                node=next(n for n in d['nodes'] if n.get('mesh')==mi)
                skin=d['skins'][node['skin']]; assert joints[used].max()<len(skin['joints'])
                ib=accessor(d,b,skin['inverseBindMatrices']); assert len(ib)==len(skin['joints']) and np.isfinite(ib).all()
                stats.append({'mesh':mi,'primitive':pi,'material':mat,'triangles':len(ix)//3,'referencedVertices':len(used),'min':pos[used].min(axis=0).tolist(),'max':pos[used].max(axis=0).tolist(),'skin':node['skin'],'joints':len(skin['joints']),'weightsNormalized':True,'inverseBindsFinite':True})
        if selected:
            result['meshes'][mi]['primitives']=selected; active.append(mi)
        # Retain unused mesh definitions (no invalid empty meshes), but detach from scene nodes.
    for node in result['nodes']:
        if 'mesh' in node and node['mesh'] not in active:
            del node['mesh']; node.pop('skin',None)
    # Original VRM0 MToon materialProperties and secondaryAnimation retained verbatim.
    # Facial expression binds removed: their face geometry is intentionally detached.
    result['extensions']['VRM']['blendShapeMaster']['blendShapeGroups']=[]
    result.setdefault('extras',{})['ctrlCandidate']={'kind':kind,'sourceRigOnly':True,'extraction':'Only material-labelled skinned primitives remain attached; all node transforms, skins, accessor bytes and embedded images preserved. Unused binary data intentionally retained.'}
    assert result['skins']==d['skins']
    for i,n in enumerate(result['nodes']):
        for key in ['matrix','translation','rotation','scale','children']:
            assert n.get(key)==d['nodes'][i].get(key)
    return result,stats,geom.hexdigest()

def main():
    OUT.mkdir(parents=True,exist_ok=True); records=[]; thumbs=[]
    for name in NAMES:
        src=CACHE/(name+'.vrm'); d,b,raw=parse(src); meta=d['extensions']['VRM']['meta']
        assert meta['licenseName']=='CC0' and meta['allowedUserName']=='Everyone'
        dest=OUT/name; dest.mkdir(exist_ok=True)
        thumb=image_bytes(d,b,meta['texture']); (dest/'thumbnail.png').write_bytes(thumb)
        picture=Image.open(BytesIO(thumb)).convert('RGB'); picture.thumbnail((240,300)); thumbs.append((name,picture))
        record={'identity':name,'creator':'pixiv Inc. (official VRoid beta sample; mirrored export)','officialLicenseSource':'https://vroid.pixiv.help/hc/en-us/articles/'+OFFICIAL[name],'downloadSource':f'https://raw.githubusercontent.com/madjin/vrm-samples/master/vroid/beta/{name}.vrm','sourceSha256':hashlib.sha256(raw).hexdigest(),'embeddedLicense':meta,'originalSourcePath':str(src),'thumbnail':'thumbnail.png','status':'SOURCE_RIG_VERIFIED; TARGET_RIG_TRANSFER_REQUIRED','variants':{}}
        for kind in ['costume','hair']:
            derived,stats,geometry=extract(d,b,kind); data=encode(derived,b); path=dest/(kind+'.vrm'); path.write_bytes(data)
            check,cb,_=parse(path); assert cb==b and check['skins']==d['skins'] and check['images']==d['images'] and check['materials']==d['materials']
            record['variants'][kind]={'file':path.name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'geometrySha256':geometry,'triangles':sum(s['triangles'] for s in stats),'primitives':stats,'originalBinaryPreserved':True,'originalSkinsAndInverseBindsPreserved':True}
        (dest/'provenance.json').write_text(json.dumps(record,indent=2)); records.append(record)
        print(name, 'costume triangles',record['variants']['costume']['triangles'],'hair triangles',record['variants']['hair']['triangles'], 'CC0 + weights/binds/binary verified')
    contact=Image.new('RGB',(len(thumbs)*260,350),'#eee9df'); draw=ImageDraw.Draw(contact)
    for i,(name,pic) in enumerate(thumbs):
        contact.paste(pic,(i*260+(260-pic.width)//2,15)); draw.text((i*260+8,320),name,fill='black')
    contact.save(OUT/'source-thumbnails.jpg')
    (OUT/'manifest.json').write_text(json.dumps({'candidates':records,'fitStatus':'No target rig rebinding or runtime/browser fit test performed. See README.md.'},indent=2))
if __name__=='__main__': main()
