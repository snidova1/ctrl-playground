"""Download public CharacterStudio sample part bank; no installers or app changes.
Source metadata is preserved in the VRMs. Run from the CTRL repo root.
"""
import concurrent.futures,hashlib,json,socket,time,urllib.request
socket.setdefaulttimeout(30)
from pathlib import Path
ROOT=Path('/tmp/ctrl-modular-smoke')
API='https://api.github.com/repos/memelotsqui/character-assets/git/trees/main?recursive=1'
def fetch():
 tree=json.load(urllib.request.urlopen(API,timeout=25));sha=tree['sha']
 rows=[x for x in tree['tree'] if x['path'].endswith('.vrm') and '/_textureCollections/' not in x['path']]
 def one(x):
  p=x['path'];dest=ROOT/'assets'/p;dest.parent.mkdir(parents=True,exist_ok=True)
  if not dest.exists() or dest.stat().st_size!=x['size']:
   for attempt in range(3):
    try:
     urllib.request.urlretrieve(f'https://raw.githubusercontent.com/memelotsqui/character-assets/{sha}/{p}',dest)
     break
    except Exception:
     if attempt==2:raise
     time.sleep(attempt+1)
  b=dest.read_bytes();assert b[:4]==b'glTF',p
  name,slot,file=p.split('/');slot={'foot':'feet'}.get(slot,slot)
  return {'family':name,'slot':slot,'id':Path(file).stem,'url':'/assets/'+p,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:entries=list(pool.map(one,rows))
 report={'source':'https://github.com/memelotsqui/character-assets','revision':sha,'entries':entries}
 (ROOT/'manifest.json').write_text(json.dumps(report,indent=2))
 from collections import Counter
 print('BANK_DOWNLOAD_OK',len(entries),'files',sum(x['bytes'] for x in entries),'bytes',dict(Counter((x['family'],x['slot']) for x in entries)),flush=True)
 return report
if __name__=='__main__':fetch()
