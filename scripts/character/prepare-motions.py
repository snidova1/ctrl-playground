"""Extract only skeleton + required CC0 animation tracks, no mannequin meshes."""
import json,struct,argparse
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('output',type=Path);a=p.parse_args()
d=a.source.read_bytes();n=struct.unpack('<I',d[12:16])[0];j=json.loads(d[20:20+n]);bin=d[28+n:]
keep={'Idle_Loop':'Idle','Walk_Loop':'Walk','Jog_Fwd_Loop':'Run','Jump_Start':'JumpStart','Jump_Loop':'JumpLoop','Jump_Land':'Land','Sitting_Enter':'SitDown','Sitting_Idle_Loop':'Seated','Interact':'Interact','Dance_Loop':'Victory'}
clips=[];used=set()
for anim in j['animations']:
    if anim['name'] not in keep:continue
    anim['name']=keep[anim['name']];clips.append(anim)
    for sampler in anim['samplers']:used.update([sampler['input'],sampler['output']])
accessors=[];views=[];binary=bytearray();mapping={}
for index in sorted(used):
    accessor=j['accessors'][index].copy();view=j['bufferViews'][accessor['bufferView']].copy()
    while len(binary)%4:binary.append(0)
    chunk=bin[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']];view['byteOffset']=len(binary);view['buffer']=0;binary.extend(chunk)
    accessor['bufferView']=len(views);views.append(view);mapping[index]=len(accessors);accessors.append(accessor)
for clip in clips:
    for s in clip['samplers']:s['input']=mapping[s['input']];s['output']=mapping[s['output']]
for node in j['nodes']:node.pop('mesh',None);node.pop('skin',None)
for key in ['meshes','skins','images','textures','samplers','materials','extensionsUsed','extensionsRequired']:j.pop(key,None)
j.update(animations=clips,accessors=accessors,bufferViews=views,buffers=[{'byteLength':len(binary)}])
while len(binary)%4:binary.append(0)
js=json.dumps(j,separators=(',',':')).encode();js+=b' '*((-len(js))%4)
a.output.write_bytes(struct.pack('<III',0x46546c67,2,28+len(js)+len(binary))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(binary),0x004e4942)+binary)
print({'clips':[c['name'] for c in clips],'bytes':a.output.stat().st_size})
