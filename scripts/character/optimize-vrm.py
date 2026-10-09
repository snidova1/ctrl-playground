"""Lossless scene/VRM preservation; resize embedded textures for web profiles."""
import argparse,struct,json,io,hashlib
from pathlib import Path
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('output',type=Path);p.add_argument('--texture-size',type=int,default=1024);a=p.parse_args()
d=a.source.read_bytes();n=struct.unpack('<I',d[12:16])[0];j=json.loads(d[20:20+n]);binary=d[28+n:]
image_views={image['bufferView'] for image in j.get('images',[]) if 'bufferView' in image}
rebuilt=bytearray()
for i,v in enumerate(j['bufferViews']):
    content=binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
    if i in image_views:
        im=Image.open(io.BytesIO(content));im.thumbnail((a.texture_size,a.texture_size),Image.Resampling.LANCZOS);out=io.BytesIO();im.save(out,format='PNG',optimize=True);content=out.getvalue()
    while len(rebuilt)%4:rebuilt.append(0)
    v['byteOffset']=len(rebuilt);v['byteLength']=len(content);rebuilt.extend(content)
for im in j.get('images',[]):im['mimeType']='image/png'
while len(rebuilt)%4:rebuilt.append(0)
j['buffers'][0]['byteLength']=len(rebuilt)
js=json.dumps(j,separators=(',',':')).encode();js+=b' '*((-len(js))%4)
data=struct.pack('<III',0x46546c67,2,28+len(js)+len(rebuilt))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(rebuilt),0x004e4942)+rebuilt
a.output.parent.mkdir(exist_ok=True,parents=True);a.output.write_bytes(data)
print(json.dumps({'output':str(a.output),'bytes':len(data),'source_sha256':hashlib.sha256(d).hexdigest(),'sha256':hashlib.sha256(data).hexdigest(),'texture_limit':a.texture_size}))
