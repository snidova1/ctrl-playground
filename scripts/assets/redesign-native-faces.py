"""Create reversible soft-anime face derivatives from the native authored rigs.
Original assets are never overwritten. Same topology, skins, UVs and expression names.
Every positional morph is carried through the same deformation (not discarded).
"""
import json,struct,hashlib
from pathlib import Path
from io import BytesIO
import numpy as np
from PIL import Image,ImageDraw,ImageFilter
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'test-results/face-redesign'
PARAMS={
 'drophunter':dict(cx=0.,eye_y=1.373,eye_x=.039,eye_z=.078,nose_y=1.34,nose_reduce=.007,jaw_y=1.342,jaw_compress=.17,iris_width=1.5,brow_y=1.394,cheek_y=1.325),
 'neurohacker':dict(cx=.001814,eye_y=1.464,eye_x=.039,eye_z=.054,nose_y=1.427,nose_reduce=.010,jaw_y=1.440,jaw_compress=.19,iris_width=1.65,brow_y=1.479,cheek_y=1.418),
}
DT={5126:'<f4',5123:'<u2',5125:'<u4',5121:'u1'}
DIM={'VEC2':2,'VEC3':3,'VEC4':4,'SCALAR':1,'MAT4':16}
def unpack(data):
 n=struct.unpack_from('<I',data,12)[0];return json.loads(data[20:20+n]),bytearray(data[28+n:])
