"""Offline artifact inspection: equivalent influence cleanup + textured CPU preview.
Does not alter original source-rig .vrm derivatives. No browser, app build or rig transfer.
"""
import importlib.util, json, struct, copy
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from io import BytesIO
s=importlib.util.spec_from_file_location('prep',Path(__file__).with_name('prepare-cc0-costumes.py'))
assert s is not None and s.loader is not None
m=importlib.util.module_from_spec(s); s.loader.exec_module(m)

def add(d,b,array,typ,component):
    while len(b)%4: b.append(0)
    view=len(d['bufferViews']); raw=array.tobytes(); d['bufferViews'].append({'buffer':0,'byteOffset':len(b),'byteLength':len(raw)}); b.extend(raw)
    a={'bufferView':view,'componentType':component,'count':len(array),'type':typ}
    if typ=='VEC3': a.update(min=array.min(axis=0).tolist(),max=array.max(axis=0).tolist())
    d['accessors'].append(a); return len(d['accessors'])-1

def clean(path):
    d,b,_=m.parse(path); binary=bytearray(b); changed=0
    active={n['mesh'] for n in d['nodes'] if 'mesh' in n}
    for mi in active:
        for p in d['meshes'][mi]['primitives']:
            ix=m.accessor(d,b,p['indices']).ravel().astype(int); used,inv=np.unique(ix,return_inverse=True)
            arrays={k:m.accessor(d,b,a)[used] for k,a in p['attributes'].items()}
            j,w=arrays['JOINTS_0'],arrays['WEIGHTS_0']; oldw=w.copy(); oldj=j.copy()
            for v in range(len(j)):
                combined={}
                for ji,wi in zip(j[v],w[v]):
                    if wi>0: combined[int(ji)]=combined.get(int(ji),0)+float(wi)
                items=list(combined.items()); total=sum(x[1] for x in items); assert total>0
                j[v]=[x[0] for x in items]+[0]*(4-len(items))
                w[v]=[x[1]/total for x in items]+[0]*(4-len(items))
            changed+=int(np.count_nonzero(np.any(j!=oldj,axis=1)|np.any(w!=oldw,axis=1)))
            for k,a in list(p['attributes'].items()):
                old=d['accessors'][a]; p['attributes'][k]=add(d,binary,arrays[k],old['type'],old['componentType'])
            p['indices']=add(d,binary,inv.astype('<u4').reshape(-1,1),'SCALAR',5125)
            for target in p.get('targets',[]):
                for key,a in list(target.items()):
                    old=d['accessors'][a]; target[key]=add(d,binary,m.accessor(d,b,a)[used],old['type'],old['componentType'])
    d['buffers'][0]['byteLength']=len(binary)
    d['extras']['ctrlCandidate']['sanitization']='Referenced vertices compacted without moving positions/UVs/normals; duplicate joint influences merged and float weights normalized. Original .vrm remains byte-exact in geometry/skin data. All rest binds/skeleton/materials/images unchanged.'
    out=path.with_suffix('.glb'); out.write_bytes(m.encode(d,bytes(binary)))
    return {'path':str(out),'influenceRowsSanitized':changed}

def preview(path):
    d,b,_=m.parse(path); W,H=480,640; pixels=np.full((H,W,3),237,dtype=np.uint8); depth=np.full((H,W),np.inf)
    active={n['mesh'] for n in d['nodes'] if 'mesh' in n}
    allpos=[]
    for mi in active:
        for p in d['meshes'][mi]['primitives']:
            ix=m.accessor(d,b,p['indices']).ravel().astype(int); allpos.append(m.accessor(d,b,p['attributes']['POSITION'])[ix])
    lo=np.concatenate(allpos).min(axis=0); hi=np.concatenate(allpos).max(axis=0); scale=min((W-35)/(hi[0]-lo[0]),(H-60)/(hi[1]-lo[1]))
    for mi in active:
        for p in d['meshes'][mi]['primitives']:
            pos=m.accessor(d,b,p['attributes']['POSITION']); uv=m.accessor(d,b,p['attributes']['TEXCOORD_0']); ix=m.accessor(d,b,p['indices']).reshape(-1,3).astype(int)
            mat=d['materials'][p['material']]; tx=mat.get('pbrMetallicRoughness',{}).get('baseColorTexture',{}).get('index')
            if tx is None: continue
            tex=np.asarray(Image.open(BytesIO(m.image_bytes(d,b,tx))).convert('RGBA')); th,tw=tex.shape[:2]
            screen=np.stack(((pos[:,0]-(lo[0]+hi[0])/2)*scale+W/2,H-30-(pos[:,1]-lo[1])*scale),axis=1)
            for tri in ix:
                pts=screen[tri]; x0,y0=np.maximum(np.floor(pts.min(axis=0)),0).astype(int); x1,y1=np.minimum(np.ceil(pts.max(axis=0)),[W-1,H-1]).astype(int)
                if x1<x0 or y1<y0: continue
                a,c,e=pts; den=(c[1]-e[1])*(a[0]-e[0])+(e[0]-c[0])*(a[1]-e[1])
                if abs(den)<1e-9: continue
                yy,xx=np.mgrid[y0:y1+1,x0:x1+1]; xx=xx+.5; yy=yy+.5
                u=((c[1]-e[1])*(xx-e[0])+(e[0]-c[0])*(yy-e[1]))/den; v=((e[1]-a[1])*(xx-e[0])+(a[0]-e[0])*(yy-e[1]))/den; w=1-u-v
                z=u*pos[tri[0],2]+v*pos[tri[1],2]+w*pos[tri[2],2]
                q=u[...,None]*uv[tri[0]]+v[...,None]*uv[tri[1]]+w[...,None]*uv[tri[2]]
                colors=tex[np.clip((q[...,1]*th).astype(int),0,th-1),np.clip((q[...,0]*tw).astype(int),0,tw-1)]
                mask=(u>=0)&(v>=0)&(w>=0)&(z<depth[y0:y1+1,x0:x1+1])&(colors[...,3]>100)
                pixels[y0:y1+1,x0:x1+1][mask]=colors[...,:3][mask]; depth[y0:y1+1,x0:x1+1][mask]=z[mask]
    im=Image.fromarray(pixels); im.save(path.with_name(path.stem+'-geometry.png')); return im

if __name__=='__main__':
    checks=[]; sheet=Image.new('RGB',(480*5,640),'white')
    for i,name in enumerate(m.NAMES):
        for kind in ['costume','hair']: checks.append(clean(m.OUT/name/(kind+'.vrm')))
        im=preview(m.OUT/name/'costume.glb'); sheet.paste(im,(480*i,0)); ImageDraw.Draw(sheet).text((480*i+10,10),name,fill='black')
        preview(m.OUT/name/'hair.glb')
        print(name,'sanitized + textured geometry previews')
    sheet.save(m.OUT/'costume-geometry-contact.jpg'); (m.OUT/'sanitization.json').write_text(json.dumps(checks,indent=2))
