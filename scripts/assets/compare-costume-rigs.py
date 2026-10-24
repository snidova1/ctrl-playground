"""Compare active weighted joint rest binds against accepted CTRL avatars."""
import importlib.util,json
from pathlib import Path
import numpy as np
s=importlib.util.spec_from_file_location('p',Path(__file__).with_name('prepare-cc0-costumes.py')); assert s and s.loader
m=importlib.util.module_from_spec(s); s.loader.exec_module(m)

def joints(d,b):
    result={}
    for skin in d['skins']:
        binds=m.accessor(d,b,skin['inverseBindMatrices'])
        for ni,bind in zip(skin['joints'],binds): result[d['nodes'][ni]['name']]=bind
    return result

out=[]
for name in m.NAMES:
    d,b,_=m.parse(m.CACHE/(name+'.vrm')); sj=joints(d,b)
    for kind in ['costume','hair']:
        cd,cb,_=m.parse(m.OUT/name/(kind+'.glb')); used=set()
        for n in cd['nodes']:
            if 'mesh' not in n: continue
            sk=cd['skins'][n['skin']]
            for p in cd['meshes'][n['mesh']]['primitives']:
                ji=m.accessor(cd,cb,p['attributes']['JOINTS_0']); w=m.accessor(cd,cb,p['attributes']['WEIGHTS_0'])
                used.update(cd['nodes'][sk['joints'][int(x)]]['name'] for x in ji[w>0])
        for target in ['female','female-studio','male']:
            td,tb,_=m.parse(m.ROOT/'public/plaza/characters/anime'/(target+'.vrm')); tj=joints(td,tb)
            missing=sorted(used-tj.keys()); shared=sorted(used & tj.keys())
            mismatch=[{'bone':k,'maxInverseBindDelta':float(np.max(np.abs(sj[k]-tj[k])))} for k in shared if not np.allclose(sj[k],tj[k],atol=1e-4)]
            out.append({'source':name,'kind':kind,'target':target,'weightedJointCount':len(used),'missingWeightedBones':missing,'mismatchedRestBinds':mismatch,'dropInCompatible':not missing and not mismatch,'note':'Name matching alone is NOT rebinding. VRM0 -> VRM1 axis/normalization also requires explicit handling.'})
            if target=='female-studio': print(name,kind,'female-studio:',len(missing),'missing bones;',len(mismatch),'rest-bind differences')
(m.OUT/'rig-compatibility.json').write_text(json.dumps(out,indent=2))