def array(g,b,i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];dt=np.dtype(DT[a['componentType']]);dim=DIM[a['type']]
 return np.ndarray((a['count'],dim),dtype=dt,buffer=b,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',dt.itemsize*dim),dt.itemsize))
def components(count,indices):
 parent=list(range(count))
 def find(a):
  while parent[a]!=a:parent[a]=parent[parent[a]];a=parent[a]
  return a
 for a,c,d in indices.reshape(-1,3):parent[find(int(c))]=find(int(a));parent[find(int(d))]=find(int(a))
 groups={}
 for i in range(count):groups.setdefault(find(i),[]).append(i)
 return list(groups.values())
def field(v,p):
 q=v.copy();x=v[:,0]-p['cx'];y=v[:,1];z=v[:,2]
 front=np.clip((z+.005)/.045,0,1)
 # Shorter lower face and fuller cheeks; skull, neck and hair anchor stay unchanged.
 lower=np.maximum(0,p['jaw_y']-y)*np.exp(-((y-(p['jaw_y']-.035))/.075)**4)*front
 q[:,1]+=lower*p['jaw_compress']
 cheek=np.exp(-((y-p['cheek_y'])/.035)**2)*front
 q[:,0]+=x*.055*cheek
 # Smaller, less protruding nose, instead of a hard triangular profile.
 nose=np.exp(-(x/.018)**2-((y-p['nose_y'])/.021)**2)*front
 q[:,2]-=p['nose_reduce']*nose
 # Rounder eye opening and lower the upswept outer-corner angle.
 eye=np.exp(-((np.abs(x)-p['eye_x'])/.029)**4-((y-p['eye_y'])/.025)**4)*front
 q[:,0]-=np.sign(x)*.25*np.maximum(0,np.abs(x)-.052)*eye
 q[:,1]+=(y-p['eye_y'])*.17*eye-.002*(np.abs(x)-p['eye_x'])/.027*eye
 # Lift the center of the pointed chin, while retaining the original jaw topology.
 chin=p['jaw_y']-.068
 q[:,1]+=.008*np.exp(-(x/.039)**2-((y-chin)/.026)**2)*front
 # Subtle neutral upturned mouth corners, not a forced emote.
 mouth=np.exp(-(x/.025)**4-((y-(p['jaw_y']-.030))/.012)**2)*front
 q[:,1]+=.0015*(np.abs(x)/.025)**2*mouth
 return q

def eye_texture(image,fam):
 a=np.asarray(image.convert('RGBA')).copy();rgb=a[:,:,:3].astype(float)/255
 mx=rgb.max(2);mn=rgb.min(2);green=(rgb[:,:,1]>rgb[:,:,0]*1.15)&(rgb[:,:,2]>rgb[:,:,0]*1.08)&((mx-mn)>.10)
 # Keep whites distinct from warm eyebrow/lash islands: no hollow pale brows.
 warm=(rgb[:,:,0]>rgb[:,:,1]*1.04)&(rgb[:,:,1]>rgb[:,:,2]*1.03)&(mx<.75)
 rgb[warm]=rgb[warm]*.25+np.array([.19,.13,.135])
 gray=((mx-mn)<.08)&(mx>.38)&(mx<.9)&(rgb[:,:,2]>=rgb[:,:,0]*.95)&~green&~warm
 rgb[gray]=rgb[gray]*.48+.49
 rgb[green]=np.array([.15,.18,.28])
 yy,xx=np.mgrid[:a.shape[0],:a.shape[1]]
 # Each original UV iris island is repainted, not overlaid as a face sticker.
 islands=[(261,320,166,222,261,295,55,74),(702,300,166,222,702,275,55,74)]if fam=='drophunter' else[(777,217,119,95,777,213,39,30),(911,755,112,185,911,752,35,62)]
 for cx,cy,rx,ry,px,py,prx,pry in islands:
  u=(xx-cx)/rx;v=(yy-cy)/ry;r=np.sqrt(u*u+v*v);inside=r<1
  t=np.clip((yy-(cy-ry))/(2*ry),0,1);top=np.array([.12,.14,.23]);bottom=np.array([.66,.72,.87]);iris=top+(bottom-top)*t[:,:,None]
  rim=1-.48*np.clip((r-.82)/.18,0,1);iris*=rim[:,:,None]
  theta=np.arctan2(v,u);veins=1+.035*np.sin(theta*34+r*8)*(r>.35);iris*=veins[:,:,None]
  pupil=np.sqrt(((xx-px)/prx)**2+((yy-py)/pry)**2);blend=np.clip((pupil-.94)/.09,0,1)[:,:,None];iris=iris*blend+np.array([.055,.065,.11])*(1-blend)
  for hx,hy,hrx,hry,strength in [(px-prx*.45,py-pry*.55,prx*.37,pry*.27,1),(px+prx*.8,py+pry*.85,prx*.20,pry*.14,.8)]:
   h=np.clip((1-np.sqrt(((xx-hx)/hrx)**2+((yy-hy)/hry)**2))*10,0,1)[:,:,None]*strength;iris=iris*(1-h)+np.array([1,1,1])*h
  rgb[inside]=iris[inside]
 a[:,:,:3]=np.clip(rgb*255,0,255).astype('uint8')
 return Image.fromarray(a)
def skin_texture(image,fam):
 im=image.convert('RGBA');a=np.asarray(im).copy();h,w=a.shape[:2]
 # Paint out the harsh triangular nose/nostril in the original UV island.
 yy,xx=np.mgrid[:h,:w];nx,ny=(509,432)if fam=='drophunter'else(521,482)
 mask=np.clip((1-((xx-nx)/19)**2-((yy-ny)/31)**2)*2.2,0,1)[:,:,None]
 skin=a[ny,nx-37,:3].astype(float)
 a[:,:,:3]=np.clip(a[:,:,:3]*(1-mask)+skin*mask,0,255).astype('uint8');im=Image.fromarray(a)
 blush=Image.new('RGBA',im.size);d=ImageDraw.Draw(blush)
 for x,y in ([(350,427),(665,427)]if fam=='drophunter'else[(432,513),(605,513)]):d.ellipse((x-39,y-15,x+39,y+15),fill=(238,141,151,32))
 blush=blush.filter(ImageFilter.GaussianBlur(12));return Image.alpha_composite(im,blush)
def normals(v,idx):
 tri=idx.reshape(-1,3);n=np.zeros_like(v);f=np.cross(v[tri[:,1]]-v[tri[:,0]],v[tri[:,2]]-v[tri[:,0]])
 for j in range(3):np.add.at(n,tri[:,j],f)
 length=np.linalg.norm(n,axis=1,keepdims=True);return n/np.maximum(length,1e-12)
def materialize(g,b):
 for a in g['accessors']:
  if 'bufferView'in a and 'sparse'not in a:continue
  dt=np.dtype(DT[a['componentType']]);dim=DIM[a['type']]
  values=np.zeros((a['count'],dim),dtype=dt)
  if 'bufferView'in a:
   v=g['bufferViews'][a['bufferView']];values[:]=np.ndarray(values.shape,dtype=dt,buffer=b,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',dt.itemsize*dim),dt.itemsize))
  if 'sparse'in a:
   s=a['sparse'];iv=g['bufferViews'][s['indices']['bufferView']];vv=g['bufferViews'][s['values']['bufferView']]
   ids=np.frombuffer(b,dtype=DT[s['indices']['componentType']],count=s['count'],offset=iv.get('byteOffset',0)+s['indices'].get('byteOffset',0)).copy()
   vals=np.frombuffer(b,dtype=dt,count=s['count']*dim,offset=vv.get('byteOffset',0)+s['values'].get('byteOffset',0)).reshape(-1,dim).copy();values[ids]=vals
  b.extend(b'\0'*(-len(b)%4));start=len(b);b.extend(values.tobytes());a['bufferView']=len(g['bufferViews']);a['byteOffset']=0;a.pop('sparse',None);g['bufferViews'].append({'buffer':0,'byteOffset':start,'byteLength':values.nbytes})
def prepare(data,fam,slot):
 g,b=unpack(data);materialize(g,b);p=PARAMS[fam];done=set();metrics=[]
 for mesh in g['meshes']:
  if slot=='body'and not('head'in mesh.get('name','').lower()):continue
  for pr in mesh['primitives']:
   ai=pr['attributes']['POSITION']
   if ai in done:continue
   done.add(ai);base=array(g,b,ai).copy();idx=array(g,b,pr['indices']).ravel().astype(int)
   delta=np.zeros_like(base);iris=np.zeros(len(base),dtype=bool)
   if slot=='eyes':
    for ids in components(len(base),idx):
     pts=base[ids];x=np.abs(pts[:,0]-p['cx'])
     if len(ids)>10 and pts[:,1].min()>p['brow_y']:
      slope=np.polyfit(x,pts[:,1],1)[0];delta[ids,1]-=.8*slope*(x-x.mean())
     # Iris planes: small centered eye components, not the outer lashes.
     if len(ids)>=15 and np.ptp(pts[:,0])<.028 and abs(pts[:,0].mean()-p['cx'])<.055 and abs(pts[:,1].mean()-p['eye_y'])<.009 and pts[:,2].mean()<p['eye_z']+.009:iris[ids]=True
   def deform(v):
    q=field(v,p)+delta
    for sign in [-1,1]:
     m=iris&((base[:,0]-p['cx'])*sign>0)
     if m.any():
      center=base[m,0].mean();old_x=q[m,0]-center;new_x=old_x*p['iris_width'];q[m,0]=center+new_x
      q[m,2]-=(new_x*new_x-old_x*old_x)/.07
    return q
   result=deform(base);array(g,b,ai)[:]=result
   a=g['accessors'][ai];a['min']=result.min(0).tolist();a['max']=result.max(0).tolist()
   ni=pr['attributes'].get('NORMAL');base_normals=array(g,b,ni).copy()if ni is not None else normals(base,idx)
   def carry_normals(v,n):
    columns=[]
    for axis in range(3):
     offset=np.zeros_like(v);offset[:,axis]=.0001
     columns.append((deform(v+offset)-deform(v-offset))/.0002)
    jacobian=np.stack(columns,axis=2)
    transformed=np.linalg.solve(np.swapaxes(jacobian,1,2),n[:,:,None])[:,:,0]
    return transformed/np.maximum(np.linalg.norm(transformed,axis=1,keepdims=True),1e-12)
   new_normals=carry_normals(base,base_normals)
   if ni is not None:array(g,b,ni)[:]=new_normals
   for target in pr.get('targets',[]):
    if 'POSITION'not in target:continue
    td=array(g,b,target['POSITION']).copy();morphed=deform(base+td);nd=morphed-result
    array(g,b,target['POSITION'])[:]=nd
    ta=g['accessors'][target['POSITION']];ta['min']=nd.min(0).tolist();ta['max']=nd.max(0).tolist()
    if 'NORMAL'in target:
     old_delta_normals=array(g,b,target['NORMAL']).copy();array(g,b,target['NORMAL'])[:]=carry_normals(base+td,base_normals+old_delta_normals)-new_normals
   metrics.append({'mesh':mesh.get('name'),'vertices':len(base),'morphs':len(pr.get('targets',[])),'maxDisplacement':float(np.linalg.norm(result-base,axis=1).max()),'irisVertices':int(iris.sum())})
 replacements={}
 image_ids=set()
 for mat in g['materials']:
  name=mat.get('name','').lower()
  wanted=slot=='eyes'or(slot=='body'and name in ['face','head'])
  if wanted:
   tex=mat.get('pbrMetallicRoughness',{}).get('baseColorTexture')
   if tex:image_ids.add(g['textures'][tex['index']]['source'])
 for i in image_ids:
  img=g['images'][i];bv=g['bufferViews'][img['bufferView']];original=Image.open(BytesIO(b[bv.get('byteOffset',0):bv.get('byteOffset',0)+bv['byteLength']]))
  new=eye_texture(original,fam)if slot=='eyes'else skin_texture(original,fam)
  # Parameters are authored in 1024-space; resize skin operation for low via high separately.
  o=BytesIO();new.save(o,format='PNG',optimize=True);replacements[img['bufferView']]=o.getvalue();img['mimeType']='image/png'
 rebuilt=bytearray()
 for i,v in enumerate(g['bufferViews']):
  rebuilt.extend(b'\0'*(-len(rebuilt)%4));start=v.get('byteOffset',0);chunk=replacements.get(i,b[start:start+v['byteLength']]);v.update(byteOffset=len(rebuilt),byteLength=len(chunk),buffer=0);rebuilt.extend(chunk)
 rebuilt.extend(b'\0'*(-len(rebuilt)%4));g['buffers'][0]['byteLength']=len(rebuilt)
 g.setdefault('extras',{})['ctrlFaceDesign']={'version':1,'style':'soft-anime','originalSourceSha256':hashlib.sha256(data).hexdigest(),'preserves':['rig','skin weights','topology','UV','expression names','wardrobe family']}
 enc=json.dumps(g,separators=(',',':'),ensure_ascii=False).encode();enc+=b' '*(-len(enc)%4)
 return struct.pack('<4sII',b'glTF',2,28+len(enc)+len(rebuilt))+struct.pack('<I4s',len(enc),b'JSON')+enc+struct.pack('<I4s',len(rebuilt),b'BIN\0')+rebuilt,metrics

def main():
 from importlib.util import spec_from_file_location,module_from_spec
 spec=spec_from_file_location('prep',ROOT/'scripts/assets/prepare-modular-runtime.py');prep=module_from_spec(spec);spec.loader.exec_module(prep)
 report=[]
 for fam in PARAMS:
  for slot in ['body','eyes']:
   stem=fam if slot=='body'else'regulareyes';source=ROOT/'public/plaza/characters/modular'/fam/slot/f'{stem}.vrm';data,metrics=prepare(source.read_bytes(),fam,slot)
   for quality,limit in [('high',1024),('low',512)]:
    result=prep.prepare(data,limit);name=f'{stem}-soft-anime'+('-mobile'if quality=='low'else'')+'.vrm';dest=source.with_name(name);dest.write_bytes(result)
    report.append({'family':fam,'slot':slot,'quality':quality,'url':'/'+str(dest.relative_to(ROOT/'public')),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sha256':hashlib.sha256(result).hexdigest(),'bytes':len(result),'geometry':metrics})
    print('PREPARED_FACE',fam,slot,quality,len(result),metrics,flush=True)
 OUT.mkdir(parents=True,exist_ok=True);(OUT/'face-derivatives.json').write_text(json.dumps(report,indent=2))
if __name__=='__main__':main()
