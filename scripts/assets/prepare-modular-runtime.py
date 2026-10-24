"""Prepare the downloaded common-rig bank for CTRL; retain geometry/rig/meta.
High images max1024, low max512. Original sources remain unchanged.
"""
import json,struct,hashlib
from pathlib import Path
from io import BytesIO
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
BANK=Path('/tmp/ctrl-modular-smoke')
OUT=ROOT/'public/plaza/characters/modular'

def prepare(data,limit):
 n=struct.unpack_from('<I',data,12)[0];g=json.loads(data[20:20+n]);binary=data[28+n:];replacements={}
 assert all('uri' not in x for x in g.get('buffers',[])+g.get('images',[]))
 for image in g.get('images',[]):
  i=image['bufferView'];v=g['bufferViews'][i];start=v.get('byteOffset',0);picture=Image.open(BytesIO(binary[start:start+v['byteLength']]))
  if max(picture.size)>limit:
   picture.thumbnail((limit,limit),Image.Resampling.LANCZOS);output=BytesIO();picture.save(output,format='PNG',optimize=True);replacements[i]=output.getvalue();image['mimeType']='image/png'
 if not replacements:return data
 rebuilt=bytearray()
 for i,v in enumerate(g['bufferViews']):
  rebuilt.extend(b'\0'*(-len(rebuilt)%4));start=v.get('byteOffset',0);chunk=replacements.get(i,binary[start:start+v['byteLength']]);v.update(byteOffset=len(rebuilt),byteLength=len(chunk),buffer=0);rebuilt.extend(chunk)
 rebuilt.extend(b'\0'*(-len(rebuilt)%4));g['buffers'][0]['byteLength']=len(rebuilt);encoded=json.dumps(g,separators=(',',':'),ensure_ascii=False).encode();encoded+=b' '*(-len(encoded)%4)
 return struct.pack('<4sII',b'glTF',2,28+len(encoded)+len(rebuilt))+struct.pack('<I4s',len(encoded),b'JSON')+encoded+struct.pack('<I4s',len(rebuilt),b'BIN\0')+rebuilt

def main():
 source=json.loads((BANK/'manifest.json').read_text());entries=[]
 for e in source['entries']:
  relative=Path(e['url'].removeprefix('/assets/'));data=(BANK/'assets'/relative).read_bytes();assets={};checks={}
  for quality,limit in [('high',1024),('low',512)]:
   path=OUT/relative
   if quality=='low':path=path.with_name(path.stem+'-mobile.vrm')
   path.parent.mkdir(parents=True,exist_ok=True);prepared=prepare(data,limit);path.write_bytes(prepared);assets[quality]='/'+str(path.relative_to(ROOT/'public'));checks[quality]={'bytes':len(prepared),'sha256':hashlib.sha256(prepared).hexdigest()}
  slot={'head':'hair','chest':'top','legs':'bottom','accessories':'accessory'}.get(e['slot'],e['slot'])
  slot='shoes' if slot=='feet' else slot
  entries.append({'family':e['family'],'slot':slot,'id':e['id'],'name':e['id'].replace('_',' ').replace('-',' ').title(),'assets':assets})
  print('PREPARED',relative,checks['high']['bytes'],checks['low']['bytes'],flush=True)
 (ROOT/'features/plaza/characters/modular-parts.json').write_text(json.dumps(entries,indent=2)+'\n')
 (OUT/'provenance.json').write_text(json.dumps({'source':source['source'],'revision':source['revision'],'preparation':'Only embedded image resizing; source geometry, skins, expressions, licensing metadata and native part coordinates retained.','entries':entries},indent=2)+'\n')
 print('MODULAR_RUNTIME_READY',len(entries),flush=True)
if __name__=='__main__':main()
